import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  School,
  DollarSign,
  ClipboardList,
  Landmark,
  PenLine,
  Layers,
  Users,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  QrCode,
  Copy,
  Sparkles,
  Shield,
  AlertTriangle,
  Plus,
  X,
  Send,
  Info,
  User,
  Phone,
  Mail,
  Pencil,
  ClipboardPen,
} from "lucide-react";
import BabyeyiList from "./BabyeyiList";
import ClassStreamPicker from "./ClassStreamPicker";
import EducationLevelPicker from "./EducationLevelPicker";
import { buildClassGroupsFromRows } from "../../../utils/classStreamGroups";
import {
  NESA_FEE_LIMIT_LEVELS,
  EDUCATION_LEVEL_OPTIONS,
  inferEducationLevelFromClass,
  inferNesaFeeLimitLevelFromClass,
  mapToNesaLimitLevel,
  buildClassRowMap,
  filterClassGroupsByLevel,
  filterLabelsByLevel,
  pruneSelectedToLevel,
  levelsPresentInCatalog,
  normalizeEducationLevel,
  mergeWithDefaultClassCatalog,
} from "../../../utils/educationLevelClasses";
import { mapSchoolOwnershipToFeeScope, categoryOptionsForWizard } from "./babyeyiWizardSchoolScope";
import { useAcademic } from "../../../manager/context/AcademicContext";

import { API_BASE, SERVER_BASE as ASSET_BASE, babyeyiVerifyScanUrl, BABYEYI_VERIFY_PUBLIC_ORIGIN } from '../lib/schoolLiteApi';

const toAssetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const normalized = path.replace(/\\/g, "/");
  return `${ASSET_BASE}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
};

async function uploadSchoolAsset(assetType, file, showToast) {
  if (!file) return null;
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("asset_type", assetType);
    const res  = await fetch(`${API_BASE}/babyeyi/upload-asset`, {
      method: "POST", body: fd, credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      if (showToast) showToast(json.message || "Upload failed", "error");
      return null;
    }
    if (showToast) {
      const label = assetType.charAt(0).toUpperCase() + assetType.slice(1);
      showToast(`${label} saved to school profile`, "success");
    }
    return json.url || null;
  } catch (e) {
    console.warn("[upload-asset]", e.message);
    if (showToast) showToast("Upload failed", "error");
    return null;
  }
}

// ── Color Palette ─────────────────────────────────────────────
const C = {
  gold:        "#F5B800",
  goldLight:   "#FFD84D",
  goldDark:    "#D99A00",
  goldDeep:    "#8A6500",
  goldBg:      "#FFFDF3",
  goldBgMid:   "#FFF6CC",
  goldBorder:  "#FFE58A",
  dark:        "#1F2937",
  darkMid:     "#4B5563",
  emerald:     "#10B981",
  emeraldDark: "#047857",
  emeraldBg:   "#ECFDF5",
  emeraldBord: "#A7F3D0",
  red:         "#EF4444",
  red50:       "#FEF2F2",
  red700:      "#B91C1C",
  red800:      "#991B1B",
  redBorder:   "#FECACA",
  amber:       "#F59E0B",
  amberBg:     "#FFFBEB",
  amberBord:   "#FDE68A",
  blue:        "#3B82F6",
  blueBg:      "#EFF6FF",
  blueBord:    "#BFDBFE",
  blue700:     "#1D4ED8",
  violet:      "#8B5CF6",
  violetBg:    "#F5F3FF",
  violetBord:  "#DDD6FE",
  slate100:    "#F8FAFC",
  slate200:    "#E2E8F0",
  slate400:    "#94A3B8",
  slate500:    "#64748B",
};

// ── Inline SVG Icons ──────────────────────────────────────────
const Svg = ({ d, size = 16, color = "currentColor", sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ic = {
  school:  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  dollar:  "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  book:    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  pen:     "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  chevR:   "M9 18l6-6-6-6",
  chevL:   "M15 18l-6-6 6-6",
  plus:    "M12 5v14M5 12h14",
  x:       "M18 6L6 18M6 6l12 12",
  upload:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  alert:   "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  bank:    "M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11",
  send:    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  save:    "M19 21H5a2 2 0 0 1-2 2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8",
  layers:  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  info:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8h.01M12 12v4",
  check:   "M20 6L9 17l-5-5",
  file:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  db:      "M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5",
  qr:      "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM17 17h2v2h-2zM19 19h2v2h-2z",
  copy:    "M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866M11 8h8c1.105 0 2 .911 2 2.036v10.929C21 22.088 20.104 23 19 23h-8c-1.105 0-2-.912-2-2.036V10.036C9 8.911 9.895 8 11 8z",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  sparkle: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z",
  // ── NEW: users / contacts icon ────────────────────────────
  users:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  phone:   "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69l3-.01a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  mail:    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  user:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
const LUCIDE_ICONS = {
  school: School,
  dollar: DollarSign,
  book: ClipboardList,
  pen: PenLine,
  eye: Eye,
  chevR: ChevronRight,
  chevL: ChevronLeft,
  plus: Plus,
  x: X,
  upload: Upload,
  alert: AlertTriangle,
  shield: Shield,
  bank: Landmark,
  send: Send,
  layers: Layers,
  info: Info,
  check: Check,
  qr: QrCode,
  copy: Copy,
  sparkle: Sparkles,
  users: Users,
  phone: Phone,
  mail: Mail,
  user: User,
  list: ClipboardList,
};
const I = ({ n, size = 16, color, sw }) => {
  const LucideIcon = LUCIDE_ICONS[n];
  if (LucideIcon) {
    return <LucideIcon size={size} color={color} strokeWidth={sw || 2.25} aria-hidden className="shrink-0" />;
  }
  return <Svg d={ic[n] || ic.info} size={size} color={color} sw={sw || 2} />;
};

/** Keep multi-select order aligned with the school catalog list. */
function sortSelectedClassesByCatalog(selected, catalogOrder) {
  const set = new Set(Array.isArray(selected) ? selected : []);
  return catalogOrder.filter((c) => set.has(c));
}

const RW_LOCATIONS = {
  "Kigali City": {
    Gasabo: {
      Kimironko: ["Bibare"],
      Remera:    ["Nyarutarama","Rukiri 1","Rukiri 2"],
      Gisozi:    ["Bumbogo","Musezero","Akamatamu"],
      Bumbogo:   [""],
      Kinyinya:  [""],
    },
    Nyarugenge: {
      Nyamirambo: ["Cyivugiza","Rwezamenyo"],
      Gitega:     ["Akabahizi","Akabeza","Gacyamo","Kibogora","Mageragere","Mibagare","Nyakabanda","Rugarama"],
      Kanyinya:   ["Nyamweru","Nzove","Rugarama"],
    },
  },
  "Southern Province": {
    Ruhango: {
      Byimana: ["Kabgaga"],
      Ruhango: ["Kabuye"],
    },
  },
  "Eastern Province": {
    Kayonza: {
      Mukarange: ["Mukarange"],
      Ruramira:  [""],
    },
    Rwamagana: {
      Kigabiro: [""],
    },
  },
  "Northern Province": {
    Musanze: {
      Muhoza: [""],
    },
  },
  "Western Province": {
    Rubavu: {
      Gisenyi: [""],
    },
  },
};

const REQUEST_REASON_OPTIONS = [
  "School Infrastructure Maintenance & Renovation",
  "Construction of New Classrooms or Facilities",
  "ICT Equipment & Computer Laboratory Development",
  "Science Laboratory Equipment & Materials",
  "Furniture Procurement (Desks, Chairs, Cabinets)",
  "Water, Sanitation & Hygiene (WASH) Improvements",
  "Electricity & Solar Installation or Upgrade",
  "Security Enhancement (CCTV, Fencing, Gates)",
  "Teaching & Learning Materials Procurement",
  "Sports & Extracurricular Facilities Development",
  "Library Development & Books Procurement",
  "School Transportation Support",
  "Special Needs & Inclusive Education Support",
  "Emergency Repairs (Storm Damage, Structural Issues)",
  "Digital Learning Platform Implementation",
  "Other",
];

// ── Leader role presets ───────────────────────────────────────
const LEADER_ROLE_PRESETS = [
  "Head Teacher / Director",
  "Deputy Head Teacher",
  "Academic Director",
  "School Bursar / Economist",
  "Director of Studies",
  "Head of Primary",
  "Head of Secondary",
  "Head of Nursery",
  "Head of Boarding",
  "School Counsellor",
  "ICT Coordinator",
  "Sports Coordinator",
  "Parent Committee Chair",
  "Other",
];

// ── blank leader row ──────────────────────────────────────────
const blankLeader = () => ({ name: "", role: "", phone: "", email: "" });

// ── STEPS — now 8 steps ───────────────────────────────────────
const STEPS = [
  { id: 1, label: "School & Classes", Icon: School },
  { id: 2, label: "Payments", Icon: DollarSign },
  { id: 3, label: "Requirements", Icon: ClipboardList },
  { id: 4, label: "Bank Account", Icon: Landmark },
  { id: 5, label: "Authorization", Icon: PenLine },
  { id: 6, label: "Class Notes", Icon: Layers },
  { id: 7, label: "Leaders", Icon: Users },
  { id: 8, label: "Preview & Submit", Icon: Eye },
];

const BANKS = [
  "Umwalimu SACCO","Bank of Kigali (BK)","Equity Bank Rwanda","I&M Bank Rwanda",
  "NCBA Bank Rwanda","Access Bank Rwanda","GT Bank Rwanda","Ecobank Rwanda",
  "BPR Bank Rwanda","KCB Bank Rwanda","Urwego Bank",
];

const blankBank = () => ({ bankName: "", accountNumber: "", accountName: "" });

function resolveUseParentMessage(rec) {
  if (rec?.showParentMessage != null) return !!rec.showParentMessage;
  if (rec?.show_parent_message != null) return !!Number(rec.show_parent_message);
  return !!(String(rec?.parentMessage || rec?.parent_message || "").trim());
}

function normalizeLeaderRow(l) {
  return {
    name:  String(l?.name || l?.leader_name || "").trim(),
    role:  String(l?.role || l?.leader_role || "").trim(),
    phone: String(l?.phone || "").trim(),
    email: String(l?.email || "").trim(),
  };
}

const buildBlankForm = (school = {}, categoryOverride, academicDefaults = {}) => ({
  schoolName:           school.name      || "",
  schoolCode:           school.code      || "",
  province:             school.province  || "",
  district:             school.district  || "",
  sector:               school.sector    || "",
  cell:                 school.cell      || "",
  village:              school.village   || "",
  schoolLogo:           null,
  otherLogo:            null,
  includeSchoolDetails: true,
  classes:              [],
  useParentMessage:     true,
  parentMessage:        "Dear Parents and Guardians,\n\nWe are pleased to inform you of the school fees for the upcoming term. Please find the detailed breakdown below.\n\nThank you for your continued support.",
  academicYear:         academicDefaults.academicYear || "2025-2026",
  term:                 academicDefaults.term || "Term 1",
  category:             categoryOverride ?? "Public",
  /** NESA / fee_limits row key — Nursery | Primary | Secondary | TSS (Tuition Manager). */
  nesaFeeLimitLevel:    "Primary",
  /** Public = NESA smart fee checker applies (when school allows); Private = no national limit checker. */
  feeTargetStudents:    "public",
  language:             "en",
  payments:             [{ name:"Tuition Fee", amount:"", pay_channel: "babyeyi" },{ name:"Activity Fee", amount:"", pay_channel: "babyeyi" }],
  requestIncrease:      false,
  requestTitle:         "",
  requestReasons:       [],
  requestOtherReason:   "",
  requestDescription:   "",
  parentApprovalDoc:    null,
  schoolBudgetDoc:      null,
  requirements:         [{ item: "", description: "", quantity: "", pay_channel: "babyeyi", cost: "" }],
  bankName:             "",
  accountNumber:        "",
  accountName:          school.name || "",
  extraBankAccounts:    [],
  directorSignature:    null,
  stamp:                null,
  classReqs:            [{ item:"", details:"" }],
  otherInfos:           [{ item:"" }],
  dateSigned:           "",
  // ── NEW: school leaders ────────────────────────────────────
  leaders:              [blankLeader()],
});

// ── Shared Input Styles ───────────────────────────────────────
const inp    = `w-full px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300`;
const inpFocus = { boxShadow: "0 0 0 2px rgba(254,191,16,0.25)", borderColor: C.gold };
const inpErr = `w-full px-3 py-2.5 bg-white border-2 border-red-300 rounded-xl text-sm text-slate-800 outline-none transition-all placeholder:text-red-200`;

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ value, onChange, label, sublabel }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border"
      style={{ background: C.goldBg, borderColor: C.goldBorder }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: C.dark }}>{label}</p>
        {sublabel && <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: C.goldDark }}>{sublabel}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)}
        className="relative shrink-0 ml-3 w-12 h-6 rounded-full transition-all duration-200"
        style={{ background: value ? C.gold : "#cbd5e1" }}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${value ? "left-6" : "left-0.5"}`} />
      </button>
    </div>
  );
}

