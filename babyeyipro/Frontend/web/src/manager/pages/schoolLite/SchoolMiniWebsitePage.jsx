// SchoolMiniWebsitePage.jsx — v6.1
// ================================================================
//  CHANGE in v6.1:
//  ✅ ApplicantsPanel now uses ApplicantDetailModal (full answers +
//     documents + status + notes) instead of the inline modal.
// ================================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Globe, Loader2, AlertCircle, RefreshCw, ExternalLink,
  CheckCircle, Clock, Eye, Sparkles, Zap, LayoutTemplate,
  ArrowRight, ChevronLeft, ChevronRight, X, Menu, MapPin,
  Phone, Mail, Share2, Check, Download,
  Target, Lightbulb, Award, Camera, Calendar, FileText,
  CheckCircle2, Users, ZoomIn, Quote, GraduationCap, Receipt,
  Layers, Image as ImageIcon, Settings, Send,
  Search, TrendingUp, Inbox, User, Trash2, Banknote
} from "lucide-react";
import MiniWebsiteApp from "./SchoolManager_Connected";
import ApplicantDetailModal from "./ApplicantDetailModal";
import { SERVER_BASE } from '../../lib/schoolLiteApi';

// ─── CONFIG ──────────────────────────────────────────────────────
const SERVER        = SERVER_BASE;
const API           = `${SERVER}/api/mini-websites`;
const ADMISSION_API = `${SERVER}/api/admissions`;

