import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

/** DEO portal — navy (#000435) + amber only */
export const NAVY = '#000435';
export const AMBER = '#f59e0b';
export const AMBER_LIGHT = '#fbbf24';
export const AMBER_DARK = '#d97706';

export const C = {
  navy: NAVY,
  navyMid: '#000c6e',
  amber: AMBER,
  amberLight: AMBER_LIGHT,
  amberDark: AMBER_DARK,
  amberBg: '#fffbeb',
  amberBgMid: '#fef3c7',
  amberBorder: '#fde68a',
  white: '#ffffff',
  /** Legacy aliases used across district components */
  gold: AMBER,
  goldLight: AMBER_LIGHT,
  goldDark: AMBER_DARK,
  goldDeep: AMBER_DARK,
  goldBg: '#fffbeb',
  goldBgMid: '#fef3c7',
  goldBorder: '#fde68a',
  dark: NAVY,
  darkMid: '#000c6e',
  emerald: AMBER,
  emeraldDark: NAVY,
  emeraldBg: '#fffbeb',
  emeraldBord: '#fde68a',
  red: NAVY,
  red50: '#fffbeb',
  red700: NAVY,
  red800: NAVY,
  redBorder: '#fde68a',
  amberBord: '#fde68a',
  blue: NAVY,
  blue700: NAVY,
  blueBg: 'rgba(0,4,53,0.06)',
  blueBord: 'rgba(0,4,53,0.12)',
  violet: AMBER_DARK,
  violetBg: '#fffbeb',
  violetBord: '#fde68a',
  slate100: '#F8FAFC',
  slate200: '#E5E7EB',
  slate400: '#94a3b8',
  slate500: '#64748B',
};

export const font = "'Montserrat', sans-serif";

export const inp = {
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: font,
  border: `1.5px solid ${C.amberBorder}`,
  borderRadius: 12,
  background: 'white',
  color: C.navy,
  outline: 'none',
  boxSizing: 'border-box',
};

export const STATUS_CFG = {
  approved: {
    label: 'Approved',
    textClass: 'text-deo-navy',
    bgClass: 'bg-deo-amber-bg',
    borderClass: 'border-deo-amber-border',
    icon: CheckCircle,
    textColor: C.navy,
    bg: C.amberBg,
    border: C.amberBorder,
  },
  pending: {
    label: 'Pending',
    textClass: 'text-deo-amber-dark',
    bgClass: 'bg-deo-amber-bg',
    borderClass: 'border-deo-amber-border',
    icon: Clock,
    textColor: C.amberDark,
    bg: C.amberBg,
    border: C.amberBorder,
  },
  rejected: {
    label: 'Rejected',
    textClass: 'text-deo-navy',
    bgClass: 'bg-white',
    borderClass: 'border-deo-amber-border',
    icon: XCircle,
    textColor: C.navy,
    bg: '#fff',
    border: C.amberBorder,
  },
  draft: {
    label: 'Draft',
    textClass: 'text-deo-navy/60',
    bgClass: 'bg-deo-slate-100',
    borderClass: 'border-deo-slate-200',
    icon: FileText,
    textColor: C.slate500,
    bg: C.slate100,
    border: C.slate200,
  },
  recommended: {
    label: 'Sent to NESA',
    textClass: 'text-deo-navy',
    bgClass: 'bg-deo-amber-bg',
    borderClass: 'border-deo-amber-border',
    icon: CheckCircle,
    textColor: C.navy,
    bg: C.amberBg,
    border: C.amberBorder,
  },
};

export const st = (s) => STATUS_CFG[s] || STATUS_CFG.draft;

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .anim { animation: fadeIn .25s ease-out; }
  .deo-sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .deo-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
  .deo-main-scroll::-webkit-scrollbar { width: 6px; }
  .deo-main-scroll::-webkit-scrollbar-thumb { background: ${C.amberBorder}; border-radius: 99px; }
  @media (max-width: 1023px) {
    .deo-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 639px) {
    .deo-stats-grid { grid-template-columns: 1fr 1fr !important; }
    .deo-hero-pills { flex-direction: column; align-items: flex-start !important; }
  }
`;
