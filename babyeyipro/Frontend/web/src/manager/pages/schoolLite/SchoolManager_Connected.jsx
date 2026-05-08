// SchoolManager_Connected.jsx — v7.0
// ================================================================
//  ✅ Leadership: 4 fixed roles only (LEADER_ROLES)
//  ✅ Step 9 (Design): Modern template/color/sections picker
//     — Montserrat typography, amber + #1F2937 palette
//  ✅ Fully mobile-responsive throughout
// ================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  School, MapPin, Phone, User, Globe, ChevronRight, ChevronLeft,
  Plus, Trash2, Upload, Eye, Save, Send, Check, Palette, Layout, Star,
  Share2, Award, Layers, Camera, X, Info,
  Mail, ExternalLink, GraduationCap, Calendar, Target, Lightbulb,
  ArrowRight, Quote, FileText, ClipboardList, CheckCircle2, AlertCircle,
  Image, FolderOpen, Banknote, Receipt, Loader2, Newspaper, BookOpen, Sparkles, Wrench,
} from "lucide-react";

import AdmissionFormBuilder from "./AdmissionFormBuilder";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API    = `${SERVER}/api/mini-websites`;

function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith("http") || p.startsWith("blob:")) return p;
  return `${SERVER}${p.startsWith("/") ? p : "/" + p}`;
}

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <link
    href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
    rel="stylesheet"
  />
);

const syneFont  = { fontFamily: "'Montserrat', sans-serif" };
const serifFont = { fontFamily: "'Montserrat', sans-serif" };

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const EDUCATION_LEVELS = [
  "Nursery / Pre-Primary", "Primary School",
  "Secondary School (O-Level)", "Secondary School (A-Level)", "TVET",
];
const A_LEVEL_COMBOS = [
  { code: "PCM", full: "Physics, Chemistry, Mathematics" },
  { code: "PCB", full: "Physics, Chemistry, Biology" },
  { code: "MPC", full: "Mathematics, Physics, Computer Science" },
  { code: "MEG", full: "Mathematics, Economics, Geography" },
  { code: "HEG", full: "History, Economics, Geography" },
  { code: "HGL", full: "History, Geography, Literature" },
  { code: "BCG", full: "Biology, Chemistry, Geography" },
  { code: "MCB", full: "Mathematics, Chemistry, Biology" },
  { code: "CEG", full: "Computer Science, Economics, Geography" },
  { code: "LHE", full: "Literature, History, Economics" },
];
const TVET_TRADES = [
  "Construction", "ICT", "Hospitality", "Agriculture", "Automotive",
  "Electricity", "Plumbing", "Fashion & Design", "Culinary Arts", "Welding",
];
const FEE_LEVELS = [
  { id: "nursery", label: "Nursery/Pre-Primary", icon: Sparkles,      color: "#f59e0b" },
  { id: "primary", label: "Primary School",      icon: BookOpen,      color: "#3b82f6" },
  { id: "olevel",  label: "O-Level (S1–S3)",     icon: GraduationCap, color: "#8b5cf6" },
  { id: "alevel",  label: "A-Level (S4–S6)",     icon: Award,         color: "#10b981" },
  { id: "tvet",    label: "TVET",                icon: Wrench,        color: "#ef4444" },
];
const FEE_TYPES   = ["Tuition Fee","Registration Fee","Activity Fee","Transport Fee","Boarding Fee","Lunch Fee","Uniform Fee","Exam Fee","ICT Fee","Library Fee"];
const PAY_PERIODS = ["Per Term","Per Month","Per Year","One-Time"];
const formatProgramLabel = (raw) => String(raw || "")
  .replace(/^custom:/i, "")
  .replace(/[-_]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .split(" ")
  .filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join(" ");

const TEMPLATE_PREVIEWS = {
  modern:    { gradient: "from-blue-600 via-blue-500 to-indigo-700",    accent: "#60A5FA", label: "Modern Pulse",     badge: "Popular" },
  classic:   { gradient: "from-slate-800 via-slate-700 to-slate-600",   accent: "#94A3B8", label: "Classic Prestige", badge: null },
  minimal:   { gradient: "from-gray-100 via-white to-gray-200",          accent: "#374151", label: "Minimal Air",      badge: "Clean" },
  authority: { gradient: "from-green-900 via-green-800 to-emerald-700",  accent: "#6EE7B7", label: "Authority",        badge: null },
  vibrant:   { gradient: "from-orange-400 via-pink-500 to-rose-500",     accent: "#FDE68A", label: "Vibrant Life",     badge: "Bold" },
  dark:      { gradient: "from-gray-950 via-gray-900 to-zinc-800",       accent: "#FBBF24", label: "Dark Elite",       badge: "Premium" },
  nature:    { gradient: "from-emerald-700 via-teal-600 to-green-700",   accent: "#A7F3D0", label: "Green Campus",     badge: null },
  creative:  { gradient: "from-rose-500 via-orange-400 to-amber-400",    accent: "#FEF3C7", label: "Creative Studio",  badge: "Trendy" },
  tech:      { gradient: "from-cyan-700 via-blue-700 to-indigo-800",     accent: "#67E8F9", label: "Tech Academy",     badge: null },
  royal:     { gradient: "from-red-900 via-red-800 to-red-700",          accent: "#FCD34D", label: "Royal Heritage",   badge: "Elegant" },
};

const COLOR_THEMES = [
  { id: "blue",    name: "Ocean Blue",    p: "#1D4ED8", s: "#EFF6FF", a: "#FBBF24" },
  { id: "green",   name: "Forest Green",  p: "#059669", s: "#ECFDF5", a: "#FBBF24" },
  { id: "maroon",  name: "Royal Maroon",  p: "#881337", s: "#FFF1F2", a: "#D97706" },
  { id: "teal",    name: "Teal Lagoon",   p: "#0F766E", s: "#F0FDFA", a: "#F59E0B" },
  { id: "purple",  name: "Deep Purple",   p: "#6D28D9", s: "#F5F3FF", a: "#F59E0B" },
  { id: "dark",    name: "Midnight",      p: "#111827", s: "#F9FAFB", a: "#FBBF24" },
  { id: "navy",    name: "Navy Classic",  p: "#1E3A5F", s: "#EFF6FF", a: "#F97316" },
  { id: "crimson", name: "Crimson",       p: "#DC2626", s: "#FEF2F2", a: "#FCD34D" },
  { id: "orange",  name: "Sunset",        p: "#EA580C", s: "#FFF7ED", a: "#FBBF24" },
  { id: "slate",   name: "Slate Steel",   p: "#475569", s: "#F8FAFC", a: "#06B6D4" },
  { id: "pink",    name: "Rose Bloom",    p: "#DB2777", s: "#FDF2F8", a: "#FBBF24" },
  { id: "indigo",  name: "Indigo",        p: "#3730A3", s: "#EEF2FF", a: "#F59E0B" },
  { id: "custom",  name: "Custom",        p: "#1A1A1A", s: "#FFFFFF", a: "#FEBF10" },
];

const ALL_SECTIONS = [
  { id: "hero",          label: "Hero Banner",    icon: "🖼️" },
  { id: "stats",         label: "Stats Bar",      icon: "📊" },
  { id: "about",         label: "About School",   icon: "ℹ️" },
  { id: "mission",       label: "Mission & Vision", icon: "🎯" },
  { id: "programs",      label: "Programs",       icon: "📚" },
  { id: "fees",          label: "School Fees",    icon: "💰" },
  { id: "admissions",    label: "Admissions",     icon: "📋" },
  { id: "gallery",       label: "Gallery",        icon: "📷" },
  { id: "announcements", label: "Announcements",  icon: "📢" },
  { id: "news",          label: "News",           icon: "📰" },
  { id: "leadership",    label: "Leadership",     icon: "👥" },
  { id: "testimonials",  label: "Testimonials",   icon: "💬" },
  { id: "contact",       label: "Contact",        icon: "📞" },
  { id: "cta",           label: "Call to Action", icon: "🔔" },
];

const LEADER_ROLES = ["Head Teacher","Director of Study","Director of Discipline","Secretary"];

const STEPS = [
  { id: 1,  label: "Identity",    icon: School },
  { id: 2,  label: "Mission",     icon: Star },
  { id: 3,  label: "Location",    icon: MapPin },
  { id: 4,  label: "Contact",     icon: Phone },
  { id: 5,  label: "Leadership",  icon: User },
  { id: 6,  label: "Gallery",     icon: Camera },
  { id: 7,  label: "Admissions",  icon: ClipboardList },
  { id: 8,  label: "Fees",        icon: Banknote },
  { id: 9,  label: "Design",      icon: Palette },
  { id: 10, label: "Preview",     icon: Eye },
  { id: 11, label: "Publish",     icon: Send },
];
const TITLES = [
  "School Identity", "Mission, Vision & Values", "Location", "Contact Information",
  "Leadership Team", "Photo Gallery", "Admissions Setup", "School Fees",
  "Design & Templates", "Live Preview", "Publish Website",
];
const SUBS = [
  "Register your school in the system", "Tell your school's story",
  "Where is your school located?", "How can parents reach you?",
  "Meet the leadership team", "Manage events & photo albums",
  "Configure your admissions process", "Set tuition & fee structure",
  "Customize appearance & sections", "See exactly how your site looks",
  "Review and go live!",
];

// ─── SHARED UI ATOMS ─────────────────────────────────────────────────────────
const Lbl = ({ children, req }) => (
  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{req && <span className="text-amber-500 ml-1">*</span>}
  </label>
);
const Inp = ({ className = "", ...p }) => (
  <input className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder-gray-400 ${className}`} {...p} />
);
const Txta = ({ className = "", ...p }) => (
  <textarea className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder-gray-400 resize-none ${className}`} {...p} />
);
const Sel = ({ children, className = "", ...p }) => (
  <select className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all ${className}`} {...p}>{children}</select>
);

function ROField({ label, value, className = "" }) {
  if (!value && value !== 0) return null;
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50/40 text-gray-600 text-sm font-medium">
        <Info size={12} className="text-amber-400 flex-shrink-0" />
        <span className="flex-1 truncate">{String(value)}</span>
      </div>
    </div>
  );
}

function AutofillBanner() {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
      <Info size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 font-medium leading-relaxed">
        Fields marked with <Info size={9} className="inline text-amber-500 mx-0.5" /> are <strong>auto-filled from your school record</strong> and are read-only.
      </p>
    </div>
  );
}

function UBox({ label, onFile, preview, accept = "image/*", hint = "", compact = false }) {
  const r   = useRef();
  const src = preview ? imgUrl(preview) : null;
  return (
    <div>
      {label && <Lbl>{label}</Lbl>}
      <div
        onClick={() => r.current?.click()}
        className={`border-2 border-dashed border-gray-200 rounded-2xl text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all group ${compact ? "p-3" : "p-5"}`}
      >
        {src ? (
          <div className="relative inline-block">
            <img src={src} alt="" className={`${compact ? "h-12" : "h-20"} w-auto rounded-xl object-cover mx-auto`} />
            <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center">
              <Upload size={16} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-xl bg-gray-100 group-hover:bg-amber-100 flex items-center justify-center`}>
              <Upload size={compact ? 13 : 18} className="text-gray-400 group-hover:text-amber-500" />
            </div>
            <p className="text-xs font-semibold text-gray-500">Upload</p>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </div>
        )}
        <input ref={r} type="file" accept={accept} className="hidden" onChange={e => onFile?.(e.target.files[0])} />
      </div>
    </div>
  );
}