// ─── HELPERS ─────────────────────────────────────────────────────
function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith("http") || p.startsWith("blob:")) return p;
  let norm = p.replace(/\\/g, "/");
  const idx = norm.replace(/^\//, "").indexOf("uploads/");
  if (idx !== -1) norm = "/" + norm.replace(/^\//, "").slice(idx);
  return `${SERVER}${norm.startsWith("/") ? norm : "/" + norm}`;
}

// ─── THEMES ──────────────────────────────────────────────────────
const THEMES = {
  blue:    { p: "#1D4ED8", s: "#EFF6FF", a: "#FBBF24", dark: "#1e3a5f" },
  green:   { p: "#059669", s: "#F0FDF4", a: "#FBBF24", dark: "#064e3b" },
  maroon:  { p: "#881337", s: "#FFF1F2", a: "#D97706", dark: "#4c0519" },
  teal:    { p: "#0F766E", s: "#F0FDFA", a: "#F59E0B", dark: "#134e4a" },
  purple:  { p: "#6D28D9", s: "#F5F3FF", a: "#F59E0B", dark: "#3b0764" },
  dark:    { p: "#111827", s: "#F9FAFB", a: "#FBBF24", dark: "#111827" },
  navy:    { p: "#1E3A5F", s: "#EFF6FF", a: "#F97316", dark: "#1e3a5f" },
  crimson: { p: "#DC2626", s: "#FEF2F2", a: "#FCD34D", dark: "#7f1d1d" },
  orange:  { p: "#EA580C", s: "#FFF7ED", a: "#FBBF24", dark: "#7c2d12" },
  slate:   { p: "#475569", s: "#F8FAFC", a: "#06B6D4", dark: "#1e293b" },
  pink:    { p: "#DB2777", s: "#FDF2F8", a: "#FBBF24", dark: "#831843" },
  indigo:  { p: "#3730A3", s: "#EEF2FF", a: "#F59E0B", dark: "#1e1b4b" },
  custom:  { p: "#1A1A1A", s: "#FFFFFF", a: "#FEBF10", dark: "#1A1A1A" },
};

const FEE_LEVELS = [
  { id: "nursery", label: "Nursery/Pre-Primary", emoji: "🌱" },
  { id: "primary", label: "Primary School",      emoji: "📚" },
  { id: "olevel",  label: "O-Level (S1–S3)",      emoji: "🎒" },
  { id: "alevel",  label: "A-Level (S4–S6)",      emoji: "🎓" },
  { id: "tvet",    label: "TVET",                 emoji: "🔧" },
];
const formatProgramLabel = (raw) => String(raw || '')
  .replace(/^custom:/i, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join(' ');

// ═══════════════════════════════════════════════════════════════
//  STATUS BADGE
// ═══════════════════════════════════════════════════════════════
function StatusBadge({ status }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
        <Clock size={10} />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-400 border border-slate-600">
      <Globe size={10} />
      No website yet
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FULL MINI-SITE VIEWER (embedded — no external route needed)
// ═══════════════════════════════════════════════════════════════

function SectionHead({ eyebrow, title, theme, light = false }) {
  const { a } = theme;
  return (
    <div className="text-center mb-10 sm:mb-14">
      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: a }}>
        <span className="w-8 h-px block" style={{ background: a }} />
        {eyebrow}
        <span className="w-8 h-px block" style={{ background: a }} />
      </div>
      <h2 className="text-3xl sm:text-4xl font-semibold leading-tight" style={{ color: light ? "#fff" : "#0f172a" }}>
        {title}
      </h2>
    </div>
  );
}

// ── NavBar ───────────────────────────────────────────────────
function SiteNavBar({ school, theme, active, onNav, menuOpen, setMenuOpen, onEdit }) {
  const { p, a } = theme;
  const nm = school.name || "School";
  const logoSrc = imgUrl(school.logoPreview);
  const navItems = [
    { id: "about", label: "About" },
    { id: "programs", label: "Programs" },
    { id: "fees", label: "Fees" },
    { id: "gallery", label: "Gallery" },
    { id: "leadership", label: "Leadership" },
    { id: "admissions", label: "Admissions" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 shadow-md" style={{ background: p }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-white/20">
            {logoSrc
              ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center font-semibold text-white text-base" style={{ background: a + "44" }}>{nm[0]}</div>}
          </div>
          <span className="font-semibold text-white text-sm sm:text-base truncate max-w-[140px] sm:max-w-xs">{nm}</span>
        </div>
        <div className="hidden xl:flex items-center gap-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onNav(item.id)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: active === item.id ? a : "transparent", color: active === item.id ? "#111" : "rgba(255,255,255,0.75)" }}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onEdit}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs shadow-lg transition-all active:scale-95 border border-white/20 text-white hover:bg-white/10">
            <Settings size={12} /> Edit Site
          </button>
          <button className="hidden sm:flex px-4 py-2 rounded-xl font-semibold text-xs shadow-lg transition-all active:scale-95"
            style={{ background: a, color: "#111" }}>
            Apply Now
          </button>
          <button onClick={() => setMenuOpen(m => !m)}
            className="xl:hidden w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="xl:hidden border-t border-white/10 px-4 py-3 space-y-1" style={{ background: p }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => { onNav(item.id); setMenuOpen(false); }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all hover:bg-white/10"
              style={{ color: active === item.id ? a : "rgba(255,255,255,0.85)" }}>
              {item.label}
            </button>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { onEdit(); setMenuOpen(false); }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm border border-white/20 text-white text-center">
              Edit Site
            </button>
            <button className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-900 text-center" style={{ background: a }}>
              Apply Now
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ─────────────────────────────────────────────────────
function SiteHero({ school, theme }) {
  const { p, a, dark } = theme;
  const logoSrc  = imgUrl(school.logoPreview);
  const coverSrc = imgUrl(school.coverPreview);
  const nm = school.name || "School";

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {coverSrc ? (
        <>
          <img src={coverSrc} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}f0 0%, ${dark}cc 55%, rgba(0,0,0,0.55) 100%)` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p} 0%, ${dark} 100%)` }} />
      )}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 py-20 sm:py-28 w-full">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
              {school.schoolStatus === "active" && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg" style={{ background: a, color: "#111" }}>
                  <Check size={10} /> Verified School
                </span>
              )}
              {school.admission?.openDate && (
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-white/15 backdrop-blur-sm border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Admissions Open
                </span>
              )}
            </div>
            <h1 className="text-white font-semibold text-4xl sm:text-5xl lg:text-6xl leading-none mb-5">
              {nm}
            </h1>
            <p className="text-white/70 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              {school.vision || "Shaping tomorrow's leaders through excellence, integrity, and innovation."}
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-sm shadow-md transition-all active:scale-95"
                style={{ background: a, color: "#111" }}>
                Apply for Admission <ArrowRight size={14} className="inline ml-1" />
              </button>
              <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-sm text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors backdrop-blur-sm">
                <Download size={13} className="inline mr-1.5" />
                Prospectus
              </button>
            </div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-3">
            {[
              { val: school.district || "Rwanda",  label: "Location",    icon: "📍" },
              { val: school.ownership || "School", label: "School Type", icon: "🏛️" },
              { val: school.founded || "—",        label: "Established", icon: "📅" },
              { val: school.category || "—",       label: "Category",    icon: "🎓" },
            ].map(s => (
              <div key={s.label} className="rounded-3xl p-5 border border-white/10 bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-colors">
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="text-lg font-semibold leading-tight mb-1" style={{ color: a }}>{s.val}</div>
                <div className="text-white/50 text-xs font-semibold">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 lg:hidden">
          {[
            { val: school.district || "Rwanda",  label: "Location",    icon: "📍" },
            { val: school.ownership || "School", label: "Type",        icon: "🏛️" },
            { val: school.founded || "—",        label: "Est.",        icon: "📅" },
            { val: school.category || "—",       label: "Category",    icon: "🎓" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 bg-white/10 backdrop-blur-sm border border-white/10 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="font-semibold text-sm leading-tight" style={{ color: a }}>{s.val}</div>
              <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
        <div className="w-0.5 h-8 rounded-full bg-white/30" />
        <span className="text-white/40 text-xs font-semibold tracking-widest">SCROLL</span>
      </div>
    </section>
  );
}

// ── About ────────────────────────────────────────────────────
function SiteAbout({ school, theme }) {
  const { p, a, s } = theme;
  const aboutSrc = imgUrl(school.aboutPreview);
  return (
    <section id="about" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] mb-5" style={{ color: a }}>
              <span className="w-6 h-px block" style={{ background: a }} /> WHO WE ARE
            </div>
            <h2 className="text-4xl sm:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
              Shaping Rwanda's<br />Future Leaders
            </h2>
            <p className="text-gray-500 text-base sm:text-lg leading-relaxed mb-8">
              {school.mission || "We are dedicated to nurturing the next generation of leaders through excellence in education, integrity, and innovation."}
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {[school.ownership, school.category, school.founded && `Est. ${school.founded}`].filter(Boolean).map((tag, i) => (
                <span key={i} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: s || "#EFF6FF", color: p }}>{tag}</span>
              ))}
            </div>
            {(school.coreValues || []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: p }}>Core Values</h4>
                <div className="flex flex-wrap gap-2">
                  {school.coreValues.map((v, i) => (
                    <div key={v} className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: `${p}10`, color: p }}>
                      <span className="w-5 h-5 rounded-full font-semibold text-xs flex items-center justify-center text-white" style={{ background: p }}>{i + 1}</span>
                      <span className="font-bold text-sm">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            {aboutSrc ? (
              <div className="relative">
                <img src={aboutSrc} alt="about" className="w-full h-72 sm:h-96 object-cover rounded-3xl shadow-md" />
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-3xl -z-10" style={{ background: a + "40" }} />
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl -z-10" style={{ background: p + "30" }} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {["🏫", "🔬", "📚", "⚽"].map((e, i) => (
                  <div key={i} className="rounded-3xl aspect-square flex items-center justify-center text-6xl transition-transform"
                    style={{ background: s || "#EFF6FF", marginTop: i === 1 || i === 3 ? "2rem" : "0" }}>
                    {e}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Mission ──────────────────────────────────────────────────
function SiteMission({ school, theme }) {
  const { p, s } = theme;
  const missionSrc = imgUrl(school.missionPreview);
  return (
    <section id="mission" className="py-16 sm:py-24" style={{ background: s || "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Our Purpose" title="Mission & Vision" theme={theme} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl p-8 sm:p-10" style={{ background: p }}>
            <Target size={28} className="text-white mb-5" />
            <h3 className="text-white font-semibold text-2xl mb-4">Our Mission</h3>
            <p className="text-white/75 text-base leading-relaxed">
              {school.mission || "To provide quality, holistic education that nurtures every learner."}
            </p>
          </div>
          <div className="rounded-3xl p-8 sm:p-10 border-2 bg-white" style={{ borderColor: `${p}30` }}>
            <Lightbulb size={28} className="mb-5" style={{ color: p }} />
            <h3 className="font-semibold text-2xl mb-4" style={{ color: p }}>Our Vision</h3>
            <p className="text-gray-600 text-base leading-relaxed">
              {school.vision || "To be Rwanda's leading institution for holistic education."}
            </p>
          </div>
        </div>
        {missionSrc && (
          <div className="rounded-3xl overflow-hidden shadow-md">
            <img src={missionSrc} alt="mission" className="w-full h-48 sm:h-64 object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

// ── Programs ─────────────────────────────────────────────────
function SitePrograms({ school, theme }) {
  const { p, a, s } = theme;
  const levels = school.educationLevels || [];
  const aLevelCombos = school.aLevelCombos || school.aLevelCombinations || [];
  const tvetTrades   = school.tvetTrades  || [];
  const internationalPrimaryPrograms = school.internationalPrimaryPrograms || [];
  const internationalOtherPrograms   = school.internationalOtherPrograms   || [];
  const levelMeta = {
    "Nursery / Pre-Primary":         { icon: "🌱", desc: "Ages 2–6 · Play-based learning" },
    "Primary School":                 { icon: "📚", desc: "P1–P6 · Ages 6–12" },
    "Secondary School (O-Level)":     { icon: "📐", desc: "S1–S3 · Ages 13–16" },
    "Secondary School (A-Level)":     { icon: "🎓", desc: "S4–S6 · Ages 17–19" },
    "TVET":                           { icon: "🔧", desc: "Vocational Training" },
  };
  return (
    <section id="programs" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Academics" title="Our Programs" theme={theme} />
        {levels.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
            {levels.map(l => {
              const m = levelMeta[l] || { icon: "📖", desc: "" };
              const shortName = l.replace("Secondary School (", "").replace(")", "").replace(" / Pre-Primary", "");
              return (
                <div key={l} className="rounded-3xl p-6 text-center border-2 hover:shadow-md transition-all cursor-default"
                  style={{ background: s || "#EFF6FF", borderColor: `${p}25` }}>
                  <div className="text-4xl sm:text-5xl mb-3">{m.icon}</div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{shortName}</h3>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              );
            })}
          </div>
        )}
        {aLevelCombos.length > 0 && (
          <div className="rounded-3xl p-8 mb-6 bg-purple-50 border border-purple-100">
            <h3 className="font-semibold text-purple-900 text-xl mb-2 flex items-center gap-2">
              <Award size={20} /> A-Level Combinations
            </h3>
            <p className="text-purple-600 text-sm mb-6">Available subject combinations for Senior 4–6</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {aLevelCombos.map(c => (
                <div key={c.code} className="bg-white rounded-2xl p-4 border border-purple-100 hover:shadow-md transition-shadow">
                  <div className="font-semibold text-2xl text-purple-700 mb-1">{c.code}</div>
                  <div className="text-xs text-gray-500 leading-tight">{c.full}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tvetTrades.length > 0 && (
          <div className="rounded-3xl p-8 bg-orange-50 border border-orange-100">
            <h3 className="font-semibold text-orange-900 text-xl mb-5">🔧 TVET Trades Offered</h3>
            <div className="flex flex-wrap gap-3">
              {tvetTrades.map(t => (
                <span key={t} className="px-5 py-2.5 rounded-2xl font-bold text-sm text-white" style={{ background: "#EA580C" }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        {(internationalPrimaryPrograms.length > 0 || internationalOtherPrograms.length > 0) && (
          <div className="rounded-3xl p-8 mb-6 bg-teal-50 border border-teal-100">
            <h3 className="font-semibold text-teal-900 text-xl mb-2 flex items-center gap-2">
              <Globe size={20}/> International Students
            </h3>
            <p className="text-xs text-teal-800 mb-6">
              Programs and tracks for international applicants.
            </p>

            {internationalPrimaryPrograms.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-900 mb-2">Primary</p>
                <div className="flex flex-wrap gap-2">
                  {internationalPrimaryPrograms.map(x => (
                    <span key={x} className="px-4 py-2 rounded-2xl font-bold text-xs bg-white border border-teal-100 text-teal-900">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {internationalOtherPrograms.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-900 mb-2">Other</p>
                <div className="flex flex-wrap gap-2">
                  {internationalOtherPrograms.map(x => (
                    <span key={x} className="px-4 py-2 rounded-2xl font-bold text-xs bg-white border border-teal-100 text-teal-900">
                      {x}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {levels.length === 0 && aLevelCombos.length === 0 && tvetTrades.length === 0 && internationalPrimaryPrograms.length === 0 && internationalOtherPrograms.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl">
            <GraduationCap size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-semibold">Programs not configured yet</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Fees ─────────────────────────────────────────────────────
function SiteFees({ school, theme }) {
  const { p, a, s } = theme;
  const fees = school.fees || {};
  const hasFees = Object.values(fees).some(f => f?.items?.length > 0);
  if (!hasFees) return null;
  return (
    <section id="fees" className="py-16 sm:py-24" style={{ background: s || "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Fees & Tuition" title="Fee Structure" theme={theme} />
        <div className="grid sm:grid-cols-2 gap-6">
          {Object.entries(fees).filter(([, v]) => v?.items?.length > 0).map(([lvl, data]) => {
            const fl = FEE_LEVELS.find(f => f.id === lvl) || {
              id: lvl,
              label: formatProgramLabel(data?.label || lvl) || 'Program',
              emoji: null,
              icon: <Banknote size={18} />,
            };
            const total = data.items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            return (
              <div key={lvl} className="bg-white rounded-3xl overflow-hidden border-2 hover:shadow-md transition-shadow" style={{ borderColor: `${p}20` }}>
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: `${p}0e` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{fl.emoji || fl.icon}</span>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base" style={{ color: p }}>{fl.label}</h4>
                      <p className="text-xs text-gray-500">{data.currency || "RWF"} · {data.items.length} fee type{data.items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-base sm:text-lg" style={{ color: p }}>
                      {data.currency || "RWF"} {total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">/term est.</div>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {data.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700 font-medium">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm" style={{ color: p }}>{Number(item.amount || 0).toLocaleString()}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{item.period}</span>
                      </div>
                    </div>
                  ))}
                  {data.notes && <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">{data.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Gallery ──────────────────────────────────────────────────
function SiteGallery({ school, theme }) {
  const { p } = theme;
  const albums = school.albums || [];
  const [activeAlbum, setActiveAlbum] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  if (albums.length === 0) return null;
  const album = albums[Math.min(activeAlbum, albums.length - 1)];

  const closeLightbox = () => setLightbox(null);
  const prevImg = () => setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }));
  const nextImg = () => setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }));

  return (
    <section id="gallery" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Memories" title="Photo Gallery" theme={theme} />
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
          {albums.map((al, i) => (
            <button key={al.id || i} onClick={() => setActiveAlbum(i)}
              className="flex-shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all"
              style={{ borderColor: activeAlbum === i ? p : "#E5E7EB", background: activeAlbum === i ? p : "#fff", color: activeAlbum === i ? "#fff" : "#6B7280" }}>
              📁 {al.title || `Album ${i + 1}`}
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: activeAlbum === i ? "rgba(255,255,255,0.25)" : "#F3F4F6", color: activeAlbum === i ? "#fff" : "#9CA3AF" }}>
                {al.images?.length || 0}
              </span>
            </button>
          ))}
        </div>
        {album && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <h4 className="font-semibold text-gray-900 text-xl">{album.title}</h4>
              {album.date && <span className="text-sm text-gray-500 flex items-center gap-1.5"><Calendar size={13} />{album.date}</span>}
              {album.category && <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${p}15`, color: p }}>{album.category}</span>}
            </div>
            {album.description && <p className="text-gray-500 text-sm mb-6">{album.description}</p>}
            {album.images?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {album.images.map((img, i) => {
                  const src = imgUrl(img.url);
                  return (
                    <div key={img.id || i}
                      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all"
                      onClick={() => setLightbox({ images: album.images, index: i })}>
                      {src ? <img src={src} alt={img.caption || ""} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100"><Camera size={24} className="text-gray-300" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        {img.caption && <p className="text-white text-xs font-semibold">{img.caption}</p>}
                        <div className="flex items-center gap-1 mt-1 text-white/60"><ZoomIn size={12} /><span className="text-xs">View</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl">
                <Camera size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 font-semibold">No photos in this album yet</p>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col" onClick={closeLightbox}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <span className="text-white/50 text-sm font-mono">{lightbox.index + 1} / {lightbox.images.length}</span>
            <button onClick={closeLightbox} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X size={18} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 relative" onClick={e => e.stopPropagation()}>
            <button onClick={prevImg} className="absolute left-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10"><ChevronLeft size={20} /></button>
            {(() => {
              const img = lightbox.images[lightbox.index];
              const src = imgUrl(img.url);
              return src ? <img src={src} alt={img.caption || ""} className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-md" /> : null;
            })()}
            <button onClick={nextImg} className="absolute right-4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 z-10"><ChevronRight size={20} /></button>
          </div>
          {lightbox.images[lightbox.index]?.caption && (
            <div className="px-4 pb-4 text-center flex-shrink-0">
              <p className="text-white/60 text-sm">{lightbox.images[lightbox.index].caption}</p>
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 flex-shrink-0 justify-center">
            {lightbox.images.map((img, i) => {
              const src = imgUrl(img.url);
              return (
                <button key={i} onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: i })); }}
                  className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${lightbox.index === i ? "border-amber-400 opacity-100 ring-2 ring-amber-400/50" : "border-transparent opacity-50 hover:opacity-75"}`}>
                  {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Leadership ───────────────────────────────────────────────
function SiteLeadership({ school, theme }) {
  const { p, a, s } = theme;
  const leaders = school.leaders || [];
  const allLeaders = [
    { name: school.headName, role: "Head Teacher", phone: school.headPhone, email: school.headEmail, photo: school.headPhotoPreview },
    school.deputyName && { name: school.deputyName, role: "Deputy Head", phone: school.deputyPhone, photo: null },
    ...leaders,
  ].filter(Boolean).filter(l => l.name);

  if (allLeaders.length === 0) return null;

  return (
    <section id="leadership" className="py-16 sm:py-24" style={{ background: s || "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Our Team" title="School Leadership" theme={theme} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
          {allLeaders.map((l, i) => {
            const photoSrc = imgUrl(l.photo || l.photoPreview);
            return (
              <div key={i} className="bg-white rounded-3xl p-6 text-center border border-gray-100 hover:shadow-md hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 overflow-hidden ring-4 group-hover:ring-8 transition-all"
                  style={{ background: `${p}15`, ringColor: `${p}20` }}>
                  {photoSrc ? (
                    <img src={photoSrc} alt={l.name} className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-semibold text-2xl" style={{ color: p }}>{l.name[0]}</div>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-1">{l.name}</h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-2 font-medium">{l.role}</p>
                {l.phone && <a href={`tel:${l.phone}`} className="text-xs font-mono transition-colors hover:text-gray-900" style={{ color: p }}>{l.phone}</a>}
                {l.email && !l.phone && <a href={`mailto:${l.email}`} className="text-xs transition-colors hover:text-gray-900 truncate block" style={{ color: p }}>{l.email}</a>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Admissions Apply Modal ────────────────────────────────────
function AdmissionApplyModal({ formId, theme, onClose }) {
  const { p, s } = theme;
  const [form,       setForm]     = useState(null);
  const [loading,    setLoading]  = useState(true);
  const [submitting, setSubmitting]= useState(false);
  const [submitted,  setSubmitted]= useState(null);
  const [error,      setError]    = useState(null);
  const [answers,    setAnswers]  = useState({});
  const [fieldErrors,setFieldErrors] = useState({});
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const ADM_API = `${SERVER}/api/admissions`;

  useEffect(() => {
    fetch(`${ADM_API}/forms/${formId}/public`)
      .then(r => r.json())
      .then(d => { if (d.success) setForm(d.data); else setError(d.message); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs._name = "Full name is required";
    for (const q of form?.questions || []) {
      if (!q.isRequired) continue;
      const val = answers[q.id];
      const isFile = q.questionType === "file" || q.questionType === "multifile";
      if (isFile && (!Array.isArray(val) || !val.length)) errs[q.id] = "File required";
      else if (!isFile && q.questionType === "multiselect" && (!Array.isArray(val) || !val.length)) errs[q.id] = "Select at least one";
      else if (!isFile && q.questionType !== "multiselect" && !val?.toString().trim()) errs[q.id] = "Required";
    }
    setFieldErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("applicantName", name.trim());
      fd.append("applicantEmail", email.trim());
      fd.append("applicantPhone", phone.trim());
      const answersPayload = {};
      for (const q of form.questions || []) {
        const isFile = q.questionType === "file" || q.questionType === "multifile";
        if (!isFile) answersPayload[`q_${q.id}`] = answers[q.id];
      }
      fd.append("answers", JSON.stringify(answersPayload));
      for (const q of form.questions || []) {
        const isFile = q.questionType === "file" || q.questionType === "multifile";
        if (isFile && Array.isArray(answers[q.id])) {
          for (const file of answers[q.id]) fd.append(`q_${q.id}`, file);
        }
      }
      const r = await fetch(`${ADM_API}/forms/${formId}/apply`, { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) setSubmitted(d.data);
      else setError(d.message || "Submission failed");
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[92vh] flex flex-col shadow-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${p}, ${p}cc)` }}>
          <div>
            <h3 className="text-white font-semibold text-lg">Apply for Admission</h3>
            {form?.schoolName && <p className="text-white/60 text-xs">{form.schoolName}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin" style={{ color: p }} />
            </div>
          )}

          {!loading && submitted && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: `${p}15` }}>
                <CheckCircle size={32} style={{ color: p }} />
              </div>
              <h4 className="font-semibold text-gray-900 text-xl mb-2">Application Submitted!</h4>
              <p className="text-gray-500 text-sm mb-4">Thank you, <strong>{submitted.applicantName}</strong>!</p>
              <div className="rounded-2xl p-4 mb-6" style={{ background: `${p}08`, border: `1.5px solid ${p}25` }}>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Reference No.</p>
                <p className="text-xl font-semibold font-mono" style={{ color: p }}>{submitted.referenceNo}</p>
                <p className="text-xs text-gray-400 mt-1">Keep this for tracking your application</p>
              </div>
              <button onClick={onClose} className="px-8 py-3 rounded-2xl font-semibold text-sm text-white"
                style={{ background: p }}>Done ✓</button>
            </div>
          )}

          {!loading && !submitted && (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {form && form.status !== "open" && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="font-bold text-gray-700">Admissions are currently {form.status}</p>
                  {form.applicationStart && <p className="text-sm text-gray-400 mt-1">Opens: {new Date(form.applicationStart).toLocaleDateString()}</p>}
                </div>
              )}
              {form && form.status === "open" && (
                <div className="space-y-5">
                  {(form.maxApplicants || form.applicationDeadline) && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-gray-100">
                      {form.applicationDeadline && (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: `${p}10`, color: p }}>
                          <Calendar size={11} /> Deadline: {new Date(form.applicationDeadline).toLocaleDateString()}
                        </span>
                      )}
                      {form.maxApplicants && (
                        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700">
                          <Users size={11} /> {form.spotsRemaining ?? form.maxApplicants} spots left
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Your Information</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input value={name} onChange={e => setName(e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${fieldErrors._name ? "border-red-300 bg-red-50" : "border-gray-200 focus:ring-indigo-300"}`}
                          placeholder="Student's full name" />
                        {fieldErrors._name && <p className="text-red-500 text-xs mt-1">{fieldErrors._name}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            placeholder="parent@email.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Phone</label>
                          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                            placeholder="+250 7…" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {(form.questions || []).map((q, idx) => (
                    <div key={q.id}>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {idx + 1}. {q.label}
                        {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <ModalQuestionField q={q} value={answers[q.id]} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} p={p} />
                      {fieldErrors[q.id] && <p className="text-red-500 text-xs mt-1">{fieldErrors[q.id]}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!loading && !submitted && form?.status === "open" && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${p}, ${p}cc)` }}>
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Submit Application <ArrowRight size={15} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline question renderer inside modal ─────────────────────
function ModalQuestionField({ q, value, onChange, p }) {
  const base = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition bg-white";

  if (q.questionType === "text")
    return <input className={base} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={q.placeholder || ""} />;

  if (q.questionType === "textarea")
    return <textarea className={`${base} resize-none`} rows={3} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={q.placeholder || ""} />;

  if (q.questionType === "yesno")
    return (
      <div className="flex gap-2">
        {["Yes","No"].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition ${value === opt ? "text-white border-transparent" : "text-gray-600 border-gray-200 bg-white"}`}
            style={value === opt ? { background: p, borderColor: p } : {}}>
            {opt}
          </button>
        ))}
      </div>
    );

  if (q.questionType === "select")
    return (
      <select className={base} value={value || ""} onChange={e => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {(q.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    );

  if (q.questionType === "multiselect") {
    const sel = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((opt, i) => {
          const active = sel.includes(opt);
          return (
            <button key={i} type="button" onClick={() => onChange(active ? sel.filter(v => v !== opt) : [...sel, opt])}
              className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition ${active ? "text-white border-transparent" : "text-gray-600 border-gray-200 bg-white"}`}
              style={active ? { background: p, borderColor: p } : {}}>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.questionType === "file" || q.questionType === "multifile") {
    const files = Array.isArray(value) ? value : [];
    const max   = q.questionType === "multifile" ? (q.maxFiles || 5) : 1;
    return (
      <div>
        <label className="flex items-center gap-2 cursor-pointer px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 transition text-sm text-gray-500 font-bold"
          style={{ borderColor: `${p}40` }}>
          <Send size={14} style={{ color: p }} />
          <span>Upload {q.questionType === "multifile" ? `up to ${max} files` : "a file"}</span>
          <input type="file" className="hidden" multiple={q.questionType === "multifile"}
            accept="image/*,application/pdf"
            onChange={e => {
              const picked = Array.from(e.target.files || []);
              onChange(q.questionType === "multifile" ? [...files, ...picked].slice(0, max) : picked.slice(0,1));
              e.target.value = "";
            }} />
        </label>
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <FileText size={11} />
                <span className="flex-1 truncate">{f.name}</span>
                <button type="button" onClick={() => onChange(files.filter((_,j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ── Admissions ───────────────────────────────────────────────
function SiteAdmissions({ school, theme, schoolSlug }) {
  const { p, a, s } = theme;
  const adm = school.admission || {};
  const [applyOpen, setApplyOpen] = useState(false);
  const [admStats,  setAdmStats]  = useState(null);
  const ADM_API = `${SERVER}/api/admissions`;

  useEffect(() => {
    if (!schoolSlug && !school.id) return;
    const url = schoolSlug ? `${ADM_API}/slug/${schoolSlug}` : null;
    if (!url) return;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setAdmStats(d.data); })
      .catch(() => {});
  }, [schoolSlug, school.id]);

  const now  = new Date();
  const dead = admStats?.applicationDeadline ? new Date(admStats.applicationDeadline) : null;
  const daysLeft = dead && dead > now ? Math.ceil((dead - now) / 86400000) : null;
  const isOpen = admStats?.isOpen ?? admStats?.status === "open";
  const formId = admStats?.id;

  return (
    <section id="admissions" className="py-16 sm:py-24 bg-white">
      {applyOpen && formId && (
        <AdmissionApplyModal formId={formId} theme={theme} onClose={() => setApplyOpen(false)} />
      )}
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Join Us" title="Admissions" theme={theme} />

        {admStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Status", val: isOpen ? "Open" : (admStats.status || "Closed"), color: isOpen ? "#16a34a" : "#dc2626", bg: isOpen ? "#f0fdf4" : "#fef2f2", dot: isOpen },
              admStats.applicationStart && { label: "Opens", val: new Date(admStats.applicationStart).toLocaleDateString("en-RW", { day: "numeric", month: "short" }), color: p, bg: `${p}0d` },
              admStats.applicationDeadline && { label: "Deadline", val: new Date(admStats.applicationDeadline).toLocaleDateString("en-RW", { day: "numeric", month: "short" }), color: "#d97706", bg: "#fffbeb" },
              daysLeft != null && { label: "Days Left", val: `${daysLeft}d`, color: daysLeft <= 7 ? "#dc2626" : p, bg: daysLeft <= 7 ? "#fef2f2" : `${p}0d` },
              admStats.maxApplicants && { label: "Spots", val: `${admStats.spotsRemaining ?? admStats.maxApplicants} / ${admStats.maxApplicants}`, color: "#d97706", bg: "#fffbeb" },
              admStats.applicantsCount != null && { label: "Applied", val: admStats.applicantsCount, color: p, bg: `${p}0d` },
            ].filter(Boolean).slice(0, 4).map((item, i) => (
              <div key={i} className="rounded-2xl p-4 sm:p-5 text-center" style={{ background: item.bg }}>
                {item.dot && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block mb-1" />}
                <div className="text-xl sm:text-2xl font-semibold" style={{ color: item.color }}>{item.val}</div>
                <div className="text-xs text-gray-500 font-bold mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {!admStats && (
          <div className="flex flex-wrap gap-3 mb-10">
            {adm.openDate ? (
              <span className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: "#dcfce7", color: "#15803d" }}>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" /> Admissions Open
              </span>
            ) : (
              <span className="px-5 py-2.5 rounded-full bg-gray-100 text-gray-600 text-sm font-bold">Contact for dates</span>
            )}
            {adm.year && (
              <span className="px-5 py-2.5 rounded-full text-sm font-bold" style={{ background: `${p}10`, color: p }}>Academic Year: {adm.year}</span>
            )}
          </div>
        )}

        {adm.steps?.filter(Boolean).length > 0 && (
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {adm.steps.filter(Boolean).map((st, i) => (
              <div key={i} className="rounded-3xl p-6 sm:p-8 text-center hover:shadow-lg transition-shadow" style={{ background: s || "#EFF6FF" }}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mx-auto mb-4 font-semibold text-white text-lg shadow-lg" style={{ background: p }}>{i + 1}</div>
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{st}</h4>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {adm.requirements?.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 text-lg mb-5 flex items-center gap-2">
                <CheckCircle2 size={20} style={{ color: p }} /> Requirements
              </h4>
              <div className="space-y-3">
                {adm.requirements.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: a }} />
                    <span className="text-gray-600 text-sm">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {adm.documents?.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
              <h4 className="font-semibold text-gray-900 text-lg mb-5 flex items-center gap-2">
                <FileText size={20} style={{ color: p }} /> Required Documents
              </h4>
              <div className="space-y-3">
                {adm.documents.map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <FileText size={15} className="flex-shrink-0 mt-0.5" style={{ color: p }} />
                    <span className="text-gray-600 text-sm">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {adm.notes && (
          <div className="rounded-3xl p-6 mb-8" style={{ background: `${p}08`, border: `1.5px solid ${p}20` }}>
            <p className="text-gray-600 text-sm leading-relaxed">{adm.notes}</p>
          </div>
        )}

        <div className="rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          style={{ background: `linear-gradient(135deg, ${p}, ${p}cc)` }}>
          <div>
            <h3 className="text-white font-semibold text-xl sm:text-2xl mb-1">Ready to Join {school.name}?</h3>
            <p className="text-white/60 text-sm">
              {admStats?.applicantsCount != null && admStats?.maxApplicants
                ? `${admStats.spotsRemaining} spots remaining out of ${admStats.maxApplicants}`
                : adm.contactPhone ? `Contact: ${adm.contactPhone}` : "Secure your child's future today."}
            </p>
          </div>
          {formId && isOpen ? (
            <button onClick={() => setApplyOpen(true)}
              className="flex-shrink-0 flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-sm text-gray-900 transition-transform shadow-md"
              style={{ background: a }}>
              Apply Online <ArrowRight size={15} />
            </button>
          ) : (
            <button className="flex-shrink-0 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-sm text-white/60 cursor-default border border-white/20" disabled>
              {admStats?.status === "closed" ? "Applications Closed" : admStats?.status === "paused" ? "Temporarily Paused" : "Apply Online →"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Contact ──────────────────────────────────────────────────
function SiteContact({ school, theme }) {
  const { p, a, s } = theme;
  const contactItems = [
    { icon: MapPin,   label: "Address",        val: school.address },
    { icon: Phone,    label: "Phone",          val: school.phone },
    { icon: Mail,     label: "Email",          val: school.email },
    { icon: FileText, label: "Postal Address", val: school.postalAddress },
    { icon: Globe,    label: "Website",        val: school.website },
  ].filter(c => c.val);

  return (
    <section id="contact" className="py-16 sm:py-24" style={{ background: s || "#F8FAFC" }}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <SectionHead eyebrow="Get In Touch" title="Contact Us" theme={theme} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            {contactItems.map(c => (
              <div key={c.label} className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: s || "#EFF6FF" }}>
                  <c.icon size={18} style={{ color: p }} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{c.label}</div>
                  <div className="text-sm font-semibold text-gray-900">{c.val}</div>
                </div>
              </div>
            ))}
            {(school.facebook || school.twitter || school.instagram) && (
              <div className="flex gap-3 pt-2">
                {school.facebook  && <a href={school.facebook}  target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#1877F2" }}><Share2 size={18} className="text-white" /></a>}
                {school.twitter   && <a href={school.twitter}   target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#1DA1F2" }}><Share2 size={18} className="text-white" /></a>}
                {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#E4405F" }}><Share2 size={18} className="text-white" /></a>}
              </div>
            )}
          </div>
          <div className="rounded-3xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center" style={{ minHeight: 300 }}>
            {school.mapUrl ? (
              <div className="text-center p-10">
                <div className="text-6xl mb-5">🗺️</div>
                <p className="text-gray-500 text-sm mb-2 font-semibold">{school.district}, {school.province}</p>
                <p className="text-gray-400 text-xs mb-6">{school.address}</p>
                <a href={school.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="px-6 py-3 rounded-2xl text-sm font-semibold text-white inline-block hover:opacity-90 transition-opacity shadow-lg"
                  style={{ background: p }}>
                  Open in Google Maps →
                </a>
              </div>
            ) : (
              <div className="text-center p-10">
                <div className="text-6xl mb-4">📍</div>
                <p className="text-gray-600 font-bold text-sm">{school.district}, {school.province}</p>
                {school.address && <p className="text-gray-400 text-xs mt-1">{school.address}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────
function SiteFooter({ school, theme, slug }) {
  const { p, a } = theme;
  const logoSrc = imgUrl(school.logoPreview);
  return (
    <footer className="py-10 px-6 sm:px-8" style={{ background: p }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10">
              {logoSrc
                ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center font-semibold text-white text-lg">{(school.name || "S")[0]}</div>}
            </div>
            <div>
              <div className="font-semibold text-white text-base">{school.name}</div>
              <div className="text-white/50 text-xs">{school.address || `${school.district}, ${school.province}`}</div>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            {(school.facebook || school.twitter || school.instagram) && (
              <div className="flex gap-2">
                {school.facebook  && <a href={school.facebook}  target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><Share2 size={15} className="text-white" /></a>}
                {school.twitter   && <a href={school.twitter}   target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><Share2 size={15} className="text-white" /></a>}
                {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"><Share2 size={15} className="text-white" /></a>}
              </div>
            )}
            <div className="text-white/30 text-xs">
              © {new Date().getFullYear()} {school.name}
              {slug && <span> · <span style={{ color: a }}>babyeyi.rw</span>/school/{slug}</span>}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════
//  FULL SITE VIEWER
// ═══════════════════════════════════════════════════════════════
function FullSiteViewer({ schoolId, onBack, onEdit }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [active,   setActive]   = useState("about");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/school/${schoolId}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error("Failed to load school data"); return r.json(); })
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolId]);

  const handleNav = (section) => {
    setActive(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
      <div className="text-center">
        <Loader2 size={56} className="text-amber-400 animate-spin mx-auto mb-5" />
        <p className="text-gray-400 font-semibold text-sm tracking-wide">Loading school website…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f172a" }}>
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 text-center max-w-sm shadow-md">
        <div className="text-6xl mb-5">🏫</div>
        <h3 className="text-white font-semibold text-2xl mb-2">Website Not Available</h3>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">{error || "This school's website data could not be loaded."}</p>
        <button onClick={onBack} className="px-8 py-3 bg-amber-400 text-gray-900 rounded-2xl font-semibold text-sm hover:bg-amber-300 transition-all shadow-lg">
          ← Go Back
        </button>
      </div>
    </div>
  );

  const rawTheme = THEMES[data.colorTheme || "blue"] || THEMES.blue;
  const theme = {
    p: data.customColors?.primary   || rawTheme.p,
    s: data.customColors?.secondary || rawTheme.s,
    a: data.customColors?.accent    || rawTheme.a,
    dark: rawTheme.dark,
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-md border border-white/15"
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)" }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white hover:bg-white/10 transition-colors">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="w-px h-5 bg-white/20" />
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-amber-400 hover:bg-white/10 transition-colors">
          <Settings size={13} /> Edit Website
        </button>
        <div className="w-px h-5 bg-white/20" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl">
          {data.siteStatus === "published"
            ? <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400 text-xs font-bold">Live</span></>
            : <><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-amber-400 text-xs font-bold">Draft Preview</span></>
          }
        </div>
      </div>
      <SiteNavBar school={data} theme={theme} active={active} onNav={handleNav} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onEdit={onEdit} />
      <SiteHero        school={data} theme={theme} />
      <SiteAbout       school={data} theme={theme} />
      <SiteMission     school={data} theme={theme} />
      <SitePrograms    school={data} theme={theme} />
      <SiteFees        school={data} theme={theme} />
      <SiteGallery     school={data} theme={theme} />
      <SiteLeadership  school={data} theme={theme} />
      <SiteAdmissions  school={data} theme={theme} schoolSlug={data.slug} />
      <SiteContact     school={data} theme={theme} />
      <SiteFooter      school={data} theme={theme} slug={data.slug} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APPLICANTS PANEL
// ═══════════════════════════════════════════════════════════════
const APP_STATUSES_SPLASH = [
  { value:"pending",    label:"Pending",    color:"bg-amber-100 text-amber-700",   dot:"bg-amber-500"   },
  { value:"reviewed",   label:"Reviewed",   color:"bg-blue-100 text-blue-700",     dot:"bg-blue-500"    },
  { value:"accepted",   label:"Accepted",   color:"bg-green-100 text-green-700",   dot:"bg-green-500"   },
  { value:"rejected",   label:"Rejected",   color:"bg-red-100 text-red-700",       dot:"bg-red-500"     },
  { value:"waitlisted", label:"Waitlisted", color:"bg-purple-100 text-purple-700", dot:"bg-purple-500"  },
];

function ApplicantsPanel({ schoolId }) {
  const [admForm,      setAdmForm]      = useState(null);
  const [apps,         setApps]         = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [appsLoading,  setAppsLoading]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");
  const [detailApp,    setDetailApp]    = useState(null);

  const loadForm = useCallback(async () => {
    if (!schoolId) { setLoading(false); return; }
    try {
      const r = await fetch(`${ADMISSION_API}/school/${schoolId}`, { credentials:"include" });
      const d = await r.json();
      if (d.success && d.data) {
        setAdmForm(d.data);
        const rs = await fetch(`${ADMISSION_API}/forms/${d.data.id}/stats`, { credentials:"include" });
        const ds = await rs.json();
        if (ds.success) setStats(ds.data);
      }
    } catch {}
    finally { setLoading(false); }
  }, [schoolId]);

  const loadApps = useCallback(async () => {
    if (!admForm?.id) return;
    setAppsLoading(true);
    try {
      const r = await fetch(`${ADMISSION_API}/forms/${admForm.id}/applications`, { credentials:"include" });
      const d = await r.json();
      if (d.success) setApps(d.data||[]);
    } catch {}
    finally { setAppsLoading(false); }
  }, [admForm?.id]);

  useEffect(() => { loadForm(); }, [loadForm]);
  useEffect(() => { if (admForm?.id) loadApps(); }, [admForm?.id, loadApps]);

  // Quick inline status update (from table dropdown — no modal needed)
  const updateStatus = async (appId, status) => {
    try {
      await fetch(`${ADMISSION_API}/applications/${appId}/status`, {
        method:"PATCH", credentials:"include",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ status }),
      });
      setApps(prev => prev.map(a => a.id===appId ? {...a, status} : a));
    } catch {}
  };

  const getSt = (status) => APP_STATUSES_SPLASH.find(s=>s.value===status)||APP_STATUSES_SPLASH[0];

  const filtered = apps
    .filter(a => {
      const q=search.toLowerCase();
      const ok=!q||(a.applicant_name||"").toLowerCase().includes(q)||(a.reference_no||"").toLowerCase().includes(q)||(a.applicant_email||"").toLowerCase().includes(q);
      return ok && (filterStatus==="all"||a.status===filterStatus);
    })
    .sort((a,b)=>{
      if(sortBy==="newest") return new Date(b.submitted_at||b.created_at)-new Date(a.submitted_at||a.created_at);
      if(sortBy==="oldest") return new Date(a.submitted_at||a.created_at)-new Date(b.submitted_at||b.created_at);
      if(sortBy==="name")   return (a.applicant_name||"").localeCompare(b.applicant_name||"");
      return 0;
    });

  const counts = apps.reduce((acc,a)=>{ acc[a.status]=(acc[a.status]||0)+1; return acc; },{});
  const now = new Date();
  const dead = stats?.applicationDeadline ? new Date(stats.applicationDeadline) : null;
  const daysLeft = dead&&dead>now ? Math.ceil((dead-now)/86400000) : null;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="text-indigo-400 animate-spin"/>
    </div>
  );

  if (!admForm) return (
    <div className="text-center py-12 rounded-2xl bg-gray-50 border border-gray-100">
      <div className="text-4xl mb-3">📬</div>
      <p className="text-gray-600 font-semibold text-sm">No admission form configured yet</p>
      <p className="text-gray-400 text-xs mt-1">Go to Manage Website → Step 7 to set up admissions</p>
    </div>
  );

  const fStatus = admForm.status||"draft";

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon:Users,       val:stats?.applicantsCount??0, label:"Applications",  bg:"bg-indigo-50",  val_c:"text-indigo-700",  ic:"text-indigo-500" },
          { icon:Award,       val:stats?.maxApplicants??"∞", label:"Spots Allowed", bg:"bg-emerald-50", val_c:"text-emerald-700", ic:"text-emerald-500" },
          { icon:TrendingUp,  val:daysLeft??"-",              label:"Days Left",     bg:"bg-amber-50",   val_c:"text-amber-700",   ic:"text-amber-500" },
          { icon:CheckCircle, val:fStatus,                   label:"Form Status",   bg:"bg-gray-50",    val_c:"text-gray-700",    ic:"text-gray-500" },
        ].map((s,i)=>(
          <div key={i} className={`${s.bg} rounded-2xl p-3.5 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
              <s.icon size={16} className={s.ic}/>
            </div>
            <div className="min-w-0">
              <div className={`text-xl font-semibold leading-none ${s.val_c} truncate`}>{s.val}</div>
              <div className="text-[10px] font-bold text-gray-500 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by name, reference, email…"
            className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"/>
          {search && (
            <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={12}/>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">All statuses</option>
            {APP_STATUSES_SPLASH.map(s=>(
              <option key={s.value} value={s.value}>{s.label}{counts[s.value]?` (${counts[s.value]})`:""}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">A–Z</option>
          </select>
          <button onClick={()=>loadApps()} title="Refresh"
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition flex-shrink-0">
            <RefreshCw size={13}/>
          </button>
        </div>
      </div>

      {/* Status chips */}
      {apps.length>0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filterStatus==="all"?"bg-gray-900 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            All ({apps.length})
          </button>
          {APP_STATUSES_SPLASH.filter(s=>counts[s.value]>0).map(s=>(
            <button key={s.value} onClick={()=>setFilterStatus(s.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filterStatus===s.value?`${s.color} ring-2 ring-offset-1 ring-current`:"bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
              {s.label} ({counts[s.value]||0})
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {appsLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="text-indigo-400 animate-spin"/>
        </div>
      ) : filtered.length===0 ? (
        <div className="text-center py-12 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="text-4xl mb-2">{apps.length===0?"📬":"🔍"}</div>
          <p className="text-gray-600 font-semibold text-sm">{apps.length===0?"No applications yet":"No results"}</p>
          <p className="text-gray-400 text-xs mt-1">{apps.length===0?"Submitted applications will appear here":"Try clearing filters"}</p>
          {search&&<button onClick={()=>{setSearch("");setFilterStatus("all");}} className="mt-3 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition">Clear</button>}
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 font-bold">Showing {filtered.length} of {apps.length} applicant{apps.length!==1?"s":""}</p>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Applicant</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(app=>{
                  const st=getSt(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-indigo-50/40 transition cursor-pointer" onClick={()=>setDetailApp(app)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{app.reference_no}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-indigo-600">{(app.applicant_name||"?")[0].toUpperCase()}</span>
                          </div>
                          <span className="font-bold text-gray-800 text-sm">{app.applicant_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="truncate max-w-[140px]">{app.applicant_email||""}</div>
                        <div>{app.applicant_phone||""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(app.submitted_at||app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                        <select value={app.status} onChange={e=>updateStatus(app.id,e.target.value)}
                          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
                          {APP_STATUSES_SPLASH.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map(app=>{
              const st=getSt(app.status);
              return (
                <div key={app.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:bg-gray-50"
                  onClick={()=>setDetailApp(app)}>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-indigo-600">{(app.applicant_name||"?")[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{app.applicant_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{app.reference_no}</p>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">{new Date(app.submitted_at||app.created_at).toLocaleDateString()}</span>
                    <select value={app.status}
                      onChange={e=>{e.stopPropagation();updateStatus(app.id,e.target.value);}}
                      onClick={e=>e.stopPropagation()}
                      className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none">
                      {APP_STATUSES_SPLASH.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Full-detail modal (ApplicantDetailModal) ── */}
      {detailApp && (
        <ApplicantDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onStatusChange={(id, status) => {
            setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════
function WebsiteSplash({ schoolId, schoolName, onEnter, onOpenFeatures, onViewSite, onDeleteSite, deleting }) {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    fetch(`${API}/school/${schoolId}`, { credentials:"include" })
      .then(r=>r.json())
      .then(r=>setInfo(r.data))
      .catch(()=>setError("Could not load website info"))
      .finally(()=>setLoading(false));
  }, [schoolId]);

  const isPublished = info?.siteStatus==="published";
  const isDraft     = info?.siteStatus==="draft";
  const hasWebsite  = isPublished || isDraft;
  const logoSrc     = imgUrl(info?.logoPreview);
  const coverSrc    = imgUrl(info?.coverPreview);

  const features = [
    { icon:LayoutTemplate, title:"11-Step Wizard",  desc:"Guided setup for every section" },
    { icon:Eye,            title:"Live Preview",    desc:"See changes as you build" },
    { icon:Globe,          title:"Instant Publish", desc:"Go live with one click" },
    { icon:Sparkles,       title:"Auto-Filled",     desc:"Data pulled from your school profile" },
  ];

  return (
    <div className="min-h-full flex flex-col" style={{ fontFamily:"'Montserrat',system-ui,sans-serif" }}>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden flex-shrink-0"
        style={{ background:"linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)", minHeight:"320px" }}>
        {coverSrc && (
          <>
            <img src={coverSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10"/>
            <div className="absolute inset-0" style={{ background:"linear-gradient(160deg,rgba(15,23,42,.95) 0%,rgba(30,27,75,.9) 50%,rgba(15,23,42,.95) 100%)" }}/>
          </>
        )}
        <div className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{ backgroundImage:"radial-gradient(circle,rgba(99,102,241,.6) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background:"radial-gradient(circle,#6366f1,transparent)" }}/>

        <div className="relative px-4 sm:px-8 py-8 sm:py-12 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden ring-4 ring-indigo-500/30 shadow-md shadow-indigo-500/20">
                {logoSrc ? (
                  <img src={logoSrc} alt="logo" className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-white"
                    style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {(schoolName||"S")[0]}
                  </div>
                )}
              </div>
              {isPublished && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg ring-2 ring-emerald-400/30">
                  <CheckCircle size={14} className="text-white"/>
                </div>
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-2 sm:mb-1.5">
                <Zap size={9} className="text-indigo-400"/>
                <span className="text-indigo-400 text-[10px] font-semibold uppercase tracking-widest">School Mini Website</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold text-white leading-tight">{schoolName||"Your School"}</h1>
              {loading ? (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2">
                  <Loader2 size={12} className="text-indigo-400 animate-spin"/>
                  <span className="text-slate-400 text-xs">Loading…</span>
                </div>
              ) : error ? (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11}/> {error}</p>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                  <StatusBadge status={info?.siteStatus}/>
                  {info?.slug && isPublished && (
                    <span className="text-xs text-indigo-400 font-bold opacity-70">babyeyi.rw/school/{info.slug}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!loading && !error && (
            <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0 w-full sm:w-auto">
              <button onClick={onEnter}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm text-gray-900 shadow-md shadow-indigo-500/30 active:scale-95 transition-all"
                style={{ background:"linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                {isDraft ? <><RefreshCw size={14}/> Continue Editing</> :
                 isPublished ? <><Settings size={14}/> Manage Website</> :
                 <><Sparkles size={14}/> Create Website</>}
                <ArrowRight size={13}/>
              </button>
              {hasWebsite && (
                <button onClick={onViewSite}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm border border-white/20 text-white hover:bg-white/10 transition-colors">
                  <Eye size={14}/> {isPublished ? "View Live Site" : "Preview Draft"}
                </button>
              )}
            </div>
          )}
        </div>

        {!hasWebsite && !loading && (
          <div className="relative px-4 sm:px-8 pb-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {features.map((f,i)=>(
              <div key={i} className="rounded-2xl p-3.5 text-center border border-white/8 hover:border-indigo-500/40 transition-all"
                style={{ background:"rgba(255,255,255,.04)", backdropFilter:"blur(8px)" }}>
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background:"rgba(99,102,241,.2)" }}>
                  <f.icon size={14} className="text-indigo-400"/>
                </div>
                <div className="text-white font-semibold text-[11px] mb-0.5">{f.title}</div>
                <div className="text-slate-500 text-[9px] leading-tight">{f.desc}</div>
              </div>
            ))}
          </div>
        )}

        {hasWebsite && info && (
          <div className="relative px-4 sm:px-8 pb-8 flex gap-4 flex-wrap">
            {[
              { label:"Status",   val:isPublished?"🟢 Live":"🟡 Draft" },
              { label:"Template", val:info.template||"Modern" },
              { label:"Sections", val:`${(info.sections||[]).length||13} active` },
            ].map(s=>(
              <div key={s.label} className="text-center rounded-2xl px-4 py-2.5 border border-white/8"
                style={{ background:"rgba(255,255,255,.04)" }}>
                <div className="text-white font-semibold text-xs">{s.val}</div>
                <div className="text-slate-500 text-[10px]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {!schoolId && (
          <div className="relative px-4 sm:px-8 pb-8">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0"/>
              <p className="text-amber-300 text-sm font-semibold">School ID not found — please log out and re-login.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 sm:px-8">
        <div className="flex gap-0.5">
          {[
            { key:"overview",   label:"Overview",   icon:Globe  },
            { key:"applicants", label:"Applicants", icon:Users  },
          ].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab===t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              <t.icon size={14}/> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {activeTab==="overview" && (
          <div className="space-y-6">
            {!hasWebsite && !loading && (
              <div className="text-center py-10 rounded-3xl bg-indigo-50 border-2 border-dashed border-indigo-200">
                <Sparkles size={32} className="text-indigo-400 mx-auto mb-3"/>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">No website yet</h3>
                <p className="text-gray-500 text-sm mb-5">Build your school's mini website in minutes with our guided wizard</p>
                <button onClick={onEnter}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-sm text-gray-900"
                  style={{ background:"linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                  <Sparkles size={14}/> Create Your Website <ArrowRight size={13}/>
                </button>
              </div>
            )}
            {hasWebsite && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                    <Globe size={14} className="text-indigo-500"/> Website Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    {[
                      { label:"Status",   val:isPublished ? "Published 🟢" : "Draft 🟡" },
                      { label:"Slug",     val:info?.slug || "—" },
                      { label:"Template", val:info?.template || "Default" },
                      { label:"Theme",    val:info?.colorTheme || "Default" },
                    ].map(r=>(
                      <div key={r.label} className="flex justify-between gap-2">
                        <span className="text-gray-400 font-bold text-xs">{r.label}</span>
                        <span className="text-gray-800 font-semibold text-xs">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500"/> Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <button onClick={onEnter}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-100 transition text-left">
                      <Settings size={14}/> {isDraft ? "Continue Editing" : "Manage Website / Features"}
                    </button>
                    <button
                      onClick={onOpenFeatures}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-semibold hover:bg-indigo-100 transition text-left"
                    >
                      <Layers size={14}/> Select steps/features (Gallery optional)
                    </button>
                    {hasWebsite&&(
                      <button onClick={onViewSite}
                        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-semibold hover:bg-indigo-100 transition text-left">
                        <Eye size={14}/> {isPublished?"View Live Site":"Preview Draft"}
                      </button>
                    )}
                    {hasWebsite && info?.miniId ? (
                      <button
                        onClick={onDeleteSite}
                        disabled={deleting}
                        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition text-left disabled:opacity-60"
                      >
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        {deleting ? "Deleting website..." : "Delete mini website"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==="applicants" && (
          <ApplicantsPanel schoolId={schoolId}/>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WIZARD WRAPPER
// ═══════════════════════════════════════════════════════════════
function SchoolMiniWebsiteWizard({ schoolId, schoolName, onBack, initialStep }) {
  return (
    <div className="relative min-h-screen" style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <button onClick={onBack}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white shadow-md border border-white/15 hover:bg-white/15 transition-colors"
        style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(8px)" }}>
        <ChevronLeft size={13} /> Dashboard
      </button>
      <MiniWebsiteApp
        initialSchoolId={schoolId}
        initialSchoolName={schoolName}
        initialStep={initialStep}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════
export default function SchoolMiniWebsitePage({ session, toast }) {
  const { user } = useAuth();
  const schoolId   = session?.schoolId   ?? user?.school?.id   ?? user?.school_id  ?? null;
  const schoolName = session?.schoolName ?? user?.school?.name ?? "Your School";

  const [mode, setMode] = useState("splash");
  const [wizardInitialStep, setWizardInitialStep] = useState(1);
  const [deletingSite, setDeletingSite] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const openWizard = (startStep = 1) => {
    setWizardInitialStep(startStep);
    setMode("wizard");
  };

  const requestDeleteSite = useCallback(() => {
    if (!schoolId || deletingSite) return;
    setDeleteInput("");
    setShowDeleteModal(true);
  }, [schoolId, deletingSite]);

  const handleDeleteSite = useCallback(async () => {
    if (!schoolId || deletingSite || deleteInput !== "DELETE") return;
    try {
      setDeletingSite(true);
      const r = await fetch(`${API}/school/${schoolId}`, { credentials: "include" });
      const d = await r.json().catch(() => ({}));
      const miniId = d?.data?.miniId;
      if (!miniId) throw new Error("No mini website found for this school.");
      const del = await fetch(`${API}/${miniId}`, { method: "DELETE", credentials: "include" });
      const jd = await del.json().catch(() => ({}));
      if (!del.ok || !jd.success) throw new Error(jd.message || "Failed to delete mini website.");
      toast?.success?.("Mini website deleted.");
      setShowDeleteModal(false);
      setDeleteInput("");
      setMode("splash");
    } catch (e) {
      toast?.error?.(e.message || "Failed to delete mini website.");
    } finally {
      setDeletingSite(false);
    }
  }, [schoolId, deletingSite, deleteInput, toast]);

  if (mode === "splash") {
    return (
      <WebsiteSplash
        schoolId={schoolId}
        schoolName={schoolName}
        onEnter={()   => openWizard(1)}
        onOpenFeatures={() => openWizard(9)}
        onViewSite={() => setMode("viewer")}
        onDeleteSite={requestDeleteSite}
        deleting={deletingSite}
      />
    );
  }

  if (mode === "viewer") {
    return (
      <FullSiteViewer
        schoolId={schoolId}
        onBack={() => setMode("splash")}
        onEdit={() => setMode("wizard")}
      />
    );
  }

  return (
    <>
      <SchoolMiniWebsiteWizard
        schoolId={schoolId}
        schoolName={schoolName}
        initialStep={wizardInitialStep}
        onBack={() => setMode("splash")}
      />
      {showDeleteModal && (
        <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white shadow-md p-6">
            <h3 className="text-lg font-semibold text-red-700">Delete mini website</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              This action cannot be undone. To confirm, type <span className="font-semibold text-gray-900">DELETE</span> below.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              autoFocus
            />
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeleteInput(""); }}
                disabled={deletingSite}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSite}
                disabled={deletingSite || deleteInput !== "DELETE"}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deletingSite ? "Deleting..." : "Delete now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}