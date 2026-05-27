/** NESA portal — navy (#000435) + amber, Montserrat */
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
  gold: AMBER,
  goldLight: AMBER_LIGHT,
  goldDark: AMBER_DARK,
  goldDeep: AMBER_DARK,
  goldBg: '#fffbeb',
  goldBgMid: '#fef3c7',
  goldBorder: '#fde68a',
  dark: NAVY,
  darkMid: '#000c6e',
  emerald: '#10b981',
  emeraldDark: '#047857',
  emeraldBg: '#fffbeb',
  emeraldBord: '#fde68a',
  red: '#ef4444',
  red50: '#fef2f2',
  red700: '#b91c1c',
  red800: '#991b1b',
  redBorder: '#fecaca',
  amberBord: '#fde68a',
  blue: NAVY,
  blueBg: 'rgba(0, 4, 53, 0.06)',
  blueBord: 'rgba(0, 4, 53, 0.15)',
  blue700: NAVY,
  violet: AMBER_DARK,
  violetBg: '#fffbeb',
  violetBord: '#fde68a',
  slate100: '#f8fafc',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
};

export const font = "'Montserrat', sans-serif";

export const inp = {
  width: '100%',
  padding: '10px 14px',
  background: C.goldBg,
  border: `1px solid ${C.goldBorder}`,
  borderRadius: 12,
  fontSize: 13,
  color: C.dark,
  outline: 'none',
  fontFamily: font,
  boxSizing: 'border-box',
};

export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .anim { animation: fadeIn .25s ease-out; }
  .nesa-sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .nesa-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
  .nesa-main-scroll::-webkit-scrollbar { width: 6px; }
  .nesa-main-scroll::-webkit-scrollbar-thumb { background: ${C.amberBorder}; border-radius: 99px; }
  @media (max-width: 1023px) {
    .nesa-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 639px) {
    .nesa-stats-grid { grid-template-columns: 1fr 1fr !important; }
    .nesa-hero-pills { flex-direction: column; align-items: flex-start !important; }
  }
`;