// ── FileZone ──────────────────────────────────────────────────
function FileZone({ label, sublabel, required, file, onFile, accept = "image/*,application/pdf",
                    icon = "📎", previewUrl, compact, fromDB = false }) {
  const ref = useRef();
  return (
    <div>
      {label && (
        <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: C.darkMid }}>
          {label} {required && <span style={{ color: C.red }}>*</span>}
          {fromDB && !file && previewUrl && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold border"
              style={{ background: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" }}>
              
            </span>
          )}
        </p>
      )}
      {sublabel && <p className="text-[10px] mb-2" style={{ color: C.goldDark }}>{sublabel}</p>}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => onFile(e.target.files?.[0] || null)} />
      <div onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl cursor-pointer transition-all text-center flex flex-col items-center justify-center
          ${compact ? "p-2.5 min-h-[64px]" : "p-3 min-h-[80px]"}`}
        style={{
          borderColor: previewUrl && !file ? "#6ee7b7" : file ? C.emerald : C.goldBorder,
          background: previewUrl && !file ? "#f0fdf4" : file ? "#f0fdf4" : C.goldBg,
        }}>
        {previewUrl ? (
          <div className="relative w-full">
            <img src={previewUrl} alt="preview"
              className="max-h-12 mx-auto object-contain rounded shadow-sm" />
            <button type="button" onClick={e => { e.stopPropagation(); onFile(null); }}
              className="absolute -top-1 -right-1 w-4 h-4 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow"
              style={{ background: C.red }}>×</button>
            <p className="text-[9px] mt-1 font-semibold" style={{ color: C.slate }}>
              {file ? file.name : "Click to replace"}
            </p>
          </div>
        ) : file ? (
          <>
            <div className="text-lg mb-0.5">{icon}</div>
            <p className="text-[10px] font-bold truncate max-w-full px-2" style={{ color: C.emerald }}>{file.name}</p>
            <button type="button" onClick={e => { e.stopPropagation(); onFile(null); }}
              className="text-[9px] mt-0.5 font-semibold" style={{ color: C.red }}>Remove</button>
          </>
        ) : (
          <>
            <span className="text-xl opacity-25 mb-0.5">{icon}</span>
            <div className="flex items-center gap-1" style={{ color: C.goldDark }}>
              <I n="upload" size={10} /><span className="text-[10px]">Click to upload</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DocPreview({ form, previews }) {
  const total = form.payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
  const allBanks = [];
  if (form.bankName && form.accountNumber) {
    allBanks.push({ bankName: form.bankName, accountNumber: form.accountNumber, accountName: form.accountName });
  }
  (form.extraBankAccounts || []).forEach(b => {
    if (b.bankName && b.accountNumber) allBanks.push(b);
  });

  const visibleLeaders = (form.leaders || []).filter(l => l.name || l.role);

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-300 shadow text-[10px]"
      style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
      <div className="border-b-4 border-double border-slate-700 px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 border border-slate-300 rounded flex items-center justify-center bg-slate-50 shrink-0 overflow-hidden">
            {previews.schoolLogo
              ? <img src={previews.schoolLogo} className="w-full h-full object-contain" alt="logo"/>
              : <span className="text-2xl">🏫</span>}
          </div>
          <div className="flex-1 text-center">
            {form.includeSchoolDetails ? (
              <>
                <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Republic of Rwanda</p>
                <p className="font-semibold text-sm uppercase text-slate-900 leading-tight">{form.schoolName || "School Name"}</p>
                <p className="text-[8px] text-slate-500">{[form.district, form.sector, form.cell].filter(Boolean).join(" / ")}</p>
              </>
            ) : (
              <p className="font-semibold text-sm uppercase text-slate-900">BABYEYI DOCUMENT</p>
            )}
            <div className="inline-block border-t border-b border-slate-700 px-3 py-0.5 mt-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider">BABYEYI — {form.term} · {form.academicYear}</p>
            </div>
          </div>
          <div className="w-14 h-14 border border-slate-300 rounded flex items-center justify-center bg-slate-50 shrink-0 overflow-hidden">
            {previews.otherLogo
              ? <img src={previews.otherLogo} className="w-full h-full object-contain" alt="other logo"/>
              : <span className="text-xl"></span>}
          </div>
        </div>
      </div>
      <div className="px-5 py-2 flex items-center justify-between"
        style={{ background: C.dark }}>
        <div className="flex gap-2">{(form.classes && form.classes.length ? form.classes : ["—"]).map(c => (
          <span key={c} className="px-2 py-0.5 rounded text-[9px] font-semibold"
            style={{ background: C.gold, color: C.dark }}>{c}</span>
        ))}</div>
        <span className="text-[8px]" style={{ color: "#FED44A" }}>Kigali, le {form.dateSigned || new Date().toLocaleDateString('fr-FR')}</span>
      </div>
      <div className="px-5 py-3 space-y-3">
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-1 text-slate-600">MESSAGE AUX PARENTS</p>
          <p className="text-[9px] leading-relaxed text-slate-700 line-clamp-3">{form.parentMessage}</p>
        </div>
        <div>
          <p className="text-[8px] font-semibold uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-1 text-slate-600">FRAIS SCOLAIRES</p>
          <table className="w-full text-[9px]">
            <thead><tr style={{ background: C.goldBgMid }}>
              <th className="text-left px-2 py-1 font-bold">Désignation</th>
              <th className="text-right px-2 py-1 font-bold">Montant (RWF)</th>
            </tr></thead>
            <tbody>
              {form.payments.filter(p=>p.name&&p.amount).map((p,i)=>(
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-2 py-1">{p.name}</td>
                  <td className="px-2 py-1 text-right font-semibold">{Number(p.amount).toLocaleString()}</td>
                </tr>
              ))}
              <tr style={{ background: C.dark }}>
                <td className="px-2 py-1 font-semibold" style={{ color: C.gold }}>TOTAL</td>
                <td className="px-2 py-1 text-right font-semibold" style={{ color: C.gold }}>RWF {total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {allBanks.length > 0 && (
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-1 text-slate-600">
              COMPTE{allBanks.length > 1 ? "S" : ""} BANCAIRE{allBanks.length > 1 ? "S" : ""}
            </p>
            <div className="space-y-1">
              {allBanks.map((b, idx) => (
                <div key={idx} className="rounded px-3 py-1.5 text-[9px] space-y-0.5 border"
                  style={{ background: C.goldBg, borderColor: C.goldBorder }}>
                  {allBanks.length > 1 && <p className="text-[8px] font-semibold" style={{ color: C.goldDark }}>Bank {idx + 1}</p>}
                  {b.bankName && <p><b>Banque:</b> {b.bankName}</p>}
                  {b.accountNumber && <p><b>N° Compte:</b> <span className="font-mono">{b.accountNumber}</span></p>}
                  {b.accountName && <p><b>Nom:</b> {b.accountName}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Leaders mini preview ─────────────────────────── */}
        {visibleLeaders.length > 0 && (
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-1 text-slate-600">
              SCHOOL LEADERSHIP CONTACTS
            </p>
            <div className="grid grid-cols-2 gap-1">
              {visibleLeaders.slice(0, 4).map((l, i) => (
                <div key={i} className="rounded px-2 py-1 text-[8px] border"
                  style={{ background: C.goldBg, borderColor: C.goldBorder }}>
                  <p className="font-semibold truncate" style={{ color: C.dark }}>{l.name || "—"}</p>
                  <p className="truncate" style={{ color: C.goldDark }}>{l.role || "—"}</p>
                  {l.phone && <p className="font-mono text-slate-500">{l.phone}</p>}
                </div>
              ))}
            </div>
            {visibleLeaders.length > 4 && (
              <p className="text-[8px] mt-1" style={{ color: C.goldDark }}>
                +{visibleLeaders.length - 4} more leaders
              </p>
            )}
          </div>
        )}

        <div>
          <p className="text-[8px] font-semibold uppercase tracking-widest border-b border-slate-200 pb-0.5 mb-2 text-slate-600">SIGNATURES & CACHETS</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l:"Directeur", s:previews.directorSignature, e:"✍️" },
              { l:"Économe",   s:null,                        e:"✍️" },
              { l:"Cachet",    s:previews.stamp,              e:"🔏" },
            ].map((x,i)=>(
              <div key={i} className="border border-dashed border-slate-200 rounded p-2">
                {x.s ? <img src={x.s} alt={x.l} className="max-h-7 mx-auto object-contain mb-0.5"/> : <div className="text-base opacity-20">{x.e}</div>}
                <p className="text-[7px] text-slate-400 font-bold border-t border-slate-100 pt-0.5 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// WIZARD (create + edit — shared by full page and modals)
// ════════════════════════════════════════════════════════════
export function WizardContent({ session, onClose, onSuccess, editRecord = null, embedded = false, listTheme = false }) {
  const schoolId = session?.schoolId ?? null;
  const academic = useAcademic();

  const academicYearOptions = academic.academicYears?.length
    ? academic.academicYears
    : (academic.academicYear ? [academic.academicYear] : ["2025-2026", "2024-2025", "2026-2027"]);
  const termOptions = academic.activeTerms?.length
    ? academic.activeTerms
    : ["Term 1", "Term 2", "Term 3"];

  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors,    setErrors]    = useState({});
  const stepBtnRefs = useRef({});

  const [previews, setPreviews] = useState({
    schoolLogo:        null,
    otherLogo:         null,
    directorSignature: null,
    stamp:             null,
  });

  const [dbAssets, setDbAssets] = useState({
    schoolLogo:        false,
    directorSignature: false,
    stamp:             false,
  });

  const [nesaLimit,        setNesaLimit]        = useState(null);
  const [nesaLimitLoading, setNesaLimitLoading] = useState(false);
  const [nesaLimitSource,  setNesaLimitSource]  = useState("default");
  const [generatedQRCodes, setGeneratedQRCodes] = useState([]);
  const [qrGenerating,     setQrGenerating]     = useState(false);
  const [schoolInfoLoaded, setSchoolInfoLoaded] = useState(false);
  /** pending until /babyeyi/school-info returns — then public | private | aided | unknown */
  const [schoolFeeScope, setSchoolFeeScope] = useState("pending");
  const [schoolKind, setSchoolKind] = useState("unknown");
  const [categoryLockedBySchool, setCategoryLockedBySchool] = useState(false);
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [studentReqCatalog, setStudentReqCatalog] = useState([]);
  const [studentReqCatalogLoading, setStudentReqCatalogLoading] = useState(true);
  const [studentReqCatalogError, setStudentReqCatalogError] = useState(null);
  /** Distinct class labels from school_classes + students (GET /api/schools/:id/classes). */
  const [registeredClassOptions, setRegisteredClassOptions] = useState([]);
  const [registeredClassRows, setRegisteredClassRows] = useState([]);
  const [registeredClassesLoading, setRegisteredClassesLoading] = useState(false);
  const [editId, setEditId] = useState(editRecord?.id ?? null);

  useEffect(() => {
    stepBtnRefs.current[step]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step]);

  const classRowMap = useMemo(() => {
    const merged = mergeWithDefaultClassCatalog(registeredClassOptions, registeredClassRows);
    return buildClassRowMap(merged.rows, merged.options);
  }, [registeredClassRows, registeredClassOptions]);

  const classOptions = useMemo(
    () => mergeWithDefaultClassCatalog(registeredClassOptions, registeredClassRows).options,
    [registeredClassRows, registeredClassOptions],
  );

  const classRows = useMemo(
    () => mergeWithDefaultClassCatalog(registeredClassOptions, registeredClassRows).rows,
    [registeredClassRows, registeredClassOptions],
  );

  const classGroups = useMemo(
    () => buildClassGroupsFromRows(classRows, classOptions),
    [classRows, classOptions],
  );

  const levelOptions = useMemo(
    () => levelsPresentInCatalog(registeredClassOptions, registeredClassRows),
    [registeredClassOptions, registeredClassRows],
  );

  const filteredClassGroups = useMemo(
    () => filterClassGroupsByLevel(classGroups, form?.nesaFeeLimitLevel, classRowMap),
    [classGroups, form?.nesaFeeLimitLevel, classRowMap],
  );

  const handleEducationLevelChange = useCallback((levelId) => {
    const level = normalizeEducationLevel(levelId);
    setForm((prev) => {
      if (!prev) return prev;
      const pruned = pruneSelectedToLevel(prev.classes || [], level, classOptions, classRowMap);
      const levelLabels = filterLabelsByLevel(classOptions, level, classRowMap);
      const nextClasses = pruned.length ? pruned : (levelLabels[0] ? [levelLabels[0]] : []);
      return {
        ...prev,
        nesaFeeLimitLevel: mapToNesaLimitLevel(level),
        classes: nextClasses,
      };
    });
  }, [classOptions, classRowMap]);

  useEffect(() => {
    if (editRecord) return;
    if (academic.loading) return;
    const schoolPayload = {
      name:     session?.schoolName     ?? "",
      province: session?.schoolProvince ?? "",
      district: session?.schoolDistrict ?? "",
    };
    const academicDefaults = {
      academicYear: academic.academicYear,
      term: academic.currentTerm,
    };
    setForm((prev) => {
      if (!prev) return buildBlankForm(schoolPayload, undefined, academicDefaults);
      if (prev._academicFromSettings) return prev;
      if (!academicDefaults.academicYear) return prev;
      return {
        ...prev,
        academicYear: academicDefaults.academicYear,
        term: academicDefaults.term || prev.term,
        _academicFromSettings: true,
      };
    });
  }, [
    editRecord,
    academic.loading,
    academic.academicYear,
    academic.currentTerm,
    session?.schoolName,
    session?.schoolProvince,
    session?.schoolDistrict,
  ]);

  useEffect(() => {
    if (editRecord) {
      const rec = editRecord;
      const normalizeReqRow = (r) => ({
        item:         r?.item ?? "",
        description:  r?.description ?? "",
        quantity:     r?.quantity ?? "",
        pay_channel:  String(r?.pay_channel || r?.payChannel || "").toLowerCase() === "school" ? "school" : "babyeyi",
        cost:         r?.cost != null && r?.cost !== "" ? String(r.cost) : "",
      });
      const parsedPayments = (() => {
        try {
          const raw = typeof rec.payments === "string" ? JSON.parse(rec.payments) : (rec.payments || []);
          if (!Array.isArray(raw)) return [];
          return raw.map((p) => ({
            name: p?.name ?? "",
            amount: p?.amount != null && p?.amount !== "" ? String(p.amount) : "",
            pay_channel:
              String(p?.pay_channel || p?.payChannel || "babyeyi").toLowerCase() === "school" ? "school" : "babyeyi",
          }));
        } catch {
          return [];
        }
      })();
      const parsedReqsRaw = (() => {
        try { return typeof rec.requirements === "string" ? JSON.parse(rec.requirements) : (rec.requirements || []); }
        catch { return []; }
      })();
      const parsedReqs = Array.isArray(parsedReqsRaw) && parsedReqsRaw.length
        ? parsedReqsRaw.map(normalizeReqRow)
        : [normalizeReqRow({ item: "", description: "", quantity: "" })];
      const parsedOtherInfos = (() => {
        try { return typeof rec.otherInfos === "string" ? JSON.parse(rec.otherInfos) : (rec.otherInfos || []); }
        catch { return []; }
      })();
      const parsedBanks = (() => {
        try {
          const b = typeof rec.banksJson === "string" ? JSON.parse(rec.banksJson) : (rec.banksJson || []);
          return Array.isArray(b) ? b : [];
        } catch { return []; }
      })();
      const parsedLeaders = (() => {
        try {
          const raw = rec.leaders;
          if (!raw) return [blankLeader()];
          const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (!Array.isArray(arr) || !arr.length) return [blankLeader()];
          return arr.map(normalizeLeaderRow);
        } catch { return [blankLeader()]; }
      })();
      const primaryBank = parsedBanks[0] || {};
      const extraBanks  = parsedBanks.slice(1);
      const clsList = Array.isArray(rec.classes) && rec.classes.length
        ? rec.classes
        : (rec.class ? [rec.class] : (rec.className ? [rec.className] : ["P1"]));
      const feeLevel = rec.nesaFeeLimitLevel || rec.level || inferNesaFeeLimitLevelFromClass(clsList[0] || "");
      setForm({
        ...buildBlankForm({ name: rec.schoolName || session?.schoolName || "" }),
        schoolName:    rec.schoolName    || session?.schoolName || "",
        province:      rec.province      || "",
        district:      rec.district      || "",
        sector:        rec.sector        || "",
        cell:          rec.cell          || "",
        village:       rec.village       || "",
        academicYear:  rec.academicYear  || "2025-2026",
        term:          rec.term          || "Term 1",
        nesaFeeLimitLevel: NESA_FEE_LIMIT_LEVELS.includes(feeLevel) ? feeLevel : inferNesaFeeLimitLevelFromClass(clsList[0] || ""),
        category:      rec.category      || "Public",
        language:      rec.language      || "en",
        classes:       clsList,
        useParentMessage: resolveUseParentMessage(rec),
        parentMessage: rec.parentMessage || "",
        payments:      parsedPayments.length ? parsedPayments : [{ name: "Tuition Fee", amount: "", pay_channel: "babyeyi" }],
        requirements:  parsedReqs,
        otherInfos:    parsedOtherInfos.length ? parsedOtherInfos : [{ item: "" }],
        bankName:      primaryBank.bankName      || rec.bankName      || "",
        accountNumber: primaryBank.accountNumber || rec.bankAccountNo || "",
        accountName:   primaryBank.accountName   || rec.bankAccountName || "",
        extraBankAccounts: extraBanks,
        schoolLogo: null, otherLogo: null, directorSignature: null, stamp: null,
        requestIncrease: !!(rec.requestIncrease || rec.increaseRequest),
        requestTitle: rec.requestTitle || rec.increaseRequest?.requestTitle || "",
        requestReasons: Array.isArray(rec.requestReasons) ? rec.requestReasons : [],
        requestDescription: rec.requestDescription || "",
        requestOtherReason: rec.requestOtherReason || "",
        classReqs: (Array.isArray(rec.classNotes) && rec.classNotes.length
          ? rec.classNotes.map((n) => ({ item: n.item || "", details: n.details || "" }))
          : (Array.isArray(rec.classReqs) && rec.classReqs.length
            ? rec.classReqs
            : [{ item: "", details: "" }])),
        dateSigned: "",
        leaders: parsedLeaders,
        feeTargetStudents: String(rec.category || "").toLowerCase() === "private" ? "private" : "public",
      });
      const logoPreview = rec.logoUrl || toAssetUrl(rec.schoolLogoPath);
      const sigPreview = rec.signatureUrl || toAssetUrl(rec.signaturePath);
      const stampPreview = rec.stampUrl || toAssetUrl(rec.stampPath);
      const otherLogoPreview = rec.otherLogoUrl || toAssetUrl(rec.otherLogoPath);
      if (logoPreview) setPreviews((p) => ({ ...p, schoolLogo: logoPreview }));
      if (otherLogoPreview) setPreviews((p) => ({ ...p, otherLogo: otherLogoPreview }));
      if (sigPreview) setPreviews((p) => ({ ...p, directorSignature: sigPreview }));
      if (stampPreview) setPreviews((p) => ({ ...p, stamp: stampPreview }));
      setDbAssets({
        schoolLogo: !!logoPreview,
        directorSignature: !!sigPreview,
        stamp: !!stampPreview,
      });
      setEditId(rec.id);
    } else {
      const academicDefaults = academic.loading
        ? {}
        : { academicYear: academic.academicYear, term: academic.currentTerm };
      setForm(buildBlankForm({
        name:     session?.schoolName     ?? "",
        province: session?.schoolProvince ?? "",
        district: session?.schoolDistrict ?? "",
      }, undefined, academicDefaults));
      setEditId(null);
    }
  }, [editRecord?.id, session?.schoolName, session?.schoolProvince, session?.schoolDistrict, academic.loading, academic.academicYear, academic.currentTerm]);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/babyeyi/school-info`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.data?.school) {
          if (!cancelled) setSchoolFeeScope("unknown");
          return;
        }
        if (cancelled) return;
        const info = json.data.school;
        const mapped = mapSchoolOwnershipToFeeScope(info.ownership);
        if (!cancelled) {
          setSchoolFeeScope(mapped.feeScope);
          setSchoolKind(mapped.schoolKind || "unknown");
          setCategoryLockedBySchool(!!mapped.lockCategory);
        }
        const isEditing = !!(editRecord?.id);
        if (!isEditing) {
        setForm(prev => {
          const base = prev || buildBlankForm({
            name:     info.school_name,
            province: info.province,
            district: info.district,
            sector:   info.sector,
          });
          const feeTargetStudents =
            mapped.schoolKind === "private" ? "private" : "public";
          let nextCategory = base.category || "Public";
          if (mapped.lockCategory && mapped.category) {
            nextCategory = mapped.category;
          } else if (mapped.schoolKind === "government_aided") {
            if (feeTargetStudents === "private") nextCategory = "Private";
            else if (!["Public", "Boarding", "TVET"].includes(nextCategory)) nextCategory = "Public";
          }
          return {
            ...base,
            schoolName:  info.school_name   || base.schoolName  || "",
            schoolCode:  info.school_code   || base.schoolCode  || "",
            province:    info.province      || base.province    || "",
            district:    info.district      || base.district    || "",
            sector:      info.sector        || base.sector      || "",
            cell:        info.cell          || base.cell        || "",
            village:     info.village       || base.village     || "",
            accountName: base.accountName   || info.school_name || "",
            feeTargetStudents,
            category:    nextCategory,
          };
        });
        }
        const logoUrl = toAssetUrl(info.logo_url);
        const sigUrl  = toAssetUrl(info.head_teacher_signature_url);
        const stmpUrl = toAssetUrl(info.stamp_url);
        setPreviews(prev => ({
          ...prev,
          schoolLogo:        isEditing ? (prev.schoolLogo || logoUrl) : (logoUrl || prev.schoolLogo || null),
          directorSignature: isEditing ? (prev.directorSignature || sigUrl) : (sigUrl || prev.directorSignature || null),
          stamp:             isEditing ? (prev.stamp || stmpUrl) : (stmpUrl || prev.stamp || null),
        }));
        setDbAssets(prev => ({
          schoolLogo:        isEditing ? (!!prev.schoolLogo || !!logoUrl) : !!logoUrl,
          directorSignature: isEditing ? (!!prev.directorSignature || !!sigUrl) : !!sigUrl,
          stamp:             isEditing ? (!!prev.stamp || !!stmpUrl) : !!stmpUrl,
        }));
        setSchoolInfoLoaded(true);
      } catch (e) {
        console.warn("[school-info]", e.message);
        if (!cancelled) setSchoolFeeScope("unknown");
      }
    })();
    return () => { cancelled = true; };
  }, [schoolId, editRecord?.id]);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setRegisteredClassesLoading(true);
    fetch(`${API_BASE}/schools/${schoolId}/classes`, { credentials: "include" })
      .then((r) => r.json().catch(() => ({})))
      .then((json) => {
        if (cancelled) return;
        const opts = Array.isArray(json.class_name_options) ? json.class_name_options : [];
        const rows = Array.isArray(json.data) ? json.data : [];
        setRegisteredClassOptions(opts);
        setRegisteredClassRows(rows);
        if (!opts.length) return;
        setForm((prev) => {
          if (!prev) return prev;
          const prevArr = Array.isArray(prev.classes) ? prev.classes : [];
          const kept = sortSelectedClassesByCatalog(prevArr, opts);
          if (kept.length) {
            const first = kept[0];
            return {
              ...prev,
              classes: kept,
              nesaFeeLimitLevel: inferNesaFeeLimitLevelFromClass(first, classRowMap.get(first)),
            };
          }
          const first = opts[0];
          return {
            ...prev,
            classes: [first],
            nesaFeeLimitLevel: inferNesaFeeLimitLevelFromClass(first, classRowMap.get(first)),
          };
        });
      })
      .catch(() => {
        if (!cancelled) setRegisteredClassOptions([]);
      })
      .finally(() => {
        if (!cancelled) setRegisteredClassesLoading(false);
      });
    return () => { cancelled = true; };
  }, [schoolId]);

  useEffect(() => {
    if (!form || step !== 1) return;
    const opts = categoryOptionsForWizard(schoolKind, form.feeTargetStudents);
    if (!opts.includes(form.category)) {
      setForm((f) => (f ? { ...f, category: opts[0] } : f));
    }
  }, [schoolKind, form?.feeTargetStudents, form?.category, step]);

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setStudentReqCatalogLoading(true);
    setStudentReqCatalogError(null);
    fetch(`${API_BASE}/babyeyi/student-requirements-catalog`, { credentials: "include" })
      .then(r => r.json().catch(() => ({})))
      .then(json => {
        if (cancelled) return;
        if (!json.success || !Array.isArray(json.data)) {
          setStudentReqCatalogError(json.message || "Could not load requirements catalog");
          setStudentReqCatalog([]);
          return;
        }
        setStudentReqCatalog(json.data);
      })
      .catch(e => {
        if (!cancelled) {
          setStudentReqCatalogError(e.message || "Network error");
          setStudentReqCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setStudentReqCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, [schoolId]);

  const up = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!form) return;
    ["schoolLogo","otherLogo","directorSignature","stamp"].forEach(key => {
      if (form[key] instanceof File) {
        const url = URL.createObjectURL(form[key]);
        setPreviews(p => ({ ...p, [key]: url }));
        return () => URL.revokeObjectURL(url);
      }
    });
  }, [form?.schoolLogo, form?.otherLogo, form?.directorSignature, form?.stamp]);

  useEffect(() => {
    if (!form) return;
    if (schoolFeeScope === "pending") return;
    if (schoolFeeScope === "private" || form.feeTargetStudents === "private") {
      setNesaLimit(null);
      setNesaLimitSource(form.feeTargetStudents === "private" ? "private_cohort" : "private");
      setNesaLimitLoading(false);
      return;
    }
    const { category, term, academicYear } = form;
    const level = form.nesaFeeLimitLevel || inferNesaFeeLimitLevelFromClass(form.classes?.[0] || "");
    if (!category || !term || !academicYear) return;
    setNesaLimit(null);
    setNesaLimitSource("loading");
    const qp = `category=${encodeURIComponent(category)}&level=${encodeURIComponent(level)}&term=${encodeURIComponent(term)}&academic_year=${encodeURIComponent(academicYear)}`;
    setNesaLimitLoading(true);
    const ac = new AbortController();
    const applyLimit    = (max, src) => { if (!ac.signal.aborted) { setNesaLimit(Number(max)); setNesaLimitSource(src); } };
    const applyNotFound = ()         => { if (!ac.signal.aborted) { setNesaLimit(null); setNesaLimitSource("none"); } };
    fetch(`${API_BASE}/babyeyi/nesa-limit?${qp}`, { credentials:"include", signal:ac.signal })
      .then(r => r.json())
      .then(json => {
        if (ac.signal.aborted) return;
        if (json.success && json.data?.max_amount != null) { applyLimit(json.data.max_amount, "backend"); return; }
        return fetch(
          `${API_BASE}/fee-limits?category=${encodeURIComponent(category)}&level=${encodeURIComponent(level)}&academic_year=${encodeURIComponent(academicYear)}&active=1&limit=50`,
          { credentials: "include", signal: ac.signal }
        )
          .then(r2 => r2.json())
          .then(j2 => {
            if (ac.signal.aborted) return;
            const rows = Array.isArray(j2?.data) ? j2.data : [];
            const normLevel = String(level).toLowerCase();
            const normTerm = String(term).trim();
            const normYear = String(academicYear).trim();
            const termMatches = (row) =>
              row.term === normTerm || (normTerm !== "Full Year" && row.term === "Full Year");
            const levelMatches = (row) =>
              String(row.level || "").toLowerCase() === normLevel;
            const categoryMatches = (row) => row.category === category;

            let matches = rows.filter(
              (row) =>
                categoryMatches(row) &&
                levelMatches(row) &&
                row.academic_year === normYear &&
                termMatches(row)
            );
            if (!matches.length) {
              matches = rows.filter(
                (row) => categoryMatches(row) && levelMatches(row) && termMatches(row)
              );
              matches.sort((a, b) =>
                String(b.academic_year || "").localeCompare(String(a.academic_year || ""))
              );
            }
            const m =
              matches.find((row) => row.term === normTerm) ||
              matches.find((row) => row.term === "Full Year");
            if (m?.max_amount != null) applyLimit(m.max_amount, "backend");
            else applyNotFound();
          });
      })
      .catch(err => { if (err?.name !== "AbortError") applyNotFound(); })
      .finally(() => { if (!ac.signal.aborted) setNesaLimitLoading(false); });
    return () => ac.abort();
  }, [form?.category, form?.classes, form?.term, form?.academicYear, form?.feeTargetStudents, form?.nesaFeeLimitLevel, schoolFeeScope]);

  if (!form) {
    return (
      <div className={embedded ? "flex flex-1 items-center justify-center min-h-[240px]" : "min-h-screen flex items-center justify-center"} style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: C.goldBgMid, borderTopColor: C.gold }}/>
          <p className="text-sm font-semibold" style={{ color: C.goldDark }}>
            {editRecord ? "Loading Babyeyi…" : "Loading school data…"}
          </p>
        </div>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <div className="bg-white rounded-2xl border-2 border-red-200 p-8 max-w-md text-center shadow-lg">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-semibold text-lg mb-2" style={{ color: C.red }}>Session Error</h2>
          <p className="text-slate-600 text-sm">School ID not found in session. Please log out and log back in with your school manager account.</p>
        </div>
      </div>
    );
  }

  const totalFee = form.payments.reduce((s,p) => s + (Number(p.amount)||0), 0);
  const nesaApplies =
    form.feeTargetStudents === "public" &&
    schoolFeeScope !== "private" &&
    schoolFeeScope !== "pending";
  const exceeds  = nesaApplies && nesaLimit !== null && totalFee > nesaLimit;
  const overBy   = exceeds ? totalFee - nesaLimit : 0;
  if (!exceeds && form.requestIncrease) up("requestIncrease", false);

  const validateStep2 = () => {
    const errs = {};
    if (!form.payments.some(p => p.name && p.amount)) errs.payments = "At least one payment item required";
    if (exceeds && form.requestIncrease) {
      if (!form.requestTitle.trim())       errs.requestTitle       = "Request title is required";
      if (!form.requestDescription.trim()) errs.requestDescription = "Description is required";
      if (!form.parentApprovalDoc)         errs.parentApprovalDoc  = "Parent approval document required";
      if (!form.schoolBudgetDoc)           errs.schoolBudgetDoc    = "School budget document required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (registeredClassesLoading) {
        showToast("Still loading your school classes…", "error");
        return;
      }
      if (!form?.classes?.length) {
        showToast("Please select at least one class.", "error");
        return;
      }
    }
    if (step === 2 && !validateStep2()) { showToast("Please fix the highlighted fields", "error"); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const handleSave = async () => {
    if (step === 8 && !validateStep2()) { showToast("Validation errors in Step 2.", "error"); return; }
    if (!schoolId) { showToast("School ID missing from session.", "error"); return; }

    const allClasses = form.classes?.length ? form.classes : [];
    if (!allClasses.length) {
      showToast("Select at least one class before submitting.", "error");
      return;
    }
    const classesToCreate = allClasses;
    const feeLimitLevel =
      form.nesaFeeLimitLevel ||
      inferNesaFeeLimitLevelFromClass(classesToCreate[0] || "");
    setSaving(true);
    const createdIds = [];

    const allBanks = [];
    if (form.bankName || form.accountNumber) {
      allBanks.push({ bankName: form.bankName || "", accountNumber: form.accountNumber || "", accountName: form.accountName || "", isPrimary: true });
    }
    (form.extraBankAccounts || []).forEach(b => {
      if (b.bankName || b.accountNumber) allBanks.push({ ...b, isPrimary: false });
    });

    // Filter valid leaders (must have at least name or role)
    const validLeaders = (form.leaders || []).filter(l => l.name?.trim() || l.role?.trim());

    try {
      const primaryClass = classesToCreate[0];
      const fd = new FormData();
      fd.append("school_id",         schoolId);
      fd.append("academic_year",     form.academicYear);
      fd.append("term",              form.term);
      fd.append("class_name",        primaryClass);
      fd.append("class",             primaryClass);
      fd.append("classes",           JSON.stringify(classesToCreate));
      fd.append("education_level",   feeLimitLevel);
      fd.append("level",             feeLimitLevel);
      fd.append("school_category",   form.category);
      fd.append("category",          form.category);
      fd.append(
        "ownership_type",
        schoolFeeScope === "private"
          ? "Private"
          : schoolKind === "government_aided"
            ? "Government-Aided"
            : schoolFeeScope === "public"
              ? "Government"
              : (form.category === "Private" ? "Private" : "Government")
      );
      fd.append("fee_target_students", form.feeTargetStudents === "private" ? "private" : "public");
      fd.append("school_province",   form.province  || "");
      fd.append("province",          form.province  || "");
      fd.append("school_district",   form.district  || "");
      fd.append("district",          form.district  || "");
      fd.append("school_sector",     form.sector    || "");
      fd.append("sector",            form.sector    || "");
      fd.append("cell",              form.cell      || "");
      fd.append("village",          form.village   || "");
      fd.append("language",          form.language  || "en");
      fd.append("parent_message",    form.useParentMessage ? (form.parentMessage || "") : "");
      fd.append("show_parent_message", form.useParentMessage ? "1" : "0");
      fd.append("bank_name",         form.bankName      || "");
      fd.append("bank_account_no",   form.accountNumber || "");
      fd.append("bank_account_name", form.accountName   || "");
      fd.append("banks_json",        JSON.stringify(allBanks));
      fd.append("extra_bank_accounts", JSON.stringify(form.extraBankAccounts || []));
      fd.append("payments",          JSON.stringify(form.payments   || []));
      fd.append("requirements",      JSON.stringify(form.requirements || []));
      fd.append("classReqs",         JSON.stringify(form.classReqs  || []));
      fd.append("other_infos",       JSON.stringify(form.otherInfos || []));
      fd.append("request_increase",  form.requestIncrease ? "true" : "false");
      fd.append("increase_reason",   form.requestTitle || "");
      fd.append("increase_desc",     form.requestDescription || "");
      fd.append("request_reasons",   JSON.stringify(form.requestReasons || []));
      fd.append("request_other_reason", form.requestOtherReason || "");
      // ── NEW: leaders ─────────────────────────────────────
      fd.append("leaders",           JSON.stringify(validLeaders));

      if (form.schoolLogo        instanceof File) fd.append("school_logo",        form.schoolLogo);
      if (form.otherLogo         instanceof File) fd.append("other_logo",         form.otherLogo);
      if (form.directorSignature instanceof File) fd.append("director_signature", form.directorSignature);
      if (form.stamp             instanceof File) fd.append("stamp",              form.stamp);
      if (form.parentApprovalDoc instanceof File) fd.append("parent_rep_doc",     form.parentApprovalDoc);
      if (form.schoolBudgetDoc   instanceof File) fd.append("budget_doc",         form.schoolBudgetDoc);

      const url = editId ? `${API_BASE}/babyeyi/${editId}` : `${API_BASE}/babyeyi`;
      const method = editId ? "PUT" : "POST";
      const res  = await fetch(url, { method, body: fd, credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.detail || json.message || "Failed to save Babyeyi");
      }
      const savedId = json.data?.id ?? json.data?.ID ?? editId;
      if (savedId) {
        createdIds.push({
          id: savedId,
          classes: classesToCreate,
          docId: json.data.doc_id || json.data.docId || null,
          integrityHash: json.data.integrity_hash || json.data.integrityHash || null,
        });
      }

      showToast(editId ? "Babyeyi updated successfully!" : "Babyeyi saved successfully!", "success");
      if (onSuccess) onSuccess();
      setQrGenerating(true);

      const qrResults = [];
      for (const { id, classes, docId, integrityHash } of createdIds) {
        try {
          const qrRes  = await fetch(`${API_BASE}/babyeyi/${id}/qrcode`, { credentials:"include" });
          const qrJson = await qrRes.json();
          if (qrJson.success && qrJson.data?.qr_code_url) {
            const verifyDocId = docId || qrJson.data.doc_id || null;
            qrResults.push({
              id,
              classes,
              qrDataUrl: qrJson.data.qr_code_url,
              viewUrl: verifyDocId
                ? babyeyiVerifyScanUrl(verifyDocId, integrityHash)
                : (qrJson.data.qr_view_url || `${BABYEYI_VERIFY_PUBLIC_ORIGIN}/babyeyi/verify`),
            });
          }
        } catch (e) { console.warn(`[QR] Failed for ${id}:`, e.message); }
      }
      setGeneratedQRCodes(qrResults);
      setQrGenerating(false);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to save Babyeyi", "error");
    } finally {
      setSaving(false);
      setQrGenerating(false);
    }
  };

  // ── Success screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-start justify-center p-6 overflow-y-auto"
        style={{ background: `linear-gradient(135deg, ${C.goldBg}, #fff, ${C.goldBgMid})`, fontFamily: "'Montserrat', sans-serif" }}>
        <div className="text-center max-w-lg w-full py-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, boxShadow: "0 8px 30px rgba(254,191,16,0.45)" }}>
            <Svg d={ic.check} size={36} color={C.dark} sw={3} />
          </div>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: C.dark }}>Babyeyi Generated!</h2>
          <p className="text-slate-500 text-sm mb-4">
            {form.classes.length} record{form.classes.length > 1 ? "s" : ""} created for:{" "}
            <strong style={{ color: C.goldDark }}>{form.classes.join(", ")}</strong>
          </p>

          {qrGenerating ? (
            <div className="mb-5 p-4 rounded-2xl flex flex-col items-center gap-2 border"
              style={{ background: C.goldBg, borderColor: C.goldBorder }}>
              <div className="w-8 h-8 border-4 rounded-full animate-spin"
                style={{ borderColor: C.goldBgMid, borderTopColor: C.gold }}/>
              <p className="text-xs font-bold" style={{ color: C.goldDark }}>Loading QR codes from server…</p>
            </div>
          ) : generatedQRCodes.length > 0 ? (
            <div className="mb-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <I n="qr" size={14} color={C.gold} />
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>
                  QR Code{generatedQRCodes.length > 1 ? "s" : ""} — Scan to View
                </p>
              </div>
              {generatedQRCodes.length === 1 ? (
                <div className="rounded-2xl p-4 text-center border-2"
                  style={{ background: C.goldBg, borderColor: C.goldBorder }}>
                  <div className="flex justify-center mb-3">
                    <div className="bg-white rounded-xl p-3 border-2 shadow-md inline-block" style={{ borderColor: C.goldBorder }}>
                      <img src={generatedQRCodes[0].qrDataUrl.startsWith("http")
                        ? `${ASSET_BASE}${generatedQRCodes[0].qrDataUrl}`
                        : generatedQRCodes[0].qrDataUrl}
                        alt="QR Code" className="w-24 h-24 object-contain" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 mb-2 font-mono">{generatedQRCodes[0].viewUrl}</p>
                  <button onClick={() => navigator.clipboard.writeText(generatedQRCodes[0].viewUrl)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold mx-auto"
                    style={{ background: C.gold, color: C.dark }}>
                    <I n="copy" size={10} color={C.dark} /> Copy Link
                  </button>
                </div>
              ) : (
                <div className={`grid gap-3 ${generatedQRCodes.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {generatedQRCodes.map(qr => (
                    <div key={qr.id} className="rounded-xl p-3 text-center border-2"
                      style={{ background: C.goldBg, borderColor: C.goldBorder }}>
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[9px] font-semibold mb-2"
                        style={{ background: C.gold, color: C.dark }}>{qr.cls}</span>
                      <div className="flex justify-center mb-2">
                        <div className="bg-white rounded-lg p-2 border shadow-sm" style={{ borderColor: C.goldBorder }}>
                          <img src={qr.qrDataUrl.startsWith("http") ? `${ASSET_BASE}${qr.qrDataUrl}` : qr.qrDataUrl}
                            alt={`QR ${qr.cls}`} className="w-16 h-16 object-contain" />
                        </div>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(qr.viewUrl)}
                        className="px-1.5 py-1 rounded text-[8px] font-bold"
                        style={{ background: C.gold, color: C.dark }}>Copy</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-5 text-left">
            {[
              { label:"School",    val: form.schoolName || session?.schoolName || "—" },
              { label:"Year",      val: form.academicYear },
              { label:"Term",      val: form.term },
              { label:"Total Fee", val: `RWF ${totalFee.toLocaleString()}` },
              { label:"Bank",      val: form.bankName || "—" },
              { label:"Status",    val: !nesaApplies ? "✅ Submitted" : (exceeds && form.requestIncrease ? "⏳ Pending" : "✅ Approved") },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-bold uppercase" style={{ color: C.goldDark }}>{f.label}</p>
                <p className="text-sm font-bold text-slate-800 truncate">{f.val}</p>
              </div>
            ))}
          </div>
          <button onClick={() => {
            const nextCat =
              schoolKind === "private" ? "Private"
                : schoolKind === "government" ? "Public"
                : "Public";
            setForm({
              ...buildBlankForm(
                { name: session?.schoolName || "", province: session?.schoolProvince || "", district: session?.schoolDistrict || "" },
                schoolKind === "private" ? "Private" : schoolKind === "government" ? "Public" : undefined,
                { academicYear: academic.academicYear, term: academic.currentTerm }
              ),
              feeTargetStudents: schoolKind === "private" ? "private" : "public",
              category: schoolKind === "government_aided" ? "Public" : nextCat,
            });
            setSubmitted(false); setStep(1); setErrors({}); setGeneratedQRCodes([]);
            setDbAssets({ schoolLogo:false, directorSignature:false, stamp:false });
            setPreviews({ schoolLogo:null, otherLogo:null, directorSignature:null, stamp:null });
          }}
            className="px-5 py-2.5 rounded-2xl font-bold shadow-lg text-sm transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, color: C.dark, boxShadow: "0 4px 15px rgba(254,191,16,0.4)" }}>
            Create Another
          </button>
        </div>
      </div>
    );
  }

  // ── Step renderers ────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ════════════════════════════════════════════════
      // STEP 1 — School & Classes
      // ════════════════════════════════════════════════
      case 1: {
        // Ensure DB-provided current values always appear in dropdown options.
        const provinceNames = Array.from(new Set([
          ...Object.keys(RW_LOCATIONS),
          form.province,
        ].filter(Boolean)));

        const districtsBase = form.province && RW_LOCATIONS[form.province] ? Object.keys(RW_LOCATIONS[form.province]) : [];
        const districts = Array.from(new Set([
          ...districtsBase,
          form.district,
        ].filter(Boolean)));

        const sectorsBase =
          form.province && form.district && RW_LOCATIONS[form.province]?.[form.district]
            ? Object.keys(RW_LOCATIONS[form.province][form.district])
            : [];
        const sectors = Array.from(new Set([
          ...sectorsBase,
          form.sector,
        ].filter(Boolean)));

        const cellsBase =
          form.province && form.district && form.sector && RW_LOCATIONS[form.province]?.[form.district]?.[form.sector]
            ? RW_LOCATIONS[form.province][form.district][form.sector]
            : [];
        const cells = Array.from(new Set([
          ...cellsBase,
          form.cell,
        ].filter(Boolean)));

        const categoryFieldOpts = categoryOptionsForWizard(schoolKind, form.feeTargetStudents);

        const categoryFieldLocked =
          schoolKind === "private" ||
          (schoolKind === "government_aided" && form.feeTargetStudents === "private") ||
          (categoryLockedBySchool && schoolFeeScope !== "aided");

        const categorySelectValue = categoryFieldOpts.includes(form.category)
          ? form.category
          : categoryFieldOpts[0];

        return (
          <div className="space-y-4">
            {editId && (
              <div
                className="rounded-2xl border px-4 py-3"
                style={{
                  background: listTheme ? "linear-gradient(135deg, #000435, #0a1142)" : C.goldBg,
                  borderColor: listTheme ? "rgba(251,191,36,0.35)" : C.goldBorder,
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: listTheme ? "#FBBF24" : C.goldDark }}>
                  Editing existing Babyeyi
                </p>
                <p className="text-xs mt-1" style={{ color: listTheme ? "rgba(255,255,255,0.85)" : C.darkMid }}>
                  All {STEPS.length} steps are open — your saved data is loaded below, including{" "}
                  <strong>{form.classes?.length ? form.classes.join(", ") : "selected classes"}</strong>.
                  {editRecord?.docId ? ` Document ${editRecord.docId}.` : ""}
                </p>
              </div>
            )}
            <Toggle value={form.includeSchoolDetails} onChange={v => up("includeSchoolDetails", v)}
              label="Include School Details"
              sublabel="Display school name, location and logo on the printed document" />

            {form.includeSchoolDetails && (
              <div className="rounded-2xl p-4 space-y-3 border-2"
                style={{ background: `linear-gradient(135deg, ${C.goldBg}, #fffef7)`, borderColor: C.goldBorder }}>
                {schoolInfoLoaded && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                    style={{ background: "#f0fdf4", borderColor: "#6ee7b7" }}>
                    <I n="sparkle" size={13} color="#059669" />
                    <p className="text-[10px] font-bold" style={{ color: "#065f46" }}>
                      School details loaded from your profile — review and adjust if needed
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5"
                    style={{ color: C.goldDark }}>
                    <I n="school" size={11} color={C.goldDark} /> School Information
                  </p>
                  <p className="text-[10px]" style={{ color: C.goldDeep }}>Auto-filled from your school profile · Edit freely</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>School Name</label>
                    <input value={form.schoolName} onChange={e => up("schoolName", e.target.value)}
                      placeholder="e.g. GS Kimironko" className={inp}
                      style={{ borderColor: C.goldBorder }} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Province</label>
                    <select value={form.province}
                      onChange={e => {
                        up("province", e.target.value);
                        up("district", "");
                        up("sector", "");
                        up("cell", "");
                        up("village", "");
                      }}
                      className={inp} style={{ borderColor: C.goldBorder }}>
                      <option value="">— Select province —</option>
                      {provinceNames.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>District</label>
                    <select value={form.district}
                      onChange={e => {
                        up("district", e.target.value);
                        up("sector", "");
                        up("cell", "");
                        up("village", "");
                      }}
                      className={inp} style={{ borderColor: C.goldBorder }} disabled={!form.province}>
                      <option value="">{form.province ? "— Select district —" : "Select province first"}</option>
                      {districts.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Sector</label>
                    <select value={form.sector}
                      onChange={e => { up("sector", e.target.value); up("cell", ""); up("village", ""); }}
                      className={inp} style={{ borderColor: C.goldBorder }} disabled={!form.district}>
                      <option value="">{form.district ? "— Select sector —" : "Select district first"}</option>
                      {sectors.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Cell</label>
                    <select
                      value={form.cell}
                      onChange={e => { up("cell", e.target.value); up("village", ""); }}
                      className={inp} style={{ borderColor: C.goldBorder }} disabled={!form.sector}>
                      <option value="">{form.sector ? "— Select cell —" : "Select sector first"}</option>
                      {cells.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Village</label>
                    <input
                      value={form.village}
                      onChange={e => up("village", e.target.value)}
                      placeholder="Auto-filled from school profile"
                      className={inp}
                      style={{ borderColor: C.goldBorder }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FileZone
                    label="School Logo"
                    sublabel={dbAssets.schoolLogo ? "Loaded from school profile" : "Upload school logo (PNG/JPG)"}
                    file={form.schoolLogo}
                    fromDB={dbAssets.schoolLogo}
                    previewUrl={previews.schoolLogo}
                    onFile={async f => {
                      up("schoolLogo", f);
                      if (f) {
                        const url = await uploadSchoolAsset("logo", f, showToast);
                        if (url) {
                          setPreviews(p => ({ ...p, schoolLogo: toAssetUrl(url) }));
                          setDbAssets(d => ({ ...d, schoolLogo: true }));
                        }
                      } else {
                        setPreviews(p => ({ ...p, schoolLogo: dbAssets.schoolLogo ? p.schoolLogo : null }));
                      }
                    }}
                    accept="image/*" icon="🏫"
                  />
                  <FileZone label="Other Logo (Optional)" sublabel="Secondary brand"
                    file={form.otherLogo} onFile={f => up("otherLogo", f)}
                    accept="image/*" icon="🖼️" previewUrl={previews.otherLogo} />
                </div>
              </div>
            )}

            {schoolKind === "government_aided" && (
              <div className="rounded-2xl border overflow-hidden shadow-sm"
                style={{ borderColor: "#c4b5fd", background: "linear-gradient(135deg, #f5f3ff 0%, #fff 55%, #faf5ff 100%)" }}>
                <div className="px-4 py-3 flex items-start gap-3 border-b" style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 4px 14px rgba(109,40,217,0.35)" }}>
                    <I n="users" size={18} color="#fff" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-tight" style={{ color: C.dark }}>Who is this Babyeyi for?</p>
                    <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: C.darkMid }}>
                      Government-aided schools may charge <strong className="text-slate-800">public-sector students</strong> under national fee guidance, or <strong className="text-slate-800">private fee-paying students</strong> without the NESA smart limit checker.
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <label className="block text-[10px] font-bold uppercase mb-2 tracking-wider" style={{ color: "#5b21b6" }}>Student cohort</label>
                  <select
                    value={form.feeTargetStudents}
                    onChange={(e) => {
                      const v = e.target.value;
                      up("feeTargetStudents", v);
                      if (v === "private") {
                        up("category", "Private");
                      } else {
                        up("category", ["Public", "Boarding", "TVET"].includes(form.category) ? form.category : "Public");
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold border-2 outline-none transition-all bg-white cursor-pointer"
                    style={{ borderColor: "#ddd6fe", boxShadow: "0 1px 0 rgba(255,255,255,0.8) inset" }}>
                    <option value="public">Public students — NESA smart fee checker applies</option>
                    <option value="private">Private students — no national fee limit checker</option>
                  </select>
                </div>
              </div>
            )}

            {schoolKind === "government" && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: "linear-gradient(135deg, #ecfdf5, #fff)", borderColor: "#6ee7b7" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#10b981" }}>
                  <I n="shield" size={16} color="#fff" />
                </div>
                <p className="text-[11px] font-semibold leading-snug" style={{ color: "#065f46" }}>
                  Public (Government) school — Babyeyi follows <strong>public</strong> rules and the tuition smart checker (NESA limits) applies.
                </p>
              </div>
            )}

            {schoolKind === "private" && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: "#f8fafc", borderColor: C.slate200 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-700">
                  <I n="school" size={16} color="#fff" />
                </div>
                <p className="text-[11px] font-semibold leading-snug" style={{ color: C.darkMid }}>
                  Private school — national NESA fee limit checker is not used for this Babyeyi.
                </p>
              </div>
            )}

            {(schoolKind === "government" ||
              (schoolKind === "government_aided" && form.feeTargetStudents === "public")) && (
              <div
                className="rounded-2xl border-2 p-4 md:p-5 shadow-sm"
                style={{
                  background: "linear-gradient(165deg, #fffdf7 0%, #fffef9 45%, #ffffff 100%)",
                  borderColor: "rgba(180, 83, 9, 0.35)",
                  boxShadow: "0 4px 20px rgba(254, 191, 16, 0.08)",
                }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#92400e" }}>
                      Tuition smart checker (NESA)
                    </p>
                    <p className="text-[10px] mt-1 font-semibold leading-relaxed" style={{ color: C.darkMid }}>
                      Match <strong>Public</strong>, <strong>Boarding</strong>, or <strong>TVET</strong> plus education level (Nursery · Primary · Secondary · TSS) with the NESA Tuition Manager so the smart checker finds your cap.
                    </p>
                  </div>
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)" }}>
                    <I n="shield" size={18} color="#fff" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {schoolKind === "government" && (
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "#b45309", letterSpacing: "0.08em" }}>
                        School category <span style={{ color: C.red }}>*</span>
                      </label>
                      <select
                        value={categorySelectValue}
                        onChange={(e) => up("category", e.target.value)}
                        className={inp}
                        style={{ borderColor: C.goldBorder, background: "#fffef8" }}>
                        {categoryFieldOpts.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={schoolKind === "government" ? "sm:col-span-2" : "sm:col-span-2"}>
                    <p className="text-[10px] font-semibold leading-relaxed rounded-xl px-3 py-2 border" style={{ borderColor: C.goldBorder, background: "#fffef8", color: C.darkMid }}>
                      NESA fee cap uses <strong>{form.category || "Public"}</strong> + <strong>{form.nesaFeeLimitLevel || "Primary"}</strong> + term + year (set below).
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 gap-3 ${schoolKind === "government" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
              {[
                {
                  label: "Academic Year",
                  key: "academicYear",
                  opts: academicYearOptions,
                  lock: false,
                  isCurrent: form.academicYear === academic.academicYear,
                },
                { label: "Term", key: "term", opts: termOptions, lock: false, isCurrent: form.term === academic.currentTerm },
                ...(schoolKind === "government"
                  ? []
                  : [{ label: "Category", key: "category", opts: categoryFieldOpts, lock: categoryFieldLocked }]),
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>
                    {f.label}
                    {f.isCurrent && (
                      <span className="ml-1.5 normal-case font-semibold text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: C.emeraldBg, color: C.emeraldDark }}>
                        Current (settings)
                      </span>
                    )}
                    {f.lock && (
                      <span className="ml-1 normal-case font-semibold text-[9px]" style={{ color: C.goldDark }} />
                    )}
                  </label>
                  {f.lock ? (
                    <input
                      readOnly
                      value={f.key === "category" ? categorySelectValue : form[f.key]}
                      className={inp}
                      style={{ borderColor: C.goldBorder, background: "#f8fafc", cursor: "not-allowed" }}
                    />
                  ) : academic.loading && (f.key === "academicYear" || f.key === "term") ? (
                    <input
                      readOnly
                      value="Loading from settings…"
                      className={inp}
                      style={{ borderColor: C.goldBorder, background: "#f8fafc", cursor: "wait" }}
                    />
                  ) : (
                    <select
                      value={f.key === "category" ? categorySelectValue : form[f.key]}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (f.key === "category") up("category", v);
                        else (f.onChange || ((x) => up(f.key, x)))(v);
                      }}
                      className={inp}
                      style={{ borderColor: C.goldBorder }}>
                      {f.opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>

            <EducationLevelPicker
              value={normalizeEducationLevel(form.nesaFeeLimitLevel)}
              onChange={handleEducationLevelChange}
              options={levelOptions.length ? levelOptions : EDUCATION_LEVEL_OPTIONS}
              title="Education level"
              hint="Select a level to filter classes. Use Public, Boarding, or TVET with this level — same labels as NESA Tuition Manager."
            />

            <div>
              {registeredClassesLoading ? (
                <p className="text-xs font-semibold flex items-center gap-2 py-8 justify-center" style={{ color: C.darkMid }}>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: C.goldDark }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading classes…
                </p>
              ) : (
                <>
                  <ClassStreamPicker
                    groups={filteredClassGroups}
                    selected={form.classes || []}
                    onChange={(next) => {
                      up("classes", next);
                      if (next[0]) {
                        up("nesaFeeLimitLevel", inferNesaFeeLimitLevelFromClass(next[0], classRowMap.get(next[0])));
                      }
                    }}
                    sortSelected={sortSelectedClassesByCatalog}
                    catalogOrder={classOptions}
                    minSelected={1}
                    colors={C}
                    levelLabel={EDUCATION_LEVEL_OPTIONS.find((o) => o.id === normalizeEducationLevel(form.nesaFeeLimitLevel))?.label || form.nesaFeeLimitLevel}
                    onSelectAllLevel={() => {
                      const labels = filterLabelsByLevel(classOptions, form.nesaFeeLimitLevel, classRowMap);
                      up("classes", sortSelectedClassesByCatalog(labels, classOptions));
                    }}
                    onClearLevel={() => {
                      const first = filterLabelsByLevel(classOptions, form.nesaFeeLimitLevel, classRowMap)[0];
                      up("classes", first ? [first] : []);
                    }}
                  />
                  {form.classes.length > 1 && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2"
                      style={{ background: C.goldBg, color: C.goldDark }}>
                      <I n="layers" size={13} /> {form.classes.length} classes selected — one Babyeyi shared across these classes
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Language</label>
              <select value={form.language} onChange={e => up("language", e.target.value)}
                className={`${inp} w-48`} style={{ borderColor: C.goldBorder }}>
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div>
              <Toggle
                value={!!form.useParentMessage}
                onChange={(v) => up("useParentMessage", v)}
                label="Include Message to Parents / Guardians"
                sublabel="Turn off to skip this section on the printed Babyeyi document"
              />
              {form.useParentMessage && (
                <>
                  <label className="block text-[10px] font-bold uppercase mb-1 mt-3 flex items-center gap-1.5" style={{ color: C.darkMid }}>
                    Parent Message
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold border"
                      style={{ background: C.goldBg, color: C.goldDark, borderColor: C.goldBorder }}>
                      Saved to DB ✓
                    </span>
                  </label>
                  <textarea value={form.parentMessage} onChange={e => up("parentMessage", e.target.value)}
                    rows={5} className={`${inp} resize-none`} style={{ borderColor: C.goldBorder }} />
                </>
              )}
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════
      // STEP 2 — Payments  (unchanged)
      // ════════════════════════════════════════════════
      case 2: return (
        <div className="space-y-5">
          {schoolFeeScope === "pending" && (
            <div className="rounded-2xl border-2 px-4 py-3 flex items-center gap-2" style={{ borderColor: C.goldBorder, background: C.goldBg }}>
              <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: C.goldDark }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-xs font-semibold" style={{ color: C.darkMid }}>Loading school profile to check NESA limits…</p>
            </div>
          )}
          {nesaApplies && (
          <div className={`rounded-2xl overflow-hidden border-2 transition-all duration-300`}
            style={{ borderColor: exceeds ? "#fca5a5" : "#6ee7b7" }}>
            <div className="px-4 py-3.5 flex items-center justify-between flex-wrap gap-2"
              style={{ background: exceeds ? "linear-gradient(135deg, #dc2626, #ef4444)" : `linear-gradient(135deg, ${C.gold}, ${C.goldDark})` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <I n="shield" size={16} color="white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Tuition Smart Checker</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {nesaLimitLoading ? "Fetching limit…"
                      : nesaLimitSource === "none"
                        ? `No fee limit configured for ${form.nesaFeeLimitLevel || inferNesaFeeLimitLevelFromClass(form.classes?.[0] || "")} · ${form.term}`
                      : nesaLimit !== null ? `Limit: RWF ${nesaLimit.toLocaleString()}` : "No limit set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                {nesaLimitLoading ? <><svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Loading…</>
                  : exceeds ? <><I n="alert" size={12} color="white" /> +RWF {overBy.toLocaleString()} over limit</>
                  : <><Svg d={ic.check} size={12} color="white" /> Within Limit</>}
              </div>
            </div>
            <div className="bg-white p-4">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label:"Your Total", val:`RWF ${totalFee.toLocaleString()}`, accent: exceeds ? C.red : C.dark },
                  { label:"NESA Limit", val:nesaLimit!==null?`RWF ${nesaLimit.toLocaleString()}`:"Not set", accent: C.emerald },
                  { label:exceeds?"Over By":nesaLimit!==null?"Under By":"Status",
                    val:exceeds?`+RWF ${overBy.toLocaleString()}`:nesaLimit!==null?`−RWF ${(nesaLimit-totalFee).toLocaleString()}`:"No limit",
                    accent: exceeds ? C.red : C.emerald },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-2.5 text-center border"
                    style={{ background: C.goldBg, borderColor: C.goldBorder }}>
                    <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: C.goldDark }}>{f.label}</p>
                    <p className="text-sm font-bold" style={{ color: f.accent }}>{f.val}</p>
                  </div>
                ))}
              </div>
              {totalFee > 0 && (
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#e2e8f0" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: nesaLimit ? `${Math.min((totalFee/nesaLimit)*100, 100)}%` : "0%",
                      background: exceeds ? "linear-gradient(90deg, #dc2626, #ef4444)" : `linear-gradient(90deg, ${C.gold}, ${C.goldDark})`,
                    }} />
                </div>
              )}
            </div>
          </div>
          )}
          {(schoolFeeScope === "private" || form.feeTargetStudents === "private") && (
            <p className="text-[10px] leading-relaxed px-1" style={{ color: C.darkMid }}>
              {form.feeTargetStudents === "private" && schoolKind === "government_aided"
                ? "Private-student Babyeyi: the national NESA fee limit checker is turned off. Enter your fee items below."
                : "Private schools do not use the national NESA fee limit checker on this step. Enter your fee items below."}
            </p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>Payment Items</label>
              <button type="button" onClick={() => up("payments", [...form.payments, { name:"", amount:"", pay_channel: "babyeyi" }])}
                className="flex items-center gap-1 text-xs font-bold hover:opacity-80 px-2 py-1 rounded-lg"
                style={{ color: C.goldDark, background: C.goldBg }}>
                <I n="plus" size={12} /> Add Row
              </button>
            </div>
            {errors.payments && (
              <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: C.red }}>
                <I n="alert" size={12} color={C.red} /> {errors.payments}
              </p>
            )}
            <div className="space-y-2">
              {form.payments.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-semibold shrink-0"
                    style={{ background: C.goldBgMid, color: C.goldDark }}>{i+1}</span>
                  <input value={p.name} onChange={e => { const ps=[...form.payments]; ps[i].name=e.target.value; up("payments",ps); }}
                    placeholder="Payment name" className={`${inp} flex-1 min-w-[120px]`} style={{ borderColor: C.goldBorder }} />
                  <select
                    value={p.pay_channel === "school" ? "school" : "babyeyi"}
                    onChange={(e) => { const ps=[...form.payments]; ps[i].pay_channel = e.target.value; up("payments", ps); }}
                    className={`${inp} w-full sm:w-[158px] shrink-0 text-[11px] font-semibold`}
                    style={{ borderColor: C.goldBorder }}
                  >
                    <option value="babyeyi">Other requirements</option>
                    <option value="school">Paid to School Account</option>
                  </select>
                  <div className="relative w-28 sm:w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: C.goldDark }}>RWF</span>
                    <input type="number" value={p.amount} onChange={e => { const ps=[...form.payments]; ps[i].amount=e.target.value; up("payments",ps); }}
                      placeholder="0" className={`${inp} pl-9`} style={{ borderColor: C.goldBorder }} />
                  </div>
                  {form.payments.length > 1 && (
                    <button type="button" onClick={() => up("payments", form.payments.filter((_,j)=>j!==i))}
                      className="p-1.5 rounded-xl shrink-0 hover:bg-red-50" style={{ color: C.red }}>
                      <I n="x" size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 px-4 py-3 rounded-xl"
              style={{ background: exceeds ? `linear-gradient(135deg, #dc2626, #ef4444)` : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` }}>
              <span className="text-sm font-semibold text-white">GRAND TOTAL</span>
              <span className="text-lg font-semibold" style={{ color: C.gold }}>RWF {totalFee.toLocaleString()}</span>
            </div>
          </div>

          {exceeds && (
            <div className="rounded-2xl overflow-hidden border-2 transition-all duration-300"
              style={{ borderColor: form.requestIncrease ? "#f59e0b" : "#fde68a" }}>
              <div className="px-4 py-4"
                style={{ background: form.requestIncrease ? "linear-gradient(135deg, #d97706, #b45309)" : "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
                      <I n="send" size={16} color="white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Request Increase Approval</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                        Fee exceeds limit by <strong className="text-white">RWF {overBy.toLocaleString()}</strong>
                      </p>
                      <p className="text-[9px] text-amber-100 mt-0.5">
                        If you need to charge above the official limit, you must explain why and attach supporting documents.
                      </p>
                      {form.requestIncrease && form.requestTitle && (
                        <p className="text-[9px] text-amber-100 mt-0.5 line-clamp-1">
                          Reason: <span className="font-semibold">{form.requestTitle}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !form.requestIncrease;
                      up("requestIncrease", next);
                      if (next) {
                        setShowIncreaseModal(true);
                        // Soft warning to remind manager to fill all details
                        showToast(
                          "Please fill reasons, explanation and upload the two documents in the popup.",
                          "info"
                        );
                      }
                    }}
                    className="relative shrink-0 w-14 h-7 rounded-full transition-all duration-300 border-2"
                    style={{ background: form.requestIncrease ? "#fff" : "rgba(255,255,255,0.2)", borderColor: form.requestIncrease ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)" }}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${form.requestIncrease?"left-[30px]":"left-[2px]"}`}
                      style={{ background: form.requestIncrease ? C.gold : "#fff" }} />
                    <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-semibold ${form.requestIncrease?"pl-1 text-amber-700":"pr-1 text-white/60"}`}>
                      {form.requestIncrease ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>
                {form.requestIncrease && (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowIncreaseModal(true)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/15 text-white hover:bg-white/25"
                    >
                      Edit increase request details
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );

      // ════════════════════════════════════════════════
      // STEP 3 — Requirements  (unchanged)
      // ════════════════════════════════════════════════
    case 3: {
        const selectedNames = (form.requirements||[]).map(r=>r.item).filter(Boolean);
        const rowFromCatalog = (row) => ({
          item: row.name,
          description: row.description != null && String(row.description).trim() !== "" ? String(row.description) : "",
          quantity: row.quantity != null && String(row.quantity).trim() !== "" ? String(row.quantity) : "",
          pay_channel: "babyeyi",
          cost: "",
        });
        const toggleReq = (row) => {
          const name = row.name;
          const has = selectedNames.includes(name);
          const next = has
            ? (form.requirements||[]).filter(r => r.item !== name)
            : [...(form.requirements||[]), rowFromCatalog(row)];
          up("requirements", next);
        };
        return (
          <div className="space-y-4">
            <div className="rounded-xl p-3 flex gap-2 border"
              style={{ background: C.goldBg, borderColor: C.goldBorder }}>
              <I n="info" size={13} color={C.goldDark} />
              <p className="text-xs" style={{ color: C.goldDark }}>
                Select items from the master list (<span className="font-mono">student_requirements</span>) and add any custom requirements below.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>Standard Package</label>
                <button
                  type="button"
                  disabled={studentReqCatalogLoading || !studentReqCatalog.length}
                  onClick={() => {
                    const current = form.requirements || [];
                    const names   = current.map(r => r.item);
                    const merged  = [
                      ...current,
                      ...studentReqCatalog
                        .filter(row => row.name && !names.includes(row.name))
                        .map(row => rowFromCatalog(row)),
                    ];
                    up("requirements", merged);
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold hover:opacity-80 px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: C.goldDark, background: C.goldBg }}
                >
                  <I n="plus" size={11} /> Select all
                </button>
              </div>
              {studentReqCatalogLoading && (
                <div className="text-center py-6 text-[11px] font-semibold" style={{ color: C.goldDark }}>Loading requirements…</div>
              )}
              {studentReqCatalogError && !studentReqCatalogLoading && (
                <div className="rounded-xl border px-3 py-2 text-[11px] font-semibold mb-2" style={{ borderColor: C.redBorder, color: C.red700, background: C.red50 }}>
                  {studentReqCatalogError}
                </div>
              )}
              {!studentReqCatalogLoading && !studentReqCatalog.length && !studentReqCatalogError && (
                <div className="text-center py-4 text-[11px] rounded-xl border bg-white" style={{ borderColor: C.goldBorder, color: C.slate500 }}>
                  No rows in <span className="font-mono">student_requirements</span>. Add them in the database (or Super Admin → requirement prices) to show the checklist here.
                </div>
              )}
              {!studentReqCatalogLoading && !!studentReqCatalog.length && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-xl p-2 bg-white"
                style={{ borderColor: C.goldBorder }}>
                {studentReqCatalog.map(row => (
                  <label key={row.id ?? row.name} className="flex items-start gap-2 text-[10px] text-slate-700 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-3 h-3 shrink-0" checked={selectedNames.includes(row.name)} onChange={() => toggleReq(row)} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{row.name}</span>
                      {(row.description || (row.quantity != null && String(row.quantity) !== "")) && (
                        <span className="block text-[9px] text-slate-500 mt-0.5 leading-snug">
                          {[row.description, row.quantity != null && String(row.quantity) !== "" ? `Qty: ${row.quantity}` : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>Custom Requirements</label>
              <button type="button" onClick={() => up("requirements", [...(form.requirements||[]), { item: "", description: "", quantity: "", pay_channel: "babyeyi", cost: "" }])}
                className="flex items-center gap-1 text-xs font-bold hover:opacity-80 px-2 py-1 rounded-lg"
                style={{ color: C.goldDark, background: C.goldBg }}>
                <I n="plus" size={12} /> Add
              </button>
            </div>
              <div className="space-y-2">
                {(form.requirements||[]).map((r,i) => (
                  <div key={i} className="flex flex-col gap-1.5 border border-amber-100 rounded-xl p-2 bg-white">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-semibold shrink-0"
                        style={{ background: C.goldBgMid, color: C.goldDark }}
                      >
                        {i+1}
                      </span>
                      <input
                        value={r.item}
                        onChange={e=>{
                          const rs=[...(form.requirements||[])];
                          rs[i] = { ...rs[i], item:e.target.value };
                          up("requirements",rs);
                        }}
                        placeholder="Item (e.g. Exercise books)"
                        className={`${inp} flex-1`}
                        style={{ borderColor: C.goldBorder }}
                      />
                      {(form.requirements||[]).length > 1 && (
                        <button
                          type="button"
                          onClick={() => up("requirements",(form.requirements||[]).filter((_,j)=>j!==i))}
                          className="p-1.5 hover:bg-red-50 rounded-xl"
                          style={{ color: C.red }}
                        >
                          <I n="x" size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-[2fr,1fr] gap-2 pl-7">
                      <input
                        value={r.description || ""}
                        onChange={e=>{
                          const rs=[...(form.requirements||[])];
                          rs[i] = { ...rs[i], description:e.target.value };
                          up("requirements",rs);
                        }}
                        placeholder="Description (e.g. A4, 80gsm)"
                        className={inp}
                        style={{ borderColor: "#E5E7EB" }}
                      />
                      <input
                        value={r.quantity || ""}
                        onChange={e=>{
                          const rs=[...(form.requirements||[])];
                          rs[i] = { ...rs[i], quantity:e.target.value };
                          up("requirements",rs);
                        }}
                        placeholder="Qty (e.g. 2 per term)"
                        className={inp}
                        style={{ borderColor: "#E5E7EB" }}
                      />
                    </div>
                    <div className="pl-7">
                      <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: C.slate500 }}>Where parents pay</label>
                      <select
                        value={r.pay_channel === "school" ? "school" : "babyeyi"}
                        onChange={(e) => {
                          const rs = [...(form.requirements || [])];
                          const school = e.target.value === "school";
                          rs[i] = {
                            ...rs[i],
                            pay_channel: school ? "school" : "babyeyi",
                            ...(school ? {} : { cost: "" }),
                          };
                          up("requirements", rs);
                        }}
                        className={`${inp} text-[13px] font-semibold`}
                        style={{ borderColor: C.goldBorder }}
                      >
                        <option value="babyeyi">Other requirements</option>
                        <option value="school">Paid to School Account</option>
                      </select>

                      {r.pay_channel === "school" && (
                        <div className="mt-2.5">
                          <label className="text-[9px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: C.slate500 }}>
                            Amount at school (RWF)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={r.cost ?? ""}
                            onChange={(e) => {
                              const rs = [...(form.requirements || [])];
                              rs[i] = { ...rs[i], cost: e.target.value };
                              up("requirements", rs);
                            }}
                            placeholder="Total paid at the office for this line"
                            className={`${inp} text-[13px] font-semibold font-mono`}
                            style={{ borderColor: C.goldBorder }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            <div className="border-t pt-4" style={{ borderColor: C.goldBorder }}>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>
                    Other School Information
                  </label>
                  
                </div>
                <button type="button" onClick={() => up("otherInfos",[...(form.otherInfos||[]),{item:""}])}
                  className="flex items-center gap-1 text-xs font-bold hover:opacity-80 px-2 py-1 rounded-lg shrink-0"
                  style={{ color: C.goldDark, background: C.goldBg }}>
                  <I n="plus" size={12} /> Add
                </button>
              </div>
              <div className="space-y-2 mt-2">
                {(form.otherInfos||[]).map((r,i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-semibold shrink-0 mt-2.5"
                      style={{ background: "#d1fae5", color: "#065f46" }}>
                      {String.fromCharCode(65+i)}
                    </span>
                    <input value={r.item}
                      onChange={e=>{const arr=[...(form.otherInfos||[])];arr[i].item=e.target.value;up("otherInfos",arr);}}
                      placeholder="e.g. Parents must clear all fees before mid-term exams…"
                      className={`${inp} flex-1`} style={{ borderColor: C.goldBorder }} />
                    {(form.otherInfos||[]).length > 1 && (
                      <button type="button" onClick={() => up("otherInfos",(form.otherInfos||[]).filter((_,j)=>j!==i))}
                        className="p-1.5 hover:bg-red-50 rounded-xl mt-2" style={{ color: C.red }}><I n="x" size={13} /></button>
                    )}
                  </div>
                ))}
                {(form.otherInfos||[]).length === 0 && (
                  <div className="text-center py-3 text-[10px] border border-dashed rounded-xl"
                    style={{ color: C.goldDark, borderColor: C.goldBorder }}>
                    No other information added yet — click Add to start
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════
      // STEP 4 — Bank Account  (unchanged)
      // ════════════════════════════════════════════════
      case 4: {
        const extraBanks = form.extraBankAccounts || [];
        const addExtraBank = () => up("extraBankAccounts", [...extraBanks, blankBank()]);
        const removeExtraBank = (idx) => up("extraBankAccounts", extraBanks.filter((_,i)=>i!==idx));
        const updateExtraBank = (idx, field, val) => {
          const updated = extraBanks.map((b,i) => i===idx ? {...b,[field]:val} : b);
          up("extraBankAccounts", updated);
        };
        const allBanksPreview = [];
        if (form.bankName || form.accountNumber) {
          allBanksPreview.push({ bankName:form.bankName, accountNumber:form.accountNumber, accountName:form.accountName, primary:true });
        }
        extraBanks.forEach((b,i) => {
          if (b.bankName || b.accountNumber) allBanksPreview.push({ ...b, primary:false, idx:i });
        });

        return (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 border-2" style={{ background: C.goldBg, borderColor: C.goldBorder }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: C.gold }}>
                  <I n="bank" size={18} color={C.dark} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: C.dark }}>Primary Bank Account</p>
                  <p className="text-[10px]" style={{ color: C.goldDark }}>Main payment account for this Babyeyi</p>
                </div>
                <span className="ml-auto shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-semibold"
                  style={{ background: C.gold, color: C.dark }}>PRIMARY</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Bank Name</label>
                  <select value={form.bankName} onChange={e => up("bankName", e.target.value)}
                    className={inp} style={{ borderColor: C.goldBorder }}>
                    <option value="">— Select Bank —</option>
                    {BANKS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Account Number</label>
                  <input value={form.accountNumber} onChange={e => up("accountNumber", e.target.value)}
                    placeholder="e.g. 000160114800300" className={`${inp} font-mono tracking-wider`} style={{ borderColor: C.goldBorder }} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1" style={{ color: C.darkMid }}>Account Name</label>
                  <input value={form.accountName} onChange={e => up("accountName", e.target.value)}
                    placeholder="e.g. School Name" className={inp} style={{ borderColor: C.goldBorder }} />
                </div>
              </div>
            </div>

            {form.bankName && form.accountNumber && (
              <div className="relative rounded-2xl p-5 text-white overflow-hidden shadow-sm"
                style={{ background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` }}>
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "rgba(254,191,16,0.1)" }} />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: C.goldLight }}>Primary Account</p>
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold border"
                    style={{ background: "rgba(254,191,16,0.2)", color: C.gold, borderColor: "rgba(254,191,16,0.3)" }}>Bank 1</span>
                </div>
                <p className="font-bold text-lg mb-1 text-white">{form.bankName}</p>
                <p className="font-mono text-2xl tracking-widest mb-2" style={{ color: C.gold }}>{form.accountNumber}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: C.goldLight }}>Account Name</p>
                <p className="font-bold text-white">{form.accountName || "—"}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>Additional Bank Accounts</p>
                </div>
                <button type="button" onClick={addExtraBank}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, color: C.dark }}>
                  <I n="plus" size={12} color={C.dark} /> Add Bank
                </button>
              </div>

              {extraBanks.length === 0 ? (
                <div className="border-2 border-dashed rounded-2xl p-5 text-center"
                  style={{ borderColor: C.goldBorder, background: C.goldBg }}>
                  <p className="text-xs font-bold" style={{ color: C.goldDark }}>No additional bank accounts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extraBanks.map((bank, idx) => (
                    <div key={idx} className="bg-white border-2 rounded-2xl p-4 relative" style={{ borderColor: C.goldBorder }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold" style={{ color: C.dark }}>Bank {idx + 2}</span>
                        <button type="button" onClick={() => removeExtraBank(idx)} className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: C.red }}>
                          <I n="x" size={12} />
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        <select value={bank.bankName} onChange={e => updateExtraBank(idx, "bankName", e.target.value)} className={inp} style={{ borderColor: C.goldBorder }}>
                          <option value="">— Select Bank —</option>
                          {BANKS.map(b => <option key={b}>{b}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={bank.accountNumber} onChange={e => updateExtraBank(idx, "accountNumber", e.target.value)}
                            placeholder="Account number" className={`${inp} font-mono`} style={{ borderColor: C.goldBorder }} />
                          <input value={bank.accountName} onChange={e => updateExtraBank(idx, "accountName", e.target.value)}
                            placeholder="Account name" className={inp} style={{ borderColor: C.goldBorder }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }

      // ════════════════════════════════════════════════
      // STEP 5 — Authorization  (unchanged)
      // ════════════════════════════════════════════════
      case 5: return (
        <div className="space-y-4">
          <div className={`flex items-start gap-2.5 p-3 rounded-xl border`}
            style={{ background: (dbAssets.directorSignature || dbAssets.stamp) ? "#f0fdf4" : C.goldBg, borderColor: (dbAssets.directorSignature || dbAssets.stamp) ? "#6ee7b7" : C.goldBorder }}>
            <I n="info" size={13} color={(dbAssets.directorSignature || dbAssets.stamp) ? "#059669" : C.goldDark} />
            <div>
              <p className="text-xs font-bold" style={{ color: (dbAssets.directorSignature || dbAssets.stamp) ? "#065f46" : C.goldDark }}>
                {(dbAssets.directorSignature || dbAssets.stamp) ? "Assets loaded from your school database profile" : "No signature or stamp found in database"}
              </p>
              <p className="text-[10px] mt-0.5 text-slate-500">PNG with transparent background recommended.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label:"Head Teacher Signature", icon:"✍️", dbKey:"directorSignature", formKey:"directorSignature", assetType:"signature" },
              { label:"Official School Stamp",  icon:"🔏", dbKey:"stamp",              formKey:"stamp",             assetType:"stamp" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white border-2 rounded-2xl p-4 space-y-3" style={{ borderColor: C.goldBorder }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.goldBgMid }}>
                    <span className="text-base">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: C.dark }}>{item.label}</p>
                    <p className="text-[9px] font-semibold" style={{ color: dbAssets[item.dbKey] ? C.emerald : C.slate }}>
                      {dbAssets[item.dbKey] ? "✓ Loaded from school profile" : "Not set in database"}
                    </p>
                  </div>
                </div>
                {previews[item.dbKey] && (
                  <div className="rounded-xl p-3 flex items-center justify-center min-h-[80px]" style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
                    <img src={previews[item.dbKey]} alt={item.label} className="max-h-16 max-w-full object-contain" />
                  </div>
                )}
                <FileZone
                  label={previews[item.dbKey] ? `Replace ${item.label.split(" ")[0]}` : `Upload ${item.label.split(" ")[0]}`}
                  sublabel="PNG transparent · Saved to school profile"
                  file={form[item.formKey]} fromDB={dbAssets[item.dbKey]}
                  previewUrl={form[item.formKey] instanceof File ? previews[item.dbKey] : null}
                  onFile={async f => {
                    up(item.formKey, f);
                    if (f) {
                      const url = await uploadSchoolAsset(item.assetType, f, showToast);
                      if (url) { setPreviews(p => ({ ...p, [item.dbKey]: toAssetUrl(url) })); setDbAssets(d => ({ ...d, [item.dbKey]: true })); }
                    } else if (!dbAssets[item.dbKey]) setPreviews(p => ({ ...p, [item.dbKey]: null }));
                  }}
                  accept="image/*" icon={item.icon} compact
                />
              </div>
            ))}
          </div>
        </div>
      );

      // ════════════════════════════════════════════════
      // STEP 6 — Class Notes  (unchanged)
      // ════════════════════════════════════════════════
      case 6: return (
        <div className="space-y-4">
         
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.darkMid }}>Other School Information</label>
            <button type="button" onClick={() => up("otherInfos",[...(form.otherInfos||[]),{item:""}])}
              className="flex items-center gap-1 text-xs font-bold hover:opacity-80 px-2 py-1 rounded-lg"
              style={{ color: C.goldDark, background: C.goldBg }}>
              <I n="plus" size={12} /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {(form.otherInfos||[]).map((r,i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-semibold shrink-0 mt-2.5"
                  style={{ background: "#d1fae5", color: "#065f46" }}>{String.fromCharCode(65+i)}</span>
                <input value={r.item} onChange={e=>{const arr=[...(form.otherInfos||[])];arr[i].item=e.target.value;up("otherInfos",arr);}}
                  placeholder="e.g. Parents must clear all fees before mid-term exams…"
                  className={`${inp} flex-1`} style={{ borderColor: C.goldBorder }} />
                {(form.otherInfos||[]).length > 1 && (
                  <button type="button" onClick={() => up("otherInfos",(form.otherInfos||[]).filter((_,j)=>j!==i))}
                    className="p-1.5 hover:bg-red-50 rounded-xl mt-2" style={{ color: C.red }}><I n="x" size={13} /></button>
                )}
              </div>
            ))}
            {(form.otherInfos||[]).length === 0 && (
              <div className="text-center py-4 text-[10px] border border-dashed rounded-xl"
                style={{ color: C.goldDark, borderColor: C.goldBorder }}>No items yet</div>
            )}
          </div>
        </div>
      );

      // ════════════════════════════════════════════════
      // STEP 7 — School Leaders  ← NEW
      // ════════════════════════════════════════════════
      case 7: {
        const leaders = form.leaders || [blankLeader()];
        const updateLeader = (idx, field, val) => {
          const updated = leaders.map((l, i) => i === idx ? { ...l, [field]: val } : l);
          up("leaders", updated);
        };
        const addLeader = () => up("leaders", [...leaders, blankLeader()]);
        const removeLeader = (idx) => {
          if (leaders.length === 1) return;
          up("leaders", leaders.filter((_, i) => i !== idx));
        };

        return (
          <div className="space-y-4">
            {/* Info banner */}
            

            {/* Leader cards */}
            <div className="space-y-3">
              {leaders.map((leader, idx) => (
                <div key={idx} className="bg-white border-2 rounded-2xl overflow-hidden"
                  style={{ borderColor: leader.name ? C.gold : C.goldBorder }}>
                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: leader.name ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})` : C.goldBgMid }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: leader.name ? "rgba(255,255,255,0.25)" : C.goldBorder }}>
                        <I n="user" size={13} color={leader.name ? C.dark : C.goldDark} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold"
                          style={{ color: leader.name ? C.dark : C.goldDark }}>
                          {leader.name || `Leader ${idx + 1}`}
                        </p>
                        {leader.role && (
                          <p className="text-[9px]" style={{ color: leader.name ? "rgba(31,41,55,0.7)" : C.goldDeep }}>
                            {leader.role}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-[8px] font-semibold"
                        style={{ background: leader.name ? "rgba(255,255,255,0.25)" : C.goldBorder, color: leader.name ? C.dark : C.goldDark }}>
                        #{idx + 1}
                      </span>
                      {leaders.length > 1 && (
                        <button type="button" onClick={() => removeLeader(idx)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center"
                          style={{ background: leader.name ? "rgba(239,68,68,0.2)" : C.redBorder, color: C.red }}>
                          <I n="x" size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card fields */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                        style={{ color: C.darkMid }}>
                        <I n="user" size={10} color={C.darkMid} /> Full Name
                        <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={leader.name}
                        onChange={e => updateLeader(idx, "name", e.target.value)}
                        placeholder="e.g. Jean Pierre UWIMANA"
                        className={inp}
                        style={{ borderColor: C.goldBorder }}
                      />
                    </div>

                    {/* Role */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                        style={{ color: C.darkMid }}>
                        <I n="layers" size={10} color={C.darkMid} /> Role / Position
                        <span style={{ color: C.red }}>*</span>
                      </label>
                      <select
                        value={LEADER_ROLE_PRESETS.includes(leader.role) ? leader.role : (leader.role ? "Other" : "")}
                        onChange={e => {
                          if (e.target.value !== "Other") updateLeader(idx, "role", e.target.value);
                          else updateLeader(idx, "role", "");
                        }}
                        className={inp}
                        style={{ borderColor: C.goldBorder }}
                      >
                        <option value="">— Select role —</option>
                        {LEADER_ROLE_PRESETS.map(r => <option key={r}>{r}</option>)}
                      </select>
                      {/* Free-type if "Other" or custom value */}
                      {(!LEADER_ROLE_PRESETS.includes(leader.role) || leader.role === "") && (
                        <input
                          value={leader.role}
                          onChange={e => updateLeader(idx, "role", e.target.value)}
                          placeholder="Or type a custom role…"
                          className={`${inp} mt-2`}
                          style={{ borderColor: C.goldBorder }}
                        />
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                        style={{ color: C.darkMid }}>
                        <I n="phone" size={10} color={C.darkMid} /> Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                          style={{ color: C.goldDark }}>+250</span>
                        <input
                          value={leader.phone}
                          onChange={e => updateLeader(idx, "phone", e.target.value)}
                          placeholder="7XXXXXXXX"
                          className={`${inp} pl-12 font-mono`}
                          style={{ borderColor: C.goldBorder }}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1"
                        style={{ color: C.darkMid }}>
                        <I n="mail" size={10} color={C.darkMid} /> Email Address
                      </label>
                      <input
                        type="email"
                        value={leader.email}
                        onChange={e => updateLeader(idx, "email", e.target.value)}
                        placeholder="e.g. director@school.rw"
                        className={inp}
                        style={{ borderColor: C.goldBorder }}
                      />
                    </div>
                  </div>

                  {/* Quick contact preview pill */}
                  {(leader.phone || leader.email) && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      {leader.phone && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border"
                          style={{ background: C.emeraldBg, color: C.emeraldDark, borderColor: C.emeraldBord }}>
                          <I n="phone" size={9} color={C.emeraldDark} /> +250 {leader.phone}
                        </span>
                      )}
                      {leader.email && (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border"
                          style={{ background: C.blueBg, color: C.blue700, borderColor: C.blueBord }}>
                          <I n="mail" size={9} color={C.blue700} /> {leader.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add leader button */}
            <button type="button" onClick={addLeader}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed font-bold text-sm transition-all hover:opacity-80 active:scale-95"
              style={{ borderColor: C.gold, color: C.goldDark, background: C.goldBg }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: C.gold }}>
                <I n="plus" size={14} color={C.dark} />
              </div>
              Add Another Leader
            </button>

            {/* Summary count */}
            {leaders.filter(l => l.name).length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: "#f0fdf4", borderColor: "#6ee7b7" }}>
                <I n="check" size={13} color="#059669" />
                <p className="text-[10px] font-bold" style={{ color: "#065f46" }}>
                  {leaders.filter(l => l.name).length} leader{leaders.filter(l => l.name).length > 1 ? "s" : ""} added — will appear on the printed document
                </p>
              </div>
            )}
          </div>
        );
      }

      // ════════════════════════════════════════════════
      // STEP 8 — Preview & Submit  (was step 7)
      // ════════════════════════════════════════════════
      case 8: {
        const allBanksCount = 1 + (form.extraBankAccounts||[]).filter(b=>b.bankName||b.accountNumber).length;
        const validLeadersCount = (form.leaders||[]).filter(l => l.name?.trim()).length;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label:"Classes",   val:(form.classes && form.classes.length) ? form.classes.join(", ") : "—",         bg:C.goldBg,   border:C.goldBorder,  color:C.darkMid },
                { label:"Total Fee", val:`RWF ${totalFee.toLocaleString()}`, bg:exceeds?"#fef2f2":C.goldBg, border:exceeds?"#fca5a5":C.goldBorder, color:exceeds?C.red:C.darkMid },
                { label:"NESA",      val:!nesaApplies?(form.feeTargetStudents==="private"?"— Private cohort":"— Not applied"):exceeds?"⚠ Exceeds":"✅ OK", bg:!nesaApplies?C.goldBg:exceeds?"#fef2f2":"#f0fdf4", border:!nesaApplies?C.goldBorder:exceeds?"#fca5a5":"#6ee7b7", color:!nesaApplies?C.darkMid:exceeds?C.red:C.emerald },
                { label:"Leaders",   val:`${validLeadersCount} contact${validLeadersCount!==1?"s":""}`, bg:C.goldBg, border:C.goldBorder, color:C.darkMid },
              ].map(c => (
                <div key={c.label} className="rounded-xl border-2 p-3" style={{ background: c.bg, borderColor: c.border }}>
                  <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60 mb-0.5" style={{ color: c.color }}>{c.label}</p>
                  <p className="text-xs font-semibold truncate" style={{ color: c.color }}>{c.val}</p>
                </div>
              ))}
            </div>

            {/* Leaders preview table */}
            {validLeadersCount > 0 && (
              <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: C.goldBorder }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: C.goldBgMid, borderBottom: `1px solid ${C.goldBorder}` }}>
                  <I n="users" size={13} color={C.goldDark} />
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.goldDark }}>
                    Leaders — {validLeadersCount} contact{validLeadersCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="divide-y" style={{ borderColor: C.goldBorder }}>
                  {(form.leaders||[]).filter(l => l.name?.trim()).map((l, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: C.goldBgMid }}>
                        <I n="user" size={13} color={C.goldDark} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: C.dark }}>{l.name}</p>
                        <p className="text-[10px] truncate" style={{ color: C.goldDark }}>{l.role || "—"}</p>
                      </div>
                      <div className="text-right text-[10px]" style={{ color: C.darkMid }}>
                        {l.phone && <p className="font-mono">+250 {l.phone}</p>}
                        {l.email && <p className="truncate max-w-[120px]">{l.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: C.darkMid }}>
                <I n="eye" size={12} /> Document Preview
              </p>
              <div className="overflow-y-auto rounded-2xl shadow-sm max-h-[40vh]"
                style={{ boxShadow: `0 0 0 2px ${C.goldBorder}` }}>
                <DocPreview form={form} previews={previews} />
              </div>
            </div>

            <div className="rounded-xl p-3 border" style={{ background: C.goldBg, borderColor: C.goldBorder }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.goldDark }}>Validation Checklist</p>
              {[
                { ok:form.payments.some(p=>p.name&&p.amount),                              label:"At least one payment item",         req:true },
                { ok:form.useParentMessage ? !!form.parentMessage?.trim() : true,                  label:"Parent message",                    req:false },
                { ok:!exceeds||!form.requestIncrease||form.requestTitle.trim().length>0,   label:"Request title (if increase)",       req:exceeds&&form.requestIncrease },
                { ok:!exceeds||!form.requestIncrease||!!form.parentApprovalDoc,            label:"Parent approval document",          req:exceeds&&form.requestIncrease },
                { ok:!!previews.directorSignature,                                          label:"Head Teacher signature",            req:false },
                { ok:!!previews.stamp,                                                      label:"Official stamp",                   req:false },
                { ok:!!form.bankName&&!!form.accountNumber,                                label:"Primary bank account",              req:false },
                { ok:validLeadersCount > 0,                                                label:"At least one school leader",        req:false },
                { ok:(form.leaders||[]).filter(l=>l.name).every(l=>l.role?.trim()),       label:"All named leaders have a role",     req:false },
                { ok:!!schoolId,                                                            label:"School ID (from session)",          req:true },
              ].map((c,i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold text-white"
                    style={{ background: c.ok ? C.emerald : c.req ? C.red : "#cbd5e1" }}>
                    {c.ok?"✓":c.req?"!":"○"}
                  </span>
                  <span className="text-xs" style={{ color: c.ok ? C.emerald : c.req ? C.red : C.slate, fontWeight: c.ok || c.req ? 600 : 400 }}>
                    {c.label} {!c.req && "(optional)"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  const isLast = step === STEPS.length;
  const CurrentStepIcon = STEPS[step - 1].Icon;

  const goToStep = (targetId) => {
    if (targetId < 1 || targetId > STEPS.length || targetId === step) return;
    setErrors({});
    setStep(targetId);
  };

  return (
    <>
    <div
      className={
        embedded
          ? "flex flex-col flex-1 min-h-0 overflow-hidden w-full bg-slate-50/60"
          : "min-h-[calc(100vh-4rem)] flex flex-col w-full"
      }
      style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideIn { from { transform: translateX(100px); opacity:0; } to { transform: translateX(0); opacity:1; } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .step-anim { animation: fadeUp 0.2s ease-out; }
      `}</style>

      {toast && (
        <div className={`fixed top-4 right-4 ${embedded ? "z-[9999]" : "z-50"} px-4 py-3 rounded-2xl shadow-sm text-sm font-bold flex items-center gap-2 max-w-xs`}
          style={{
            background: toast.type==="success" ? C.emerald : toast.type==="error" ? C.red : C.gold,
            color: toast.type==="info" ? C.dark : "#fff",
            animation: "slideIn 0.3s ease-out",
          }}>
          {toast.type==="success"?"✅":toast.type==="error"?"❌":"ℹ️"} {toast.msg}
        </div>
      )}

      <div
        className={
          embedded
            ? "flex flex-col flex-1 min-h-0 bg-white overflow-hidden w-full"
            : "flex flex-col flex-1 min-h-0 bg-white overflow-hidden w-full max-w-6xl mx-auto shadow-sm border border-slate-200/80 rounded-2xl"
        }>

        {!embedded && (
        <div className="px-4 sm:px-8 py-5 shrink-0 border-b border-slate-100 bg-gradient-to-r from-[#000435] to-[#0a1142]">
          <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FEBF10]/15 border border-[#FEBF10]/25">
                <ClipboardPen size={18} color="#FEBF10" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-white text-base sm:text-lg leading-tight truncate">
                  {editId ? "Edit Babyeyi" : "Create Babyeyi"}
                </h1>
                <p className="text-[11px] text-[#FEBF10]/90 truncate mt-0.5">
                  {form.schoolName || session?.schoolName || "School"} · {form.term} · {form.academicYear}
                </p>
              </div>
            </div>
            {onClose && (
            <button onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-white rounded-xl text-[10px] font-bold border border-white/15 hover:bg-white/10">
              <I n="eye" size={11} color="white" /> View Records
            </button>
            )}
          </div>
        </div>
        )}

        {/* Step indicator — HR-style */}
        <div className="border-b px-4 sm:px-8 py-4 shrink-0 bg-white">
          <div className="max-w-5xl mx-auto w-full">
            <div className="overflow-x-auto pb-2 -mx-1 px-1 babyeyi-step-scroll">
              <div className="flex min-w-[42rem] md:min-w-0 gap-1 md:gap-0">
                {STEPS.map((s) => {
                  const StepIcon = s.Icon;
                  const done = step > s.id;
                  const jumpAny = embedded || editId;
                  const active = step === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      ref={(el) => { stepBtnRefs.current[s.id] = el; }}
                      onClick={() => (jumpAny ? goToStep(s.id) : (step > s.id && setStep(s.id)))}
                      className={`flex-1 min-w-[4.5rem] md:min-w-0 flex flex-col items-center px-1 py-2 rounded-xl transition-colors ${
                        active ? "bg-amber-50" : jumpAny || done ? "hover:bg-slate-50" : "opacity-60"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all ${
                        active ? "bg-[#c87800] border-[#c87800] text-white" : done ? "bg-amber-50 border-[#c87800] text-[#c87800]" : "bg-white border-slate-200 text-slate-400"
                      }`}>
                        {done ? <Check size={14} strokeWidth={2} aria-hidden /> : <StepIcon size={14} strokeWidth={2} aria-hidden />}
                      </div>
                      <span className={`mt-2 text-[9px] md:text-[10px] text-center leading-tight line-clamp-2 ${active ? "text-[#c87800] font-semibold" : "text-slate-500"}`}>
                        <span className="md:hidden">{s.id}</span>
                        <span className="hidden md:inline">{s.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-[#c87800] to-[#FEBF10] transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Step title */}
        <div className="px-4 sm:px-8 pt-5 pb-2 shrink-0 border-b border-slate-50 bg-white">
          <div className="max-w-5xl mx-auto w-full flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.14em]">Step {step} of {STEPS.length}</p>
              <h3 className="text-lg sm:text-xl text-[#000435] mt-1 font-semibold tracking-tight">{STEPS[step - 1].label}</h3>
              <p className="text-sm text-slate-500 mt-1 hidden sm:block">
                {step === 1 ? "Set academic context, education level, and classes for this Babyeyi." : "Complete this section to continue."}
              </p>
            </div>
            <span className="text-[10px] font-bold shrink-0 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">{step}/{STEPS.length}</span>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 step-anim bg-slate-50/40" key={step}>
          <div className="max-w-5xl mx-auto w-full">
            {renderStep()}
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t px-4 sm:px-8 py-4 flex items-center gap-3 shrink-0 bg-white">
          <div className="max-w-5xl mx-auto w-full flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => { setErrors({}); setStep(s=>s-1); }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border rounded-xl font-semibold text-xs sm:text-sm hover:bg-slate-50"
              style={{ borderColor: C.goldBorder, color: C.darkMid }}>
              <ChevronLeft size={14} strokeWidth={2.25} aria-hidden /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="flex-1" />
          {!isLast ? (
            <button onClick={handleNext}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm active:scale-95"
              style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, color: C.dark, boxShadow: "0 4px 15px rgba(254,191,16,0.4)" }}>
              Next <ChevronRight size={14} color={C.dark} strokeWidth={2.25} aria-hidden />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || qrGenerating}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm active:scale-95 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, #059669, #047857)`, color: "#fff", boxShadow: "0 4px 15px rgba(5,150,105,0.4)" }}>
              {saving ? (
                <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Generating…</>
              ) : (
                <>
                  <I n={exceeds&&form.requestIncrease?"send":"save"} size={14} color="#fff" />
                  <span className="hidden sm:inline">
                    {editId ? "Save changes" : form.classes.length>1 ? `Generate ${form.classes.length} Babyeyi` : exceeds&&form.requestIncrease ? "Submit + Request Approval" : "Generate Babyeyi"}
                  </span>
                  <span className="sm:hidden">{editId ? "Save" : "Generate"}</span>
                </>
              )}
            </button>
          )}
          </div>
        </div>
      </div>
    </div>

    {/* Increase request modal — opens when "Edit increase request details" or toggle ON */}
    {showIncreaseModal && exceeds && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
        style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(6px)" }}
        onClick={e => { if (e.target === e.currentTarget) setShowIncreaseModal(false); }}
      >
        <div className="bg-white rounded-3xl w-full max-w-xl shadow-sm overflow-hidden max-h-[90vh] flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between shrink-0"
            style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15">
                <I n="send" size={16} color="white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Request fee increase approval</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Your total is above the limit by <strong className="text-white">RWF {overBy.toLocaleString()}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIncreaseModal(false)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 text-white hover:bg-white/20 shrink-0"
            >
              <I n="x" size={14} color="currentColor" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ background: "#fffbf0" }}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#92400e" }}>
                Reasons for increase <span style={{ color: C.red }}>*</span>
              </label>
              <div className="border rounded-xl bg-white p-2.5 max-h-40 overflow-y-auto" style={{ borderColor: "#fde68a" }}>
                {REQUEST_REASON_OPTIONS.map(reason => {
                  const selected = (form.requestReasons||[]).includes(reason);
                  return (
                    <label key={reason} className="flex items-start gap-2 text-[10px] mb-1 cursor-pointer" style={{ color: "#92400e" }}>
                      <input
                        type="checkbox"
                        className="mt-0.5 w-3 h-3"
                        checked={selected}
                        onChange={e => {
                          const curr = form.requestReasons||[];
                          const next = e.target.checked ? [...curr,reason] : curr.filter(r=>r!==reason);
                          up("requestReasons", next);
                          const parts=[...next]; if(form.requestOtherReason) parts.push(form.requestOtherReason);
                          up("requestTitle", parts.join(" · "));
                          if(errors.requestTitle) setErrors(p=>({...p,requestTitle:""}));
                        }}
                      />
                      <span>{reason}</span>
                    </label>
                  );
                })}
              </div>
              <input
                value={form.requestOtherReason||""}
                onChange={e=>{
                  const val=e.target.value; up("requestOtherReason",val);
                  const parts=[...(form.requestReasons||[])]; if(val) parts.push(val);
                  up("requestTitle", parts.join(" · "));
                }}
                placeholder="Other reason…"
                className={`mt-2 ${inp}`}
                style={{ borderColor: "#fde68a" }}
              />
              {errors.requestTitle && (
                <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: C.red }}>
                  <I n="alert" size={11} color={C.red} /> {errors.requestTitle}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "#92400e" }}>
                Description <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                value={form.requestDescription}
                rows={4}
                onChange={e=>{
                  up("requestDescription",e.target.value);
                  if(errors.requestDescription) setErrors(p=>({...p,requestDescription:""}));
                }}
                placeholder="Detailed justification…"
                className={`resize-none ${errors.requestDescription?inpErr:inp}`}
                style={{ borderColor: errors.requestDescription ? undefined : "#fde68a" }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FileZone
                  label="Parent Approval Document"
                  sublabel="Signed letter from parent committee"
                  required
                  file={form.parentApprovalDoc}
                  onFile={f=>{
                    up("parentApprovalDoc",f);
                    if(errors.parentApprovalDoc) setErrors(p=>({...p,parentApprovalDoc:""}));
                  }}
                  accept="application/pdf,image/*"
                  icon=""
                />
                {errors.parentApprovalDoc && (
                  <p className="text-xs font-semibold mt-1" style={{ color: C.red }}>{errors.parentApprovalDoc}</p>
                )}
              </div>
              <div>
                <FileZone
                  label="School Budget Document"
                  sublabel="Detailed budget breakdown"
                  required
                  file={form.schoolBudgetDoc}
                  onFile={f=>{
                    up("schoolBudgetDoc",f);
                    if(errors.schoolBudgetDoc) setErrors(p=>({...p,schoolBudgetDoc:""}));
                  }}
                  accept="application/pdf,image/*"
                  icon="📊"
                />
                {errors.schoolBudgetDoc && (
                  <p className="text-xs font-semibold mt-1" style={{ color: C.red }}>{errors.schoolBudgetDoc}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowIncreaseModal(false)}
                className="px-4 py-2 rounded-xl border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL WRAPPER
// ════════════════════════════════════════════════════════════
export function CreateBabyeyiModal({ session, isOpen, onClose, onSuccess, editRecord = null, listTheme = false }) {
  useEffect(() => {
    if (isOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const editClasses = editRecord
    ? (Array.isArray(editRecord.classes) && editRecord.classes.length ? editRecord.classes : [editRecord.class]).filter(Boolean)
    : [];
  const editSubtitle = editRecord
    ? [editClasses.join(", "), editRecord.term, editRecord.academicYear, editRecord.docId].filter(Boolean).join(" · ")
    : null;
  const headerStyle = listTheme
    ? { background: "linear-gradient(135deg, #000435, #0a1142)" }
    : { background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` };
  const subtitleColor = listTheme ? "#FBBF24" : "#FED44A";
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: listTheme ? "rgba(0,4,53,0.82)" : "rgba(10,8,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col flex-1 min-h-0 w-full bg-white overflow-hidden m-0 sm:m-3 sm:rounded-2xl sm:border sm:max-h-[calc(100dvh-1.5rem)]"
        style={{
          boxShadow: listTheme
            ? "0 30px 80px rgba(0,4,53,0.45), 0 0 0 1px rgba(251,191,36,0.2)"
            : "0 30px 80px rgba(254,191,16,0.25), 0 0 0 1px rgba(254,191,16,0.15)",
          animation: "modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          borderColor: listTheme ? "rgba(251,191,36,0.2)" : "rgba(254,191,16,0.15)",
        }}
      >
        <div className="px-4 sm:px-6 py-4 shrink-0 flex items-center justify-between" style={headerStyle}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: listTheme ? "rgba(251,191,36,0.18)" : "rgba(254,191,16,0.2)" }}>
              {editRecord
                ? <Pencil size={16} color="#FED44A" strokeWidth={2.25} aria-hidden />
                : <ClipboardPen size={16} color="#FED44A" strokeWidth={2.25} aria-hidden />}
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-white text-sm sm:text-base leading-tight truncate">
                {editRecord ? "Edit Babyeyi" : "Create Babyeyi"}
              </h1>
              <p className="text-[10px] truncate" style={{ color: subtitleColor }}>
                {session?.schoolName || "School"}
                {editRecord ? (editSubtitle ? ` — ${editSubtitle}` : " — Update document") : " — New document"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all hover:bg-white/20 shrink-0"
            style={{ color: "rgba(255,255,255,0.7)" }}
            title="Close">
            <X size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <WizardContent session={session} onClose={onClose} onSuccess={onSuccess} editRecord={editRecord} embedded listTheme={listTheme} />
        </div>
      </div>

      <style>{`
        @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP (full-page create wizard + list)
// ════════════════════════════════════════════════════════════
export default function App({ session, lang, setLang }) {
  const [view, setView] = useState("wizard");

  if (view === "list") {
    return (
      <div className="min-h-screen" style={{ background: C.goldBg, fontFamily: "'Montserrat', sans-serif" }}>
        <div className="fixed top-3 left-3 z-50">
          <button onClick={() => setView("wizard")}
            className="flex items-center gap-2 px-3 py-2 bg-white border text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:bg-slate-100"
            style={{ borderColor: C.goldBorder }}>
            <I n="chevL" size={12} /> Back to Wizard
          </button>
        </div>
        <BabyeyiList session={session} lang={lang} setLang={setLang} />
      </div>
    );
  }

  return (
    <WizardContent
      session={session}
      onClose={() => setView("list")}
      embedded={false}
    />
  );
}