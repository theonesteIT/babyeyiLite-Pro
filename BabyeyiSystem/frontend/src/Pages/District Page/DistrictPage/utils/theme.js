import { CheckCircle, Clock, XCircle, FileText } from "lucide-react";

export const C = {
  gold: "#FEBF10",
  goldLight: "#FFD84D",
  goldDark: "#d97706",
  goldDeep: "#8A6500",
  goldBg: "#FFFDF3",
  goldBgMid: "#FFF6CC",
  goldBorder: "#FFE58A",
  dark: "#000435",
  darkMid: "#1a1f5c",
  emerald: "#10b981",
  emeraldDark: "#047857",
  emeraldBg: "#ecfdf5",
  emeraldBord: "#a7f3d0",
  red: "#ef4444",
  red50: "#FEF2F2",
  red700: "#b91c1c",
  red800: "#991B1B",
  redBorder: "#FECACA",
  amberBg: "#fffbeb",
  amberBord: "#fde68a",
  blue: "#3b82f6",
  blue700: "#1d4ed8",
  blueBg: "#eff6ff",
  blueBord: "#bfdbfe",
  violet: "#7c3aed",
  violetBg: "#f5f3ff",
  violetBord: "#ddd6fe",
  slate100: "#F8FAFC",
  slate200: "#E2E8F0",
  slate400: "#94a3b8",
  slate500: "#64748B",
};

export const font = '"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif';

/** Shared inline styles for inputs / selects in district DEO UI */
export const inp = {
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: font,
  border: `1.5px solid ${C.goldBorder}`,
  borderRadius: 12,
  background: "white",
  color: C.dark,
  outline: "none",
  boxSizing: "border-box",
};

// ════════════════════════════════════════════════════════════════
// STATUS CONFIG (Migrated to Tailwind Classes)
// ════════════════════════════════════════════════════════════════
export const STATUS_CFG = {
  approved: {
    label: "Approved",
    textClass: "text-deo-emerald-dark",
    bgClass: "bg-deo-emerald-bg",
    borderClass: "border-deo-emerald-border",
    icon: CheckCircle,
    textColor: C.emeraldDark,
    bg: C.emeraldBg,
    border: C.emeraldBord,
  },
  pending: {
    label: "Pending",
    textClass: "text-[#92400e]",
    bgClass: "bg-deo-amber-bg",
    borderClass: "border-deo-amber-border",
    icon: Clock,
    textColor: "#92400e",
    bg: C.amberBg,
    border: C.amberBord,
  },
  rejected: {
    label: "Rejected",
    textClass: "text-deo-red-800",
    bgClass: "bg-deo-red-50",
    borderClass: "border-deo-red-border",
    icon: XCircle,
    textColor: C.red800,
    bg: C.red50,
    border: C.redBorder,
  },
  draft: {
    label: "Draft",
    textClass: "text-deo-slate-500",
    bgClass: "bg-deo-slate-100",
    borderClass: "border-deo-slate-200",
    icon: FileText,
    textColor: C.slate500,
    bg: C.slate100,
    border: C.slate200,
  },
  recommended: {
    label: "Sent to NESA",
    textClass: "text-[#1d4ed8]",
    bgClass: "bg-deo-blue-bg",
    borderClass: "border-deo-blue-border",
    icon: CheckCircle,
    textColor: "#1d4ed8",
    bg: C.blueBg,
    border: C.blueBord,
  },
};

export const st = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

export const globalStyles = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .anim { animation: fadeIn .25s ease-out; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:${C.goldBorder}; border-radius:99px; }
  option { background:white; color:${C.dark}; }
`;