// ─── WEBSITE PREVIEW ─────────────────────────────────────────────────────────
function WebsitePreview({ form }) {
  const t      = form.template   || "modern";
  const ct     = COLOR_THEMES.find(x => x.id === (form.colorTheme || "blue")) || COLOR_THEMES[0];
  const P      = form.customColors?.primary   || ct.p;
  const S      = form.customColors?.secondary || ct.s;
  const A      = form.customColors?.accent    || ct.a;
  const secs   = form.sections || ALL_SECTIONS.map(s => s.id);
  const nm     = form.name || "Your School";
  const isDk   = ["dark","tech","royal","classic","nature"].includes(t);
  const logoSrc  = imgUrl(form.logoPreview);
  const coverSrc = imgUrl(form.coverPreview);
  const aboutSrc = imgUrl(form.aboutPreview);

  const heroSty = () => {
    if (t === "minimal") return { background: "#fff", borderBottom: `4px solid ${P}` };
    return { background: `linear-gradient(135deg,${P},${P}cc)` };
  };
  const HTC = t === "minimal" ? P : "#fff";

  return (
    <div className="w-full bg-white text-sm" style={{ fontFamily: "system-ui,sans-serif" }}>
      <nav style={{ background: t === "minimal" ? "#fff" : P }} className="px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {logoSrc
            ? <img src={logoSrc} className="h-8 w-8 rounded-full object-cover border-2 border-white/30" alt="logo" />
            : <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: t === "minimal" ? P : A, color: t === "minimal" ? "#fff" : "#000" }}>{nm[0]}</div>}
          <span className="font-semibold text-sm" style={{ color: t === "minimal" ? P : "#fff" }}>{nm}</span>
        </div>
        <button className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: t === "minimal" ? P : A, color: t === "minimal" ? "#fff" : "#000" }}>Apply Now</button>
      </nav>

      {secs.includes("hero") && (
        <div style={{ ...heroSty(), minHeight: 240, position: "relative", overflow: "hidden" }} className="flex items-center px-6 py-10">
          {coverSrc && <img src={coverSrc} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <div className="relative flex-1 max-w-lg">
            <h1 className="font-semibold mb-3 leading-tight text-2xl" style={{ color: HTC }}>{nm}</h1>
            <p className="text-sm mb-5 opacity-90" style={{ color: t === "minimal" ? "#555" : "rgba(255,255,255,.85)" }}>
              {form.vision || "Shaping tomorrow's leaders with excellence."}
            </p>
            <button className="px-5 py-2.5 rounded-full text-xs font-bold shadow" style={{ background: t === "minimal" ? P : A, color: t === "minimal" ? "#fff" : "#000" }}>Learn More →</button>
          </div>
        </div>
      )}

      {secs.includes("about") && (
        <div style={{ background: isDk ? "#1a1a1a" : "#fff" }} className="px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6 items-center max-w-3xl mx-auto">
            <div>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: A }}>ABOUT US</div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: isDk ? "#fff" : P }}>Who We Are</h2>
              <p className="text-gray-500 text-xs leading-relaxed mb-3">{form.mission || "We are dedicated to nurturing the next generation."}</p>
              <div className="flex flex-wrap gap-2">
                {(form.coreValues || []).map(v => (
                  <span key={v} className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${P}15`, color: P }}>{v}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-video" style={{ background: `${P}10` }}>
              {aboutSrc
                ? <img src={aboutSrc} className="w-full h-full object-cover" alt="about" />
                : <div className="w-full h-full flex items-center justify-center"><School size={36} style={{ color: `${P}40` }} /></div>}
            </div>
          </div>
        </div>
      )}

      {secs.includes("contact") && (
        <div style={{ background: P }} className="px-6 py-8">
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[[Phone,"Phone",form.phone||"+250 788 000 000"],[Mail,"Email",form.email||"info@school.ac.rw"],[MapPin,"Location",form.district?`${form.district}, ${form.province}`:"Rwanda"]].map(([Icon,label,val]) => (
              <div key={label} className="text-center">
                <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white/20"><Icon size={14} className="text-white" /></div>
                <div className="text-white/60 text-xs">{label}</div>
                <div className="text-white font-bold text-xs">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-4 bg-gray-900 text-center">
        <div className="text-white font-semibold text-sm">{nm}</div>
        <div className="text-gray-500 text-xs mt-1">© {new Date().getFullYear()} · Powered by <span style={{ color: A }}>babyeyi.rw</span></div>
      </div>
    </div>
  );
}

// ─── STEP 1 ──────────────────────────────────────────────────────────────────
function S1Connected({ form, set }) {
  const tglC = c => {
    const cur = form.aLevelCombinations || [];
    const ex  = cur.find(x => x.code === c.code);
    set(f => ({ ...f, aLevelCombinations: ex ? f.aLevelCombinations.filter(x => x.code !== c.code) : [...cur, c] }));
  };
  const tglT = t => {
    const cur = form.tvetTrades || [];
    set(f => ({ ...f, tvetTrades: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] }));
  };

  const hasA = (form.educationLevels || []).includes("Secondary School (A-Level)");
  const hasT = (form.educationLevels || []).includes("TVET");
  const logoSrc = imgUrl(form.logoPreview);

  const builtInACodes  = new Set(A_LEVEL_COMBOS.map(x => String(x.code).toUpperCase()));
  const builtInTTrades = new Set(TVET_TRADES.map(x => String(x)));

  const customCombos = (form.aLevelCombinations || [])
    .filter(c => c)
    .map(c => (typeof c === "string" ? { code: String(c).toUpperCase(), full: "" } : c))
    .filter(c => { const code = String(c.code || "").toUpperCase(); return code && !builtInACodes.has(code); });
  const customTrades = (form.tvetTrades || []).filter(t => t && !builtInTTrades.has(String(t)));

  const [newACode,  setNewACode]  = useState("");
  const [newAFull,  setNewAFull]  = useState("");
  const [newTrade,  setNewTrade]  = useState("");
  const [intlTab,   setIntlTab]   = useState("primary");
  const [intlInput, setIntlInput] = useState("");

  return (
    <div className="space-y-5">
      <AutofillBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ROField label="School Name" value={form.name} />
        <ROField label="School Code" value={form.code} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ROField label="Category"    value={form.category} />
        <ROField label="Ownership"   value={form.ownership} />
        <ROField label="Year Founded" value={form.founded} />
      </div>

      {(form.educationLevels || []).length > 0 && (
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Education Levels</label>
          <div className="flex flex-wrap gap-2">
            {(form.educationLevels || []).map(l => (
              <span key={l} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                <Check size={10} className="text-amber-500" /> {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasA && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3"><Award size={14} className="text-purple-600" /><h4 className="font-bold text-purple-900 text-xs">A-Level Combinations</h4></div>
          <div className="flex flex-wrap gap-2 mb-4">
            {A_LEVEL_COMBOS.map(c => {
              const sel = (form.aLevelCombinations || []).find(x => x.code === c.code);
              return (
                <button key={c.code} type="button" onClick={() => tglC(c)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all ${sel ? "bg-purple-600 border-purple-600 text-white" : "border-purple-200 text-purple-600 hover:border-purple-400"}`}>
                  {c.code}
                </button>
              );
            })}
          </div>
          <div className="border-t border-purple-100 pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Inp value={newACode} onChange={e => setNewACode(e.target.value)} placeholder="Custom code (e.g. HCG)" />
              <Inp value={newAFull} onChange={e => setNewAFull(e.target.value)} placeholder="Full name (e.g. History, Chemistry, Geography)" />
            </div>
            <button type="button"
              onClick={() => {
                const code = String(newACode).trim().toUpperCase();
                const full = String(newAFull).trim();
                if (!code || !full) return;
                set(f => {
                  const cur    = f.aLevelCombinations || [];
                  const exists = cur.find(x => String((x && x.code) || "").toUpperCase() === code);
                  return { ...f, aLevelCombinations: exists ? cur.map(x => (String((x && x.code) || "").toUpperCase() === code ? { ...x, code, full } : x)) : [...cur, { code, full }] };
                });
                setNewACode(""); setNewAFull("");
              }}
              className="w-full px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition-colors">
              + Add Custom A-Level Combination
            </button>
            {customCombos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {customCombos.map(c => (
                  <span key={c.code} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border" style={{ background: "#fff", borderColor: "#e9d5ff", color: "#6d28d9" }}>
                    {c.code}
                    <button type="button" onClick={() => { const code = String(c.code).toUpperCase(); set(f => ({ ...f, aLevelCombinations: (f.aLevelCombinations || []).filter(x => String((x && x.code) || "").toUpperCase() !== code) })); }} className="text-purple-700 hover:text-purple-900 bg-purple-50 rounded-lg px-2 py-0.5">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {hasT && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3"><Layers size={14} className="text-orange-600" /><h4 className="font-bold text-orange-900 text-xs">TVET Trades</h4></div>
          <div className="flex flex-wrap gap-2 mb-4">
            {TVET_TRADES.map(t => {
              const sel = (form.tvetTrades || []).includes(t);
              return (
                <button key={t} type="button" onClick={() => tglT(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all ${sel ? "bg-orange-500 border-orange-500 text-white" : "border-orange-200 text-orange-600 hover:border-orange-400"}`}>
                  {t}
                </button>
              );
            })}
          </div>
          <div className="border-t border-orange-100 pt-4 space-y-3">
            <div className="flex gap-3">
              <Inp value={newTrade} onChange={e => setNewTrade(e.target.value)} placeholder="Custom trade (e.g. Robotics)" />
              <button type="button"
                onClick={() => { const t = String(newTrade).trim(); if (!t) return; set(f => ({ ...f, tvetTrades: Array.from(new Set([...(f.tvetTrades || []), t])) })); setNewTrade(""); }}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white font-semibold text-xs hover:bg-orange-400 transition-colors">
                Add
              </button>
            </div>
            {customTrades.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customTrades.map(t => (
                  <span key={t} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border" style={{ background: "#fff", borderColor: "#fed7aa", color: "#c2410c" }}>
                    {t}
                    <button type="button" onClick={() => set(f => ({ ...f, tvetTrades: (f.tvetTrades || []).filter(x => x !== t) }))} className="text-orange-800 hover:text-orange-950 bg-orange-50 rounded-lg px-2 py-0.5">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* International programs */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3"><Globe size={16} className="text-slate-700" /><h4 className="font-bold text-slate-800 text-xs">International Students (Other Programs)</h4></div>
        <div className="flex gap-2 mb-3">
          {["primary","other"].map(tab => (
            <button key={tab} type="button" onClick={() => setIntlTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize ${intlTab === tab ? (tab === "primary" ? "bg-emerald-500 text-white border-emerald-500" : "bg-amber-500 text-white border-amber-500") : (tab === "primary" ? "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400" : "bg-white text-amber-800 border-amber-200 hover:border-amber-400")}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Inp value={intlInput} onChange={e => setIntlInput(e.target.value)} placeholder={intlTab === "primary" ? "Add International Primary program" : "Add International Other program"} />
          <button type="button"
            onClick={() => {
              const v = String(intlInput).trim(); if (!v) return;
              const key = intlTab === "primary" ? "internationalPrimaryPrograms" : "internationalOtherPrograms";
              set(f => ({ ...f, [key]: Array.from(new Set([...(f[key] || []), v])) }));
              setIntlInput("");
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors">
            Add
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(() => {
            const key  = intlTab === "primary" ? "internationalPrimaryPrograms" : "internationalOtherPrograms";
            const items = form[key] || [];
            return items.length === 0
              ? <p className="text-xs text-gray-500">No items yet.</p>
              : items.map(x => (
                <span key={x} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border" style={{ background: "#fff", borderColor: "#e5e7eb", color: "#111827" }}>
                  {x}
                  <button type="button" onClick={() => set(f => ({ ...f, [key]: (f[key] || []).filter(i => i !== x) }))} className="text-gray-700 hover:text-gray-950 bg-gray-100 rounded-lg px-2 py-0.5">✕</button>
                </span>
              ));
          })()}
        </div>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">School Logo</label>
          <div className="border-2 border-dashed border-amber-100 rounded-2xl p-4 flex items-center justify-center bg-amber-50/30 min-h-[100px]">
            {logoSrc
              ? <img src={logoSrc} alt="logo" className="h-16 w-auto rounded-xl object-cover" />
              : <span className="text-xs text-gray-400 font-medium text-center">Set in school profile</span>}
          </div>
        </div>
        <UBox label="Cover / Hero Image" hint="Wide banner" preview={form.coverPreview} onFile={f => { const u = URL.createObjectURL(f); set(x => ({ ...x, cover: f, coverPreview: u })); }} />
        <UBox label="About Section Image" hint="Campus / building" preview={form.aboutPreview} onFile={f => { const u = URL.createObjectURL(f); set(x => ({ ...x, aboutImage: f, aboutPreview: u })); }} />
      </div>
    </div>
  );
}

// ─── STEP 2 ──────────────────────────────────────────────────────────────────
function S2({ form, set }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-5">
      <div>
        <Lbl>School Background</Lbl>
        <Txta rows={4} value={form.background || ""} onChange={e => set(f => ({ ...f, background: e.target.value }))} placeholder="Brief history and context of the school…" />
      </div>
      <div>
        <Lbl req>School Mission</Lbl>
        <Txta rows={3} value={form.mission || ""} onChange={e => set(f => ({ ...f, mission: e.target.value }))} placeholder="To nurture a community of caring, inquisitive learners…" />
      </div>
      <div>
        <Lbl req>School Vision</Lbl>
        <Txta rows={3} value={form.vision || ""} onChange={e => set(f => ({ ...f, vision: e.target.value }))} placeholder="To be Rwanda's leading institution…" />
      </div>
      <div>
        <Lbl>Core Values</Lbl>
        <div className="flex gap-2 mb-3">
          <Inp value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && val.trim()) { set(f => ({ ...f, coreValues: [...(f.coreValues || []), val.trim()] })); setVal(""); } }} placeholder="e.g. Integrity…" />
          <button type="button" onClick={() => { if (!val.trim()) return; set(f => ({ ...f, coreValues: [...(f.coreValues || []), val.trim()] })); setVal(""); }} className="px-4 py-2 rounded-xl bg-amber-400 text-gray-900 font-bold hover:bg-amber-300 transition-colors"><Plus size={16} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(form.coreValues || []).map((v, i) => (
            <span key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-bold">
              {v}
              <button onClick={() => set(f => ({ ...f, coreValues: f.coreValues.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-white"><X size={10} /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3 ──────────────────────────────────────────────────────────────────
function S3Connected({ form }) {
  return (
    <div className="space-y-5">
      <AutofillBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ROField label="Province" value={form.province} />
        <ROField label="District" value={form.district} />
        <ROField label="Sector"   value={form.sector} />
        <ROField label="Cell"     value={form.cell} />
        <ROField label="Village"  value={form.village} />
      </div>
      <ROField label="Full Address" value={form.address} />
    </div>
  );
}

// ─── STEP 4 ──────────────────────────────────────────────────────────────────
function S4ConnectedFixed({ form, set }) {
  return (
    <div className="space-y-5">
      <AutofillBanner />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ROField label="Phone"          value={form.phone} />
        <ROField label="Email"          value={form.email} />
        <ROField label="Postal Address" value={form.postalAddress} />
        <ROField label="Website"        value={form.website} />
      </div>
      <div className="pt-2 border-t border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Social Media <span className="text-amber-500 font-normal normal-case">(editable)</span>
        </h4>
        <div className="space-y-3">
          {[
            { icon: <Share2 size={14} className="text-blue-500 flex-shrink-0" />, key: "facebook", placeholder: "https://facebook.com/yourschool" },
            { icon: <Share2 size={14} className="text-sky-500  flex-shrink-0" />, key: "twitter",  placeholder: "https://twitter.com/yourschool" },
            { icon: <Share2 size={14} className="text-pink-500 flex-shrink-0" />, key: "instagram", placeholder: "https://instagram.com/yourschool" },
          ].map(({ icon, key, placeholder }) => (
            <div key={key}>
              <Lbl>{key.charAt(0).toUpperCase() + key.slice(1)}{key === "twitter" ? " / X" : ""}</Lbl>
              <div className="flex items-center gap-2">{icon}<Inp value={form[key] || ""} onChange={e => set(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 5 — LEADERSHIP ─────────────────────────────────────────────────────
function S5Connected({ form, set }) {
  const leaders = Array.isArray(form.leaders) ? form.leaders : [];
  const updL = (idx, k, v) => set(f => ({ ...f, leaders: (f.leaders || []).map((l, i) => i === idx ? { ...l, [k]: v } : l) }));
  const delL = (idx) => set(f => ({ ...f, leaders: (f.leaders || []).filter((_, i) => i !== idx) }));
  const addL = () => {
    set(f => {
      const cur = Array.isArray(f.leaders) ? f.leaders : [];
      const nextId = `leader-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const unusedRole = LEADER_ROLES.find((r) => !cur.some((x) => String(x.role || '').trim().toLowerCase() === r.toLowerCase())) || "";
      return {
        ...f,
        leaders: [...cur, { id: nextId, name: "", role: unusedRole, phone: "", email: "", photoPreview: null, photoFile: null }],
      };
    });
  };
  const usedRoles = leaders.map(l => String(l.role || "").trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      <AutofillBanner />
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 bg-gradient-to-r from-gray-900 to-gray-800 flex items-start justify-between gap-3">
          <div>
            <h4 className="text-white font-semibold text-sm">Leadership Team</h4>
            <p className="text-gray-400 text-xs mt-0.5">Optional: add none, one, or more leaders.</p>
          </div>
          <button
            type="button"
            onClick={addL}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-bold hover:bg-white/10 transition-colors"
          >
            <Plus size={12} className="text-amber-400" /> Add Leader
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {leaders.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
              <User size={26} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-400">No leaders added</p>
              <button
                type="button"
                onClick={addL}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-gray-900 font-bold text-xs hover:bg-amber-300 transition-colors"
              >
                <Plus size={12} /> Add First Leader
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {leaders.map((l, idx) => {
              const photoSrc = l.photoFile ? URL.createObjectURL(l.photoFile) : imgUrl(l.photoPreview);
              return (
                <div key={l.id || idx} className="border-2 border-gray-100 rounded-3xl p-4 hover:border-amber-200 transition-colors bg-white">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Lbl req>Photo</Lbl>
                      <label className="block cursor-pointer">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 group hover:border-amber-400 transition-all bg-gray-50">
                          {photoSrc ? (
                            <>
                              <img src={photoSrc} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                                <Upload size={14} className="text-white" />
                                <span className="text-white text-[9px] font-bold">Change</span>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 group-hover:bg-amber-50 transition-colors">
                              <User size={22} className="text-gray-300 group-hover:text-amber-400 transition-colors" />
                              <span className="text-[9px] text-gray-400 group-hover:text-amber-500 font-bold">Upload</span>
                            </div>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) updL(idx, "photoFile", file); e.target.value = ""; }} />
                        <div className="text-[10px] text-gray-500 font-bold text-center mt-1 cursor-pointer hover:text-amber-600 transition-colors">Upload</div>
                      </label>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-gray-500">Leader {idx + 1}</div>
                        <button
                          type="button"
                          onClick={() => delL(idx)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center"
                          title="Remove leader"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><Lbl>Full Name</Lbl><Inp value={l.name || ""} onChange={e => updL(idx, "name", e.target.value)} placeholder="Leader name" /></div>
                        <div>
                          <Lbl>Role</Lbl>
                          <Sel value={l.role || ""} onChange={e => updL(idx, "role", e.target.value)}>
                            <option value="">Select role…</option>
                            {LEADER_ROLES.map(r => { const takenByOther = usedRoles.includes(r) && r !== l.role; return <option key={r} value={r} disabled={takenByOther}>{r}{takenByOther ? " (used)" : ""}</option>; })}
                          </Sel>
                        </div>
                        <div><Lbl>Phone</Lbl><Inp value={l.phone || ""} onChange={e => updL(idx, "phone", e.target.value)} placeholder="+250 7xx xxx xxx" /></div>
                        <div><Lbl>Email</Lbl><Inp type="email" value={l.email || ""} onChange={e => updL(idx, "email", e.target.value)} placeholder="name@school.ac.rw" /></div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="truncate">{l.role || "Select a role"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {leaders.length > 0 && (
            <button
              type="button"
              onClick={addL}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs hover:bg-amber-100 transition-colors"
            >
              <Plus size={12} /> Add Another Leader
            </button>
          )}
        </div>
      </div>
      <UBox label="Mission / Vision Section Image" hint="Inspirational photo" preview={form.missionPreview} onFile={f => { const u = URL.createObjectURL(f); set(x => ({ ...x, missionImage: f, missionPreview: u })); }} />
    </div>
  );
}

// ─── STEP 6 — GALLERY ────────────────────────────────────────────────────────
function S6({ form, set, schoolId }) {
  const albums    = form.albums || [];
  const [na,      setNa]      = useState({ title: "", date: "", description: "", category: "Event" });
  const [active,  setActive]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const fRef = useRef();
  const CATS = ["Event","Academic","Sports","Cultural","Graduation","Field Trip","Other"];

  const create = () => {
    if (!na.title.trim()) return;
    const id = Date.now();
    set(f => ({ ...f, albums: [...(f.albums || []), { ...na, id, images: [] }] }));
    setActive(id);
    setNa({ title: "", date: "", description: "", category: "Event" });
  };
  const delAlbum = id => { set(f => ({ ...f, albums: f.albums.filter(a => a.id !== id) })); if (active === id) setActive(null); };

  const addImgs = async (e, aid) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const blobUrl = URL.createObjectURL(file);
      set(f => ({ ...f, albums: f.albums.map(a => a.id === aid ? { ...a, images: [...a.images, { id: Date.now() + Math.random(), url: blobUrl, caption: "", _file: file }] } : a) }));
    });
    if (schoolId) {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("albumId", String(aid)); fd.append("schoolId", String(schoolId));
        files.forEach(f => fd.append("images", f));
        const r = await fetch(`${API}/gallery-images`, { method: "POST", body: fd, credentials: "include" });
        if (r.ok) {
          const { data: uploaded } = await r.json();
          set(f => ({ ...f, albums: f.albums.map(a => { if (a.id !== aid) return a; let uploadIdx = 0; return { ...a, images: a.images.map(img => { if (img._file && uploadIdx < uploaded.length) { const real = uploaded[uploadIdx++]; return { id: real.id, url: real.url, caption: img.caption || "" }; } return img; }) }; }) }));
        }
      } catch {} finally { setUploading(false); }
    }
  };

  const delImg  = (aid, iid) => set(f => ({ ...f, albums: f.albums.map(a => a.id === aid ? { ...a, images: a.images.filter(i => i.id !== iid) } : a) }));
  const updCap  = (aid, iid, cap) => set(f => ({ ...f, albums: f.albums.map(a => a.id === aid ? { ...a, images: a.images.map(i => i.id === iid ? { ...i, caption: cap } : i) } : a) }));
  const ad = albums.find(a => a.id === active);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-4"><FolderOpen size={15} className="text-amber-500" /> Create New Album</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div><Lbl>Album Title</Lbl><Inp value={na.title} onChange={e => setNa(a => ({ ...a, title: e.target.value }))} placeholder="e.g. Sports Day 2025" /></div>
          <div><Lbl>Event Date</Lbl><Inp type="date" value={na.date} onChange={e => setNa(a => ({ ...a, date: e.target.value }))} /></div>
          <div><Lbl>Category</Lbl><Sel value={na.category} onChange={e => setNa(a => ({ ...a, category: e.target.value }))}>{CATS.map(c => <option key={c}>{c}</option>)}</Sel></div>
          <div><Lbl>Description</Lbl><Inp value={na.description} onChange={e => setNa(a => ({ ...a, description: e.target.value }))} placeholder="Short description…" /></div>
        </div>
        <button type="button" onClick={create} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-gray-900 font-bold text-sm hover:bg-amber-300 transition-colors">
          <Plus size={14} /> Create Album
        </button>
      </div>

      {albums.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
          <Camera size={28} className="mx-auto text-gray-300 mb-2" /><p className="text-sm font-bold text-gray-400">No albums yet</p>
        </div>
      )}

      {albums.length > 0 && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {albums.map(a => (
              <button key={a.id} onClick={() => setActive(a.id === active ? null : a.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${active === a.id ? "border-amber-400 bg-amber-50 text-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                <FolderOpen size={11} />{a.title}
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full" style={{ fontSize: "9px" }}>{a.images?.length || 0}</span>
                <button onClick={e => { e.stopPropagation(); delAlbum(a.id); }} className="ml-0.5 text-red-400 hover:text-red-600"><X size={10} /></button>
              </button>
            ))}
          </div>

          {ad && (
            <div className="border-2 border-amber-200 rounded-2xl p-4 bg-amber-50/20">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{ad.title}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {ad.date && <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={9} />{ad.date}</span>}
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{ad.category}</span>
                    <span className="text-xs text-gray-500">{ad.images?.length || 0} photos</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploading && <Loader2 size={14} className="text-amber-500 animate-spin" />}
                  <button onClick={() => fRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors">
                    <Upload size={12} /> Add Photos
                  </button>
                  <input ref={fRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addImgs(e, active)} />
                </div>
              </div>
              {ad.images?.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-amber-200 rounded-xl">
                  <Image size={22} className="mx-auto text-amber-300 mb-2" /><p className="text-xs text-gray-500">Click "Add Photos" to upload images</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {ad.images.map(img => {
                    const src         = img._file ? URL.createObjectURL(img._file) : imgUrl(img.url);
                    const isPersisted = img.url && !img.url.startsWith("blob:") && !img._file;
                    return (
                      <div key={img.id} className="relative group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                          {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image size={20} className="text-gray-300" /></div>}
                        </div>
                        {isPersisted && <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow"><Check size={8} className="text-white" /></div>}
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => delImg(active, img.id)} className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow"><X size={10} className="text-white" /></button>
                        </div>
                        <Inp className="mt-1.5 py-1 text-xs" value={img.caption || ""} onChange={e => updCap(active, img.id, e.target.value)} placeholder="Caption…" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STEP 7 — ADMISSIONS ─────────────────────────────────────────────────────
function S7({ schoolId, onNext, onBack }) {
  return (
    <AdmissionFormBuilder
      schoolId={schoolId}
      onNext={onNext}
      onBack={onBack}
      toast={(msg, type) => { if (type === "error") console.error("[AdmissionFormBuilder]", msg); else console.log("[AdmissionFormBuilder]", msg); }}
    />
  );
}

// ─── STEP 8 — FEES ───────────────────────────────────────────────────────────
function S8({ form, set }) {
  const fees = form.fees || {};
  const [aL, setAL] = useState(null);
  const [newProgramName, setNewProgramName] = useState("");
  const enabled = FEE_LEVELS.filter(fl => {
    if (fl.id === "nursery") return (form.educationLevels || []).includes("Nursery / Pre-Primary");
    if (fl.id === "primary") return (form.educationLevels || []).includes("Primary School");
    if (fl.id === "olevel")  return (form.educationLevels || []).includes("Secondary School (O-Level)");
    if (fl.id === "alevel")  return (form.educationLevels || []).includes("Secondary School (A-Level)");
    if (fl.id === "tvet")    return (form.educationLevels || []).includes("TVET");
    return false;
  });
  const customPrograms = Object.keys(fees)
    .filter((k) => !FEE_LEVELS.some((fl) => fl.id === k))
    .map((k) => ({
      id: k,
      label: formatProgramLabel(fees[k]?.label || k),
      icon: Banknote,
      color: "#0f766e",
      isCustom: true,
    }));
  const display = [...(enabled.length > 0 ? enabled : FEE_LEVELS), ...customPrograms];
  const init  = (id) => {
    if (!fees[id]) {
      set(f => ({ ...f, fees: { ...(f.fees || {}), [id]: { label: id.startsWith("custom:") ? id.replace(/^custom:/, "") : undefined, currency: "RWF", items: [{ type: "Tuition Fee", amount: "", period: "Per Term" }], notes: "" } } }));
    }
    setAL(id);
  };
  const updF  = (l, k, v) => set(f => ({ ...f, fees: { ...f.fees, [l]: { ...f.fees[l], [k]: v } } }));
  const addI  = l => set(f => ({ ...f, fees: { ...f.fees, [l]: { ...f.fees[l], items: [...f.fees[l].items, { type: "", amount: "", period: "Per Term" }] } } }));
  const delI  = (l, i) => set(f => ({ ...f, fees: { ...f.fees, [l]: { ...f.fees[l], items: f.fees[l].items.filter((_, j) => j !== i) } } }));
  const updI  = (l, i, k, v) => set(f => ({ ...f, fees: { ...f.fees, [l]: { ...f.fees[l], items: f.fees[l].items.map((x, j) => j === i ? { ...x, [k]: v } : x) } } }));
  const total = l => (fees[l]?.items || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);
  const addCustomProgram = () => {
    const raw = String(newProgramName || "").trim();
    if (!raw) return;
    const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `program-${Date.now()}`;
    let id = `custom:${slug}`;
    if (fees[id]) id = `custom:${slug}-${Date.now()}`;
    set(f => ({
      ...f,
      fees: {
        ...(f.fees || {}),
        [id]: { label: raw, currency: "RWF", items: [{ type: "Tuition Fee", amount: "", period: "Per Term" }], notes: "" },
      },
    }));
    setAL(id);
    setNewProgramName("");
  };
  const removeCustomProgram = (id) => {
    set(f => {
      const nextFees = { ...(f.fees || {}) };
      delete nextFees[id];
      return { ...f, fees: nextFees };
    });
    if (aL === id) setAL(null);
  };

  return (
    <div className="space-y-5">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
        <Receipt size={15} className="text-green-600 mt-0.5 flex-shrink-0" />
        <div><p className="text-sm font-bold text-green-900">Set Your Fee Structure</p><p className="text-xs text-green-700 mt-0.5">Configure fees for each education level.</p></div>
      </div>
      <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-3.5">
        <p className="text-xs font-bold text-amber-900 mb-2">Add Another Program</p>
        <div className="flex gap-2">
          <Inp
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
            placeholder="e.g. Associate Nursing Program"
            className="py-2 text-xs"
          />
          <button
            type="button"
            onClick={addCustomProgram}
            className="px-3 py-2 rounded-xl bg-amber-400 text-gray-900 text-xs font-semibold hover:bg-amber-300 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {display.map(fl => { const has = fees[fl.id]?.items?.length > 0; const isA = aL === fl.id; return (
          <button key={fl.id} type="button" onClick={() => init(fl.id)} className={`p-3 rounded-2xl border-2 text-center transition-all ${isA ? "border-amber-400 bg-amber-50 shadow-md" : has ? "border-green-300 bg-green-50" : "border-gray-100 hover:border-gray-300"}`}>
            <div className="w-8 h-8 mx-auto mb-1 rounded-xl flex items-center justify-center" style={{ background: "rgba(31,41,55,0.08)", color: fl.color }}>
              <fl.icon size={16} />
            </div>
            <div className="text-xs font-bold leading-tight" style={{ color: isA ? "#111" : has ? "#166534" : "#6b7280", fontSize: "10px" }}>{fl.label}</div>
            {has && !isA && <Check size={10} className="text-green-500 mx-auto mt-1" />}
          </button>
        ); })}
      </div>
      {aL && fees[aL] && (() => {
        const fl = display.find(f => f.id === aL) || { id: aL, label: formatProgramLabel(fees[aL]?.label || aL), icon: Banknote, color: "#0f766e", isCustom: String(aL).startsWith("custom:") };
        const data = fees[aL];
        return (
          <div className="border-2 border-amber-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: `${fl.color}10` }}>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(31,41,55,0.08)", color: fl.color }}><fl.icon size={16} /></span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{data.label || fl.label}</h4>
                  <p className="text-xs text-gray-500">Total: <span className="font-bold" style={{ color: fl.color }}>{data.currency} {total(aL).toLocaleString()}/term</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Currency:</span>
                <Sel className="w-24 py-1.5 text-xs" value={data.currency || "RWF"} onChange={e => updF(aL, "currency", e.target.value)}><option>RWF</option><option>USD</option><option>EUR</option></Sel>
                {fl.isCustom && (
                  <button
                    type="button"
                    onClick={() => removeCustomProgram(aL)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                    title="Remove custom program"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-12 gap-2 px-1">
                {["Fee Type","Amount","Period",""].map((h, i) => <div key={i} className={`col-span-${[5,3,3,1][i]} text-xs font-bold text-gray-400 uppercase tracking-wide`}>{h}</div>)}
              </div>
              {data.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5"><Sel value={item.type} onChange={e => updI(aL, i, "type", e.target.value)} className="py-2 text-xs"><option value="">Select…</option>{FEE_TYPES.map(t => <option key={t}>{t}</option>)}</Sel></div>
                  <div className="col-span-3"><Inp type="number" value={item.amount} onChange={e => updI(aL, i, "amount", e.target.value)} placeholder="0" className="py-2 text-xs" /></div>
                  <div className="col-span-3"><Sel value={item.period} onChange={e => updI(aL, i, "period", e.target.value)} className="py-2 text-xs">{PAY_PERIODS.map(p => <option key={p}>{p}</option>)}</Sel></div>
                  <div className="col-span-1 flex justify-center"><button onClick={() => delI(aL, i)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><Trash2 size={11} /></button></div>
                </div>
              ))}
              <button type="button" onClick={() => addI(aL)} className="flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-800 pt-1"><Plus size={12} />Add Fee Item</button>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs font-bold text-gray-600">Total / Term</span>
                <span className="text-sm font-semibold" style={{ color: fl.color }}>{data.currency} {total(aL).toLocaleString()}</span>
              </div>
              <div className="pt-2"><Lbl>Notes</Lbl><Txta rows={2} value={data.notes || ""} onChange={e => updF(aL, "notes", e.target.value)} placeholder="e.g. 10% discount for siblings…" /></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── STEP 9 — DESIGN (MODERN) ────────────────────────────────────────────────
function S9({ form, set }) {
  const [cc, setCC]           = useState(form.customColors || { primary: "#1D4ED8", secondary: "#EFF6FF", accent: "#FBBF24" });
  const [activeTab, setActiveTab] = useState("template");

  const selectedTemplate = form.template   || "modern";
  const selectedTheme    = form.colorTheme || "blue";

  const tabs = [
    { id: "template", label: "Template", icon: <Layout  size={14} /> },
    { id: "color",    label: "Colors",   icon: <Palette size={14} /> },
    { id: "sections", label: "Sections", icon: <Layers  size={14} /> },
    { id: "news",     label: "News",     icon: <Newspaper size={14} /> },
  ];

  return (
    <div style={syneFont}>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: "#F3F4F6" }}>
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200"
            style={{ background: activeTab === t.id ? "#1F2937" : "transparent", color: activeTab === t.id ? "#FBBF24" : "#6B7280", ...syneFont }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TEMPLATES ── */}
      {activeTab === "template" && (
        <div>
          <div className="mb-5">
            <h3 className="font-semibold text-[#1F2937] text-base mb-1" style={serifFont}>
              Choose Your <em style={{ color: "#FBBF24" }}>Template</em>
            </h3>
            <p className="text-xs text-gray-400" style={syneFont}>Select the visual style for your school website</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(TEMPLATE_PREVIEWS).map(([id, meta]) => {
              const isSelected = selectedTemplate === id;
              return (
                <button key={id} type="button" onClick={() => set(f => ({ ...f, template: id }))}
                  className="group relative rounded-2xl overflow-hidden border-2 transition-all duration-200 text-left"
                  style={{ borderColor: isSelected ? "#FBBF24" : "#E5E7EB", boxShadow: isSelected ? "0 8px 24px rgba(251,191,36,0.25)" : "0 1px 4px rgba(0,0,0,0.06)", transform: isSelected ? "scale(1.02)" : "scale(1)" }}>

                  {/* Preview swatch */}
                  <div className={`h-20 sm:h-24 bg-gradient-to-br ${meta.gradient} relative overflow-hidden`}>
                    {/* Fake nav */}
                    <div className="absolute top-0 left-0 right-0 h-5 bg-black/30 flex items-center px-2 gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <div className="flex-1 h-1 rounded-full bg-white/20" />
                    </div>
                    {/* Fake content */}
                    <div className="absolute bottom-3 left-2 right-2 space-y-1">
                      <div className="h-2 rounded-full bg-white/60 w-3/4" />
                      <div className="h-1.5 rounded-full bg-white/35 w-1/2" />
                    </div>
                    {/* Accent dot */}
                    <div className="absolute top-8 right-2 w-5 h-5 rounded-lg" style={{ background: meta.accent }} />
                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ background: "#FBBF24" }}>
                          <Check size={14} color="#1F2937" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                    {/* Badge */}
                    {meta.badge && (
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ background: "#FBBF24", color: "#1F2937" }}>
                        {meta.badge}
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="px-2.5 py-2" style={{ background: isSelected ? "#1F2937" : "white" }}>
                    <div className="text-xs font-semibold leading-tight" style={{ color: isSelected ? "#FBBF24" : "#1F2937", ...syneFont }}>{meta.label}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTemplate && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FBBF24" }}>
                <Eye size={14} color="#1F2937" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#1F2937]" style={syneFont}>{TEMPLATE_PREVIEWS[selectedTemplate]?.label || selectedTemplate}</div>
                <div className="text-[10px] text-gray-400" style={syneFont}>Active template</div>
              </div>
              <div className="ml-auto">
                <div className={`h-12 w-20 rounded-xl bg-gradient-to-br ${TEMPLATE_PREVIEWS[selectedTemplate]?.gradient || "from-blue-600 to-blue-800"} opacity-80`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COLORS ── */}
      {activeTab === "color" && (
        <div>
          <div className="mb-5">
            <h3 className="font-semibold text-[#1F2937] text-base mb-1" style={serifFont}>
              Pick Your <em style={{ color: "#FBBF24" }}>Color Theme</em>
            </h3>
            <p className="text-xs text-gray-400" style={syneFont}>Colors define your school's identity</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mb-5">
            {COLOR_THEMES.map(t => {
              const isSelected = selectedTheme === t.id;
              return (
                <button key={t.id} type="button" onClick={() => set(f => ({ ...f, colorTheme: t.id }))}
                  className="p-2.5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2"
                  style={{ borderColor: isSelected ? "#FBBF24" : "#E5E7EB", background: isSelected ? "#1F2937" : "white", boxShadow: isSelected ? "0 4px 16px rgba(251,191,36,0.2)" : "none" }}>
                  <div className="flex gap-1">
                    <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ background: t.p }} />
                    <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ background: t.a }} />
                  </div>
                  <div className="text-[9px] font-semibold text-center leading-tight" style={{ color: isSelected ? "#FBBF24" : "#374151", ...syneFont }}>{t.name}</div>
                  {isSelected && <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#FBBF24" }}><Check size={8} color="#1F2937" strokeWidth={3} /></div>}
                </button>
              );
            })}
          </div>

          {/* Color preview */}
          {selectedTheme !== "custom" && (() => {
            const t = COLOR_THEMES.find(x => x.id === selectedTheme);
            if (!t) return null;
            return (
              <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div className="px-4 py-3 flex items-center gap-3" style={{ background: t.p }}>
                  <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center"><div className="w-3 h-3 rounded-full" style={{ background: t.a }} /></div>
                  <div className="flex-1"><div className="h-2 rounded-full bg-white/50 w-32 mb-1" /><div className="h-1.5 rounded-full bg-white/25 w-20" /></div>
                  <div className="px-3 py-1 rounded-lg text-[10px] font-semibold" style={{ background: t.a, color: "#1F2937" }}>Apply</div>
                </div>
                <div className="p-4 bg-white">
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-2.5 rounded-full bg-gray-100 w-3/4" />
                      <div className="h-2 rounded-full bg-gray-100 w-full" />
                      <div className="h-2 rounded-full bg-gray-100 w-2/3" />
                    </div>
                    <div className="w-16 h-14 rounded-xl flex-shrink-0" style={{ background: `${t.p}15` }} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="px-3 py-1.5 rounded-lg text-[9px] font-semibold text-white" style={{ background: t.p }}>Primary</div>
                    <div className="px-3 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.a, color: "#1F2937" }}>Accent</div>
                    <div className="px-3 py-1.5 rounded-lg text-[9px] font-semibold" style={{ background: t.s || "#F3F4F6", color: t.p }}>Secondary</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Custom color pickers */}
          {form.colorTheme === "custom" && (
            <div className="rounded-2xl p-4 border" style={{ background: "#1F2937", borderColor: "rgba(251,191,36,0.2)" }}>
              <div className="text-xs font-semibold text-amber-400 mb-3 uppercase tracking-widest" style={syneFont}>Custom Colors</div>
              <div className="grid grid-cols-3 gap-3">
                {["primary", "secondary", "accent"].map(k => (
                  <div key={k}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2 capitalize" style={{ color: "rgba(255,255,255,0.4)", ...syneFont }}>{k}</div>
                    <div className="flex items-center gap-2">
                      <input type="color" value={cc[k]}
                        onChange={e => { const v = e.target.value; setCC(x => ({ ...x, [k]: v })); set(f => ({ ...f, customColors: { ...cc, [k]: v } })); }}
                        className="w-10 h-10 rounded-xl border-2 cursor-pointer"
                        style={{ borderColor: "rgba(255,255,255,0.15)", background: "transparent" }} />
                      <input value={cc[k]}
                        onChange={e => { const v = e.target.value; setCC(x => ({ ...x, [k]: v })); set(f => ({ ...f, customColors: { ...cc, [k]: v } })); }}
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-lg text-xs font-mono"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#FBBF24", ...syneFont }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTIONS ── */}
      {activeTab === "sections" && (
        <div>
          <div className="mb-5">
            <h3 className="font-semibold text-[#1F2937] text-base mb-1" style={serifFont}>
              Page <em style={{ color: "#FBBF24" }}>Sections</em>
            </h3>
            <p className="text-xs text-gray-400" style={syneFont}>Toggle which sections appear on your school website</p>
          </div>

          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => set(f => ({ ...f, sections: ALL_SECTIONS.map(s => s.id) }))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: "#1F2937", color: "#FBBF24", ...syneFont }}>
              <Check size={11} /> All
            </button>
            <button type="button" onClick={() => set(f => ({ ...f, sections: ["hero", "contact"] }))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border"
              style={{ background: "white", color: "#6B7280", borderColor: "#E5E7EB", ...syneFont }}>
              Minimal
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_SECTIONS.map(sec => {
              const isActive = (form.sections || ALL_SECTIONS.map(s => s.id)).includes(sec.id);
              const isCore   = sec.id === "hero" || sec.id === "contact";
              return (
                <button key={sec.id} type="button"
                  onClick={() => {
                    if (isCore) return;
                    const cur = form.sections || ALL_SECTIONS.map(s => s.id);
                    set(f => ({ ...f, sections: isActive ? cur.filter(s => s !== sec.id) : [...cur, sec.id] }));
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 text-left transition-all duration-200"
                  style={{
                    borderColor: isActive ? "#FBBF24" : "#E5E7EB",
                    background:  isActive ? "#1F2937"  : "white",
                    opacity: isCore ? 0.6 : 1,
                    cursor:  isCore ? "not-allowed" : "pointer",
                    boxShadow: isActive ? "0 2px 10px rgba(251,191,36,0.15)" : "none",
                  }}>
                  <span className="text-base flex-shrink-0">{sec.icon}</span>
                  <span className="text-xs font-bold flex-1 leading-tight" style={{ color: isActive ? "#FBBF24" : "#374151", ...syneFont }}>{sec.label}</span>
                  {isActive && <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FBBF24" }}><Check size={8} color="#1F2937" strokeWidth={3} /></div>}
                  {isCore && isActive && <div className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(251,191,36,0.2)", color: "#FBBF24", ...syneFont }}>Fixed</div>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-sm" style={{ background: "#FBBF24", color: "#1F2937", ...syneFont }}>
              {(form.sections || ALL_SECTIONS.map(s => s.id)).length}
            </div>
            <p className="text-xs text-[#1F2937] font-semibold" style={syneFont}>sections active on your website</p>
          </div>
        </div>
      )}

      {activeTab === "news" && (
        <div>
          <div className="mb-5">
            <h3 className="font-semibold text-[#1F2937] text-base mb-1" style={serifFont}>
              School <em style={{ color: "#FBBF24" }}>News</em>
            </h3>
            <p className="text-xs text-gray-400" style={syneFont}>
              Posts appear on your public school website. Optional link per story (e.g. Facebook post). Parents also see your social links from the Contact step.
            </p>
          </div>
          <button
            type="button"
            onClick={() => set(f => ({
              ...f,
              newsItems: [...(f.newsItems || []), {
                id: `n-${Date.now()}`,
                title: "",
                excerpt: "",
                body: "",
                date: new Date().toISOString().slice(0, 10),
                socialUrl: "",
                socialLabel: "",
              }],
            }))}
            className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border-2 border-dashed transition-all"
            style={{ borderColor: "#FBBF24", color: "#1F2937", background: "rgba(251,191,36,0.08)", ...syneFont }}
          >
            <Plus size={14} /> Add news story
          </button>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {(form.newsItems || []).map((item, idx) => (
              <div key={item.id || idx} className="rounded-2xl border border-gray-200 p-4 space-y-3" style={{ background: "#FAFAFA" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1F2937]" style={syneFont}>Story {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => set(f => ({ ...f, newsItems: (f.newsItems || []).filter((_, i) => i !== idx) }))}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Remove story"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Title</label>
                  <input
                    value={item.title || ""}
                    onChange={e => set(f => {
                      const next = [...(f.newsItems || [])];
                      next[idx] = { ...next[idx], title: e.target.value };
                      return { ...f, newsItems: next };
                    })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    placeholder="e.g. PTA meeting — all parents invited"
                    style={syneFont}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Short excerpt</label>
                  <textarea
                    value={item.excerpt || ""}
                    onChange={e => set(f => {
                      const next = [...(f.newsItems || [])];
                      next[idx] = { ...next[idx], excerpt: e.target.value };
                      return { ...f, newsItems: next };
                    })}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    placeholder="One or two lines for the card…"
                    style={syneFont}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Full story (optional)</label>
                  <textarea
                    value={item.body || ""}
                    onChange={e => set(f => {
                      const next = [...(f.newsItems || [])];
                      next[idx] = { ...next[idx], body: e.target.value };
                      return { ...f, newsItems: next };
                    })}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    placeholder="Shown in the pop-up when parents read more…"
                    style={syneFont}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Date</label>
                    <input
                      type="text"
                      value={item.date || ""}
                      onChange={e => set(f => {
                        const next = [...(f.newsItems || [])];
                        next[idx] = { ...next[idx], date: e.target.value };
                        return { ...f, newsItems: next };
                      })}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                      placeholder="Mar 30, 2026"
                      style={syneFont}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Social post link (optional)</label>
                    <input
                      value={item.socialUrl || ""}
                      onChange={e => set(f => {
                        const next = [...(f.newsItems || [])];
                        next[idx] = { ...next[idx], socialUrl: e.target.value };
                        return { ...f, newsItems: next };
                      })}
                      className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                      placeholder="https://facebook.com/…"
                      style={syneFont}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500" style={syneFont}>Button label for link</label>
                  <input
                    value={item.socialLabel || ""}
                    onChange={e => set(f => {
                      const next = [...(f.newsItems || [])];
                      next[idx] = { ...next[idx], socialLabel: e.target.value };
                      return { ...f, newsItems: next };
                    })}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                    placeholder="e.g. View on Facebook"
                    style={syneFont}
                  />
                </div>
              </div>
            ))}
            {!(form.newsItems || []).length && (
              <p className="text-xs text-gray-400 text-center py-8" style={syneFont}>No stories yet. Add one to show a News section on your site (enable “News” in Sections).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 11 — PUBLISH ───────────────────────────────────────────────────────
function S11Connected({ form, miniId, saving, saveErr, onSave, onPublish, canPublish, missing }) {
  const slug    = form.name?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "your-school";
  const logoSrc = imgUrl(form.logoPreview);
  const checks  = [
    { l: "School Identity",  done: !!(form.name && form.code),                       e: "🏫" },
    { l: "Mission & Vision", done: !!(form.mission && form.vision),                  e: "🎯" },
    { l: "Location",         done: !!(form.province && form.district),               e: "📍" },
    { l: "Contact Info",     done: !!(form.phone && form.email),                     e: "📞" },
    { l: "Leadership",       done: true,                                              e: "👤" },
    { l: "Gallery Albums",   done: true,                                              e: "📷" },
    { l: "Admissions",       done: true,                                             e: "📋" },
    { l: "School Fees",      done: !!(form.fees && Object.keys(form.fees).length > 0), e: "💰" },
    { l: "Design",           done: !!(form.template && form.colorTheme),             e: "🎨" },
  ];
  const done = checks.filter(c => c.done).length;
  const pct  = Math.round(done / checks.length * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
          <div><h4 className="font-bold text-white text-sm">Profile Completeness</h4><p className="text-gray-400 text-xs mt-0.5">{done} of {checks.length} sections</p></div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center border-4" style={{ borderColor: pct === 100 ? "#22c55e" : "#FBBF24" }}>
            <span className="font-semibold text-xs" style={{ color: pct === 100 ? "#22c55e" : "#FBBF24" }}>{pct}%</span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100">
          <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : "#FBBF24" }} />
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map(c => (
            <div key={c.l} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${c.done ? "bg-green-50" : "bg-gray-50"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${c.done ? "bg-green-500" : "bg-gray-200"}`}>
                {c.done ? <Check size={10} className="text-white" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block" />}
              </div>
              <span className="text-sm">{c.e}</span>
              <span className={`text-xs font-semibold ${c.done ? "text-green-800" : "text-gray-400"}`}>{c.l}</span>
            </div>
          ))}
        </div>
      </div>

      {form.name && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center font-semibold text-gray-900 text-lg flex-shrink-0 overflow-hidden">
            {logoSrc ? <img src={logoSrc} className="w-full h-full object-cover" alt="logo" /> : form.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm truncate">{form.name}</h4>
            <p className="text-gray-400 text-xs mt-0.5">{form.district ? `${form.district}, ${form.province}` : "Rwanda"}</p>
            <div className="font-mono text-xs text-amber-400 mt-1 truncate">babyeyi.rw/school/{slug}</div>
          </div>
          {miniId && <span className="text-xs text-green-400 font-bold px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 flex-shrink-0">Saved</span>}
        </div>
      )}

      {saveErr && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">{saveErr}</p>
        </div>
      )}

      {!canPublish && (missing?.length > 0) && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-800">Publishing locked</div>
            <div className="text-xs text-amber-700 mt-0.5 leading-relaxed">Complete: <span className="font-bold">{missing.join(", ")}</span>.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={onSave} disabled={saving}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all group disabled:opacity-50">
          <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center">
            {saving ? <Loader2 size={17} className="text-blue-600 animate-spin" /> : <Save size={17} className="text-blue-600" />}
          </div>
          <div className="text-left"><div className="font-bold text-blue-700 text-sm">{saving ? "Saving…" : "Save Draft"}</div><div className="text-xs text-blue-500">Continue later</div></div>
        </button>
        <button type="button" onClick={onPublish} disabled={saving || !canPublish}
          className="flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
          <div className="w-10 h-10 rounded-xl bg-green-500 group-hover:bg-green-600 flex items-center justify-center transition-colors">
            {saving ? <Loader2 size={17} className="text-white animate-spin" /> : <Send size={17} className="text-white" />}
          </div>
          <div className="text-left"><div className="font-bold text-green-700 text-sm">{saving ? "Publishing…" : "Publish Website"}</div><div className="text-xs text-green-500">Go live now!</div></div>
        </button>
      </div>
    </div>
  );
}

// ─── API LAYER ────────────────────────────────────────────────────────────────
async function apiFetchList()         { const r = await fetch(API, { credentials: "include" }); if (!r.ok) throw new Error("Failed to load schools"); return r.json(); }
async function apiFetchSchool(sid)    { const r = await fetch(`${API}/school/${sid}`, { credentials: "include" }); if (!r.ok) throw new Error("School not found"); return r.json(); }
async function apiCreate(fd)          { const r = await fetch(API, { method: "POST", body: fd, credentials: "include" }); if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Create failed"); } return r.json(); }
async function apiUpdate(mid, fd)     { const r = await fetch(`${API}/${mid}`, { method: "PUT", body: fd, credentials: "include" }); if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Update failed"); } return r.json(); }
async function apiPublish(mid)        { const r = await fetch(`${API}/${mid}/publish`, { method: "PATCH", credentials: "include" }); if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Publish failed"); } return r.json(); }

function buildFormData(form, schoolId) {
  const fd = new FormData();
  if (schoolId) fd.append("schoolId", String(schoolId));
  ["background","mission","vision","facebook","twitter","instagram","template","colorTheme"].forEach(k => { if (form[k] != null) fd.append(k, form[k]); });
  fd.append("coreValues",   JSON.stringify(form.coreValues         || []));
  fd.append("aLevelCombos", JSON.stringify(form.aLevelCombinations || []));
  fd.append("tvetTrades",   JSON.stringify(form.tvetTrades         || []));
  fd.append("internationalPrimaryPrograms", JSON.stringify(form.internationalPrimaryPrograms || []));
  fd.append("internationalOtherPrograms",   JSON.stringify(form.internationalOtherPrograms   || []));
  fd.append("customColors", JSON.stringify(form.customColors || null));
  fd.append("sections",     JSON.stringify(form.sections    || null));
  fd.append("newsItems",    JSON.stringify(form.newsItems   || []));
  fd.append("admission",    JSON.stringify(form.admission   || {}));
  fd.append("fees",         JSON.stringify(form.fees        || {}));
  const cleanAlbums = (form.albums || []).map(a => ({
    id: a.id, title: a.title, date: a.date, category: a.category, description: a.description,
    images: (a.images || []).filter(img => img.url && !img.url.startsWith("blob:") && !img._file).map(img => ({ id: img.id, url: img.url, caption: img.caption || "" })),
  }));
  fd.append("albums", JSON.stringify(cleanAlbums));
  const leadersData = (form.leaders || []).map(l => ({ id: l.id, name: l.name, role: l.role, phone: l.phone || null, email: l.email || null, photoPreview: l.photoFile ? null : (l.photoPreview || null) }));
  fd.append("leaders", JSON.stringify(leadersData));
  (form.leaders || []).forEach((l, idx) => { if (l.photoFile instanceof File) fd.append(`leaderPhoto_${idx}`, l.photoFile); });
  if (form.cover        instanceof File) fd.append("cover",        form.cover);
  if (form.aboutImage   instanceof File) fd.append("aboutImage",   form.aboutImage);
  if (form.missionImage instanceof File) fd.append("missionImage", form.missionImage);
  return fd;
}

// ─── SCHOOLS LIST ─────────────────────────────────────────────────────────────
function SchoolsList({ onSelect }) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    apiFetchList().then(r => setSchools(r.data || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = schools.filter(s => !search || s.school_name?.toLowerCase().includes(search.toLowerCase()) || s.school_code?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
      <div className="text-center"><Loader2 size={40} className="text-amber-400 animate-spin mx-auto mb-4" /><p className="text-gray-400 font-semibold text-sm">Loading schools…</p></div>
    </div>
  );
  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
      <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center max-w-sm">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-red-400 font-bold text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "#0f172a" }}>
      <FontLoader />
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white" style={syneFont}>School Mini-Websites</h1>
            <p className="text-gray-400 text-sm mt-0.5" style={syneFont}>Select a school to create or edit its website</p>
          </div>
        </div>
        <div className="mb-6">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code…"
            className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-400 transition-all" style={syneFont} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const hasMini = !!s.mini_id;
            const isLive  = s.site_status === "published";
            const logoSrc = imgUrl(s.logoUrl);
            return (
              <button key={s.id} onClick={() => onSelect(s.id)}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left hover:bg-white/10 hover:border-amber-400/40 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0 border border-white/10">
                    {logoSrc ? <img src={logoSrc} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-gray-400">{s.school_name?.[0] || "S"}</div>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${isLive ? "bg-green-500/20 text-green-400 border border-green-500/30" : hasMini ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-gray-700 text-gray-400 border border-gray-600"}`} style={syneFont}>
                    {isLive ? "● Live" : hasMini ? "Draft" : "No site"}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-1 group-hover:text-amber-300 transition-colors" style={syneFont}>{s.school_name}</h3>
                <p className="text-gray-500 text-xs" style={syneFont}>{s.district}, {s.province}</p>
                {s.slug && <p className="text-amber-400/60 text-xs font-mono mt-1.5 truncate">/{s.slug}</p>}
              </button>
            );
          })}
          {filtered.length === 0 && <div className="col-span-3 text-center py-16 text-gray-500 text-sm" style={syneFont}>No schools found</div>}
        </div>
      </div>
    </div>
  );
}

// ─── DEFAULTS ────────────────────────────────────────────────────────────────
const DEF = {
  educationLevels: [], aLevelCombinations: [], tvetTrades: [],
  internationalPrimaryPrograms: [], internationalOtherPrograms: [],
  coreValues: [], albums: [],
  leaders: [],
  fees: {}, admission: {},
  template: "modern", colorTheme: "blue",
  sections: ALL_SECTIONS.map(s => s.id),
  background: "",
  newsItems: [],
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App({ initialSchoolId, initialSchoolName, initialStep = 1 }) {
  const [view,     setView]     = useState(initialSchoolId ? "loading" : "list");
  const [step,     setStep]     = useState(initialStep || 1);
  const [form,     setForm]     = useState(DEF);
  const [published,setPublished]= useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState(null);
  const [schoolId, setSchoolId] = useState(initialSchoolId || null);
  const [miniId,   setMiniId]   = useState(null);

  const cur    = STEPS.find(s => s.id === step);
  const isPrev = step === 10;

  const getPublishChecks = useCallback((f) => {
    const checks = [
      { id: "identity",   label: "School Identity",  done: !!(f.name && f.code) },
      { id: "mission",    label: "Mission & Vision",  done: !!(String(f.mission || "").trim() && String(f.vision || "").trim()) },
      { id: "location",   label: "Location",          done: !!(f.province && f.district) },
      { id: "contact",    label: "Contact Info",      done: !!(f.phone && f.email) },
      { id: "leadership", label: "Leadership",        done: true },
      { id: "gallery",    label: "Gallery Albums",    done: true },
      { id: "admissions", label: "Admissions",        done: true },
      { id: "fees",       label: "School Fees",       done: !!(f.fees && Object.keys(f.fees).length > 0) },
      { id: "design",     label: "Design",            done: !!(f.template && f.colorTheme) },
    ];
    const missing = checks.filter(c => !c.done).map(c => c.label);
    return { checks, missing, canPublish: missing.length === 0 };
  }, []);

  const publishState = getPublishChecks(form);

  useEffect(() => { if (initialSchoolId) loadSchool(initialSchoolId); }, [initialSchoolId]); // eslint-disable-line

  const loadSchool = async (id) => {
    setSaveErr(null); setView("loading");
    try {
      const { data } = await apiFetchSchool(id);
      const loadedLeaders = Array.isArray(data.leaders)
        ? data.leaders.map((l, idx) => ({
            id: l?.id || `leader-${Date.now()}-${idx}`,
            name: l?.name || "",
            role: l?.role || "",
            phone: l?.phone || "",
            email: l?.email || "",
            photoPreview: l?.photoPreview || null,
            photoFile: null,
          }))
        : [];
      setForm({
        ...DEF,
        name: data.name || "", code: data.code || "", category: data.category || "", ownership: data.ownership || "", founded: data.founded || "",
        educationLevels: data.educationLevels || [],
        province: data.province || "", district: data.district || "", sector: data.sector || "", cell: data.cell || "", village: data.village || "", address: data.address || "", mapUrl: data.mapUrl || "",
        phone: data.phone || "", email: data.email || "", postalAddress: data.postalAddress || "", website: data.website || "",
        logoPreview: data.logoPreview || null, signaturePreview: data.signaturePreview || null, stampPreview: data.stampPreview || null,
        coverPreview: data.coverPreview || null, aboutPreview: data.aboutPreview || null, missionPreview: data.missionPreview || null,
        mission: data.mission || "", vision: data.vision || "", coreValues: data.coreValues || [], background: data.background || "",
        facebook: data.facebook || "", twitter: data.twitter || "", instagram: data.instagram || "",
        template: data.template || "modern", colorTheme: data.colorTheme || "blue", customColors: data.customColors || null,
        sections: data.sections || ALL_SECTIONS.map(s => s.id),
        aLevelCombinations: data.aLevelCombos || [], tvetTrades: data.tvetTrades || [],
        internationalPrimaryPrograms: data.internationalPrimaryPrograms || [], internationalOtherPrograms: data.internationalOtherPrograms || [],
        admission: data.admission || {}, fees: data.fees || {}, albums: data.albums || [], leaders: loadedLeaders,
        newsItems: Array.isArray(data.newsItems) ? data.newsItems : [],
      });
      setSchoolId(id); setMiniId(data.miniId || null); setStep(initialStep || 1); setPublished(false); setView("wizard");
    } catch (e) { setSaveErr(e.message); setView("list"); }
  };

  const handleSave = async () => {
    setSaving(true); setSaveErr(null);
    try {
      const fd  = buildFormData(form, schoolId);
      const res = miniId ? await apiUpdate(miniId, fd) : await apiCreate(fd);
      if (res.data?.miniId) setMiniId(res.data.miniId);
    } catch (e) { setSaveErr(e.message); } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    const gate = getPublishChecks(form);
    if (!gate.canPublish) { setSaveErr(`Complete: ${gate.missing.join(", ")}.`); return; }
    setSaving(true); setSaveErr(null);
    try {
      const fd = buildFormData(form, schoolId);
      let id   = miniId;
      if (id)  { await apiUpdate(id, fd); }
      else     { const res = await apiCreate(fd); id = res.data?.miniId; setMiniId(id); }
      if (!id) throw new Error("Could not determine mini-website ID");
      await apiPublish(id);
      setPublished(true);
    } catch (e) { setSaveErr(e.message); } finally { setSaving(false); }
  };

  const renderStep = () => {
    switch (step) {
      case 1:  return <S1Connected      form={form} set={setForm} />;
      case 2:  return <S2               form={form} set={setForm} />;
      case 3:  return <S3Connected      form={form} />;
      case 4:  return <S4ConnectedFixed form={form} set={setForm} />;
      case 5:  return <S5Connected      form={form} set={setForm} />;
      case 6:  return <S6               form={form} set={setForm} schoolId={schoolId} miniId={miniId} />;
      case 7:  return <S7 schoolId={schoolId} onNext={() => setStep(8)} onBack={() => setStep(6)} />;
      case 8:  return <S8               form={form} set={setForm} />;
      case 9:  return <S9               form={form} set={setForm} />;
      case 10: return null;
      case 11: return <S11Connected form={form} miniId={miniId} saving={saving} saveErr={saveErr} onSave={handleSave} onPublish={handlePublish} canPublish={publishState.canPublish} missing={publishState.missing} />;
      default: return null;
    }
  };

  // ── Loading screen ──
  if (view === "loading") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}>
      <FontLoader />
      <div className="text-center">
        <Loader2 size={40} className="text-amber-400 animate-spin mx-auto mb-4" />
        <p className="text-gray-400 font-semibold text-sm" style={syneFont}>Loading {initialSchoolName || "school"} data…</p>
        {saveErr && <p className="text-red-400 text-xs mt-3 font-medium">{saveErr}</p>}
      </div>
    </div>
  );

  if (view === "list") return <SchoolsList onSelect={loadSchool} />;

  // ── Published screen ──
  if (published) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}>
      <FontLoader />
      <div className="max-w-sm w-full text-center">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto text-5xl shadow-sm shadow-amber-400/30">🎓</div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-400 flex items-center justify-center shadow-lg"><Check size={15} className="text-white" /></div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-400" /><span className="text-green-400 text-xs font-bold" style={syneFont}>LIVE & PUBLISHED</span>
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2" style={serifFont}>{form.name || "Your School"}</h1>
        <p className="text-gray-400 mb-5 text-sm" style={syneFont}>Your school is now live 🇷🇼</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-5">
          <div className="text-gray-500 text-xs mb-1" style={syneFont}>Your website</div>
          <div className="font-mono text-sm font-bold text-amber-400">babyeyi.rw/school/{form.name?.toLowerCase().replace(/\s+/g, "-") || "your-school"}</div>
        </div>
        <div className="flex gap-3">
          {!initialSchoolId && <button onClick={() => setView("list")} className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-semibold hover:bg-white/20 text-sm" style={syneFont}>← All Schools</button>}
          <button onClick={() => { setPublished(false); setStep(1); }} className="flex-1 py-3 rounded-2xl bg-amber-400 text-gray-900 font-semibold hover:bg-amber-300 text-sm" style={syneFont}>Edit Site</button>
        </div>
      </div>
    </div>
  );

  // ── Wizard ──
  return (
    <div className="min-h-screen bg-gray-50 flex" style={{ fontFamily: "'Montserrat', system-ui, sans-serif" }}>
      <FontLoader />

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="w-48 bg-gray-900 min-h-screen flex-shrink-0 hidden lg:flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          {!initialSchoolId && (
            <button onClick={() => setView("list")} className="w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center text-sm flex-shrink-0 hover:bg-amber-300 transition-all" title="Back">🎓</button>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm leading-none truncate" style={syneFont}>{form.name || initialSchoolName || "School"}</div>
            <div className="text-gray-500 text-xs mt-0.5" style={syneFont}>Mini-Website</div>
          </div>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {STEPS.map(s => {
            const Icon     = s.icon;
            const done     = step > s.id;
            const on       = step === s.id;
            const canVisit = done || !!miniId;
            return (
              <button key={s.id} onClick={() => canVisit && setStep(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl mb-0.5 text-left transition-all ${on ? "bg-amber-400 text-gray-900" : (done || miniId) ? "text-green-400 hover:bg-white/5 cursor-pointer" : "text-gray-500 cursor-default"}`}>
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? "bg-amber-500/30" : done ? "bg-green-500/20" : "bg-white/5"}`}>
                  {done ? <Check size={10} className="text-green-400" /> : <Icon size={10} />}
                </div>
                <span className="text-xs font-bold" style={syneFont}>{s.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <button onClick={() => setPrevOpen(true)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all" style={syneFont}><Eye size={12} /> Preview</button>
          {!initialSchoolId && <button onClick={() => setView("list")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 transition-all" style={syneFont}>← All Schools</button>}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!initialSchoolId && <button onClick={() => setView("list")} className="lg:hidden w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all"><ChevronLeft size={14} className="text-gray-600" /></button>}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400" style={syneFont}>Step {step}/{STEPS.length}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs font-bold text-gray-700" style={syneFont}>{TITLES[step - 1]}</span>
            </div>
            <div className="lg:hidden text-xs font-bold text-gray-700" style={syneFont}>{TITLES[step - 1]}</div>
          </div>
          <div className="flex items-center gap-2">
            {miniId && <span className="hidden sm:flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700" style={syneFont}>{saving ? "Saving…" : "Saved ✓"}</span>}
            <button onClick={() => setPrevOpen(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-all" style={syneFont}><Eye size={12} /> Preview</button>
            {step !== 7 && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 text-gray-900 font-bold text-xs hover:bg-amber-300 transition-all disabled:opacity-50" style={syneFont}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        {saveErr && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600 font-medium flex-1" style={syneFont}>{saveErr}</p>
            <button onClick={() => setSaveErr(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
          </div>
        )}

        {/* Mobile step strip */}
        <div className="lg:hidden overflow-x-auto bg-white border-b border-gray-100 px-3 py-2">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const Icon     = s.icon;
              const done     = step > s.id;
              const on       = step === s.id;
              const canVisit = done || !!miniId;
              return (
                <div key={s.id} className="flex items-center">
                  <button onClick={() => canVisit && setStep(s.id)} className={`flex flex-col items-center gap-0.5 ${canVisit ? "cursor-pointer" : "cursor-default"}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${done ? "bg-green-500" : on ? "bg-amber-400" : "bg-gray-100"}`}>
                      {done ? <Check size={10} className="text-white" /> : <Icon size={10} className={on ? "text-gray-900" : "text-gray-400"} />}
                    </div>
                    <span className={`font-bold ${on ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"}`} style={{ fontSize: "8px", ...syneFont }}>{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <div className={`w-4 h-0.5 mx-0.5 mb-3 rounded-full ${done ? "bg-green-400" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex min-w-0">
          {step === 7 ? (
            <div className="flex-1 p-0 overflow-y-auto">{renderStep()}</div>
          ) : (
            <div className="flex-1 p-3 sm:p-5">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden max-w-3xl mx-auto">
                {/* Card header */}
                <div className="bg-gray-900 px-5 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-400 flex items-center justify-center flex-shrink-0">
                    {cur && <cur.icon size={15} className="text-gray-900" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-white font-semibold text-sm truncate" style={syneFont}>{TITLES[step - 1]}</h2>
                    <p className="text-gray-400 text-xs mt-0.5 truncate" style={syneFont}>{SUBS[step - 1]}</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6">{renderStep()}</div>
                {/* Nav buttons */}
                <div className="px-4 sm:px-6 pb-5 flex items-center justify-between border-t border-gray-50 pt-4">
                  <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all" style={syneFont}>
                    <ChevronLeft size={14} /> Back
                  </button>
                  {step < STEPS.length
                    ? <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-400 text-gray-900 font-semibold text-sm hover:bg-amber-300 transition-all shadow-lg shadow-amber-100" style={syneFont}>
                        Continue <ChevronRight size={14} />
                      </button>
                    : <button onClick={handlePublish} disabled={saving || !publishState.canPublish}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" style={syneFont}>
                        <Send size={14} /> {saving ? "Publishing…" : "Publish"}
                      </button>
                  }
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Full-screen preview modal */}
      {prevOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex flex-col">
          <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /><div className="w-2.5 h-2.5 rounded-full bg-green-400" /></div>
            <div className="flex-1 bg-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400 font-mono truncate">babyeyi.rw/school/{form.name?.toLowerCase().replace(/\s+/g, "-") || "your-school"}</div>
            <button onClick={() => setPrevOpen(false)} className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 flex-shrink-0"><X size={13} /></button>
          </div>
          <div className="flex-1 overflow-y-auto"><WebsitePreview form={form} /></div>
        </div>
      )}
    </div>
  );
}