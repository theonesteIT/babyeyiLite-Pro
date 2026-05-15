// ================================================================
// NESABABYEYIDashboard.jsx — Gold Theme (Montserrat + #FEBF10)
// Redesigned to match DistrictBabyeyiDashboard gold aesthetic
// ================================================================
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Bell, ChevronRight, X, Menu, TrendingUp, Activity,
  AlertCircle, CheckCircle, XCircle, Download, RefreshCw, Search,
  Info, Loader2, Save, Send, FileText, Home, ShieldCheck,
  Layers, MapPin, Building2, School, DollarSign, Filter,
  Eye, Clock, ArrowUpRight, Flag, Award,
  Wifi, WifiOff, RotateCcw, Target, Star, Users,
  Calendar, AlertTriangle, Check,
  ChevronDown, ExternalLink, Printer, ZoomIn, ZoomOut,
  FileCheck, FileBadge, Stamp, BadgeCheck,
  ChevronLeft, Paperclip, MessageSquare, ThumbsUp,
  ThumbsDown, CornerUpLeft, LogOut, Loader, PenLine,
  BarChart2, Shield, User, Lock, Upload
} from "lucide-react";
const BRAND_LOGO = "/1BABYEYI LOGO FINAL.png";
import { useAuth } from "../../../context/AuthContext";
import { BABYEYI_PAGE_BG } from "../../../theme/babyeyiDashboardTheme";
import { getPostLogoutLoginPath } from "../../../utils/postLogoutLoginPath";
import FeeLimitsView from "./FeeLimitsView";

// ── CONFIG ──────────────────────────────────────────────────────
const BASE_URL    = import.meta.env?.VITE_API_BASE?.replace('/api','') || "http://localhost:5100";
const API_BASE    = `${BASE_URL}/api`;
const NESA_API    = `${API_BASE}/nesa/babyeyi`;
const FEE_API     = `${API_BASE}/fee-limits`;
const SCHOOLS_API = `${API_BASE}/schools`;

const resolveDocUrl = (p) =>
  !p ? null : p.startsWith('http') ? p : `${BASE_URL}${p.startsWith('/') ? '' : '/'}${p}`;

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw Object.assign(new Error(json.message || 'Request failed'), { status: res.status });
  return json;
};

const fmt  = (n) => Number(n || 0).toLocaleString();
const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const toArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return [v];
  return [];
};

// ════════════════════════════════════════════════════════════════
// Babyeyi shell: navy #000435 + amber (aligned with School Manager)
// ════════════════════════════════════════════════════════════════
const NAVY = "#000435";
const NAVY_MID = "#0c1a3a";
const C = {
  gold:        "#FBBF24",
  goldLight:   "#FDE68A",
  goldDark:    "#D97706",
  goldDeep:    NAVY,
  goldBg:      "#FFFBEB",
  goldBgMid:   "#FEF3C7",
  goldBorder:  "#FCD34D",

  dark:        NAVY,
  darkMid:     "#1e3a5f",

  emerald:     "#10B981",
  emeraldDark: "#047857",
  emeraldBg:   "#FFFBEB",
  emeraldBord: "#FCD34D",

  red:         "#EF4444",
  red50:       "#FEF2F2",
  red700:      "#B91C1C",
  red800:      "#991B1B",
  redBorder:   "#FECACA",

  amber:       "#F59E0B",
  amberBg:     "#FFFBEB",
  amberBord:   "#FDE68A",

  blue:        NAVY,
  blueBg:      "rgba(0, 4, 53, 0.06)",
  blueBord:    "rgba(0, 4, 53, 0.15)",
  blue700:     NAVY,

  violet:      "#D97706",
  violetBg:    "#FFFBEB",
  violetBord:  "#FCD34D",

  slate100:    "#F8FAFC",
  slate200:    "#E2E8F0",
  slate400:    "#94A3B8",
  slate500:    "#64748B",
};

const font = '"MTN Brighter Sans", "Nunito", "Varela Round", sans-serif';

const globalStyles = `
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform: rotate(360deg); } }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
  .anim { animation: fadeIn .25s ease-out; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-thumb { background:${C.goldBorder}; border-radius:99px; }
  option { background:white; color:${C.dark}; }
`;

const inp = {
  width: "100%", padding: "10px 14px",
  background: C.goldBg, border: `1px solid ${C.goldBorder}`,
  borderRadius: 12, fontSize: 13, color: C.dark,
  outline: "none", fontFamily: font, boxSizing: "border-box",
};

// ════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ════════════════════════════════════════════════════════════════
const Spinner = ({ msg }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:12, fontFamily:font }}>
    <Loader2 style={{ width:36, height:36, color:C.gold, animation:"spin 0.8s linear infinite" }}/>
    {msg && <p style={{ fontSize:13, color:C.goldDark, fontWeight:600 }}>{msg}</p>}
  </div>
);

const Empty = ({ msg = 'No data found', icon: Icon = Building2 }) => (
  <div style={{ textAlign:"center", padding:"60px 20px", fontFamily:font }}>
    <Icon style={{ width:40, height:40, color:C.goldBorder, margin:"0 auto 12px", display:"block" }}/>
    <p style={{ fontSize:13, fontWeight:600, color:C.goldDark }}>{msg}</p>
  </div>
);

const Toast = ({ toasts, remove }) => (
  <div style={{ position:"fixed", bottom:16, right:16, zIndex:200, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none", maxWidth:"calc(100vw - 2rem)" }}>
    {toasts.map(t => {
      const s = {
        success: { bg:C.emeraldBg,  border:C.emeraldBord, text:C.emeraldDark, icon:<CheckCircle style={{ width:16, height:16, color:C.emerald }}/> },
        error:   { bg:C.red50,      border:C.redBorder,   text:C.red700,      icon:<XCircle    style={{ width:16, height:16, color:C.red     }}/> },
        warning: { bg:C.amberBg,    border:C.amberBord,   text:"#92400e",     icon:<AlertCircle style={{ width:16, height:16, color:C.amber  }}/> },
      }[t.type] || { bg:C.goldBg, border:C.goldBorder, text:C.goldDark, icon:<Info style={{ width:16, height:16, color:C.goldDark }}/> };
      return (
        <div key={t.id} style={{ pointerEvents:"auto", display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:16, boxShadow:"0 4px 20px rgba(26,18,0,0.15)", border:`1px solid ${s.border}`, background:s.bg, width:300, fontFamily:font }}>
          <div style={{ marginTop:1, flexShrink:0 }}>{s.icon}</div>
          <p style={{ flex:1, fontSize:12, fontWeight:600, color:s.text, lineHeight:1.4, margin:0 }}>{t.message}</p>
          <button onClick={()=>remove(t.id)} style={{ opacity:0.5, background:"none", border:"none", cursor:"pointer", padding:0 }}><X style={{ width:14, height:14, color:s.text }}/></button>
        </div>
      );
    })}
  </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color='gold', alert, onClick, loading }) => {
  const bg = {
    gold:    `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
    emerald: `linear-gradient(135deg, ${NAVY_MID}, ${NAVY})`,
    amber:   `linear-gradient(135deg, #d97706, #fbbf24)`,
    red:     `linear-gradient(135deg, #b45309, #f59e0b)`,
    blue:    `linear-gradient(135deg, ${NAVY}, #1e3a5f)`,
    violet:  `linear-gradient(135deg, #d97706, #fbbf24)`,
    indigo:  `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`,
    cyan:    `linear-gradient(135deg, ${NAVY_MID}, #1e3a5f)`,
    teal:    `linear-gradient(135deg, #d97706, #fbbf24)`,
  }[color] || `linear-gradient(135deg, ${NAVY}, ${NAVY_MID})`;

  return (
    <div onClick={onClick}
      style={{ background:bg, borderRadius:20, padding:"14px 16px", boxShadow:"0 4px 16px rgba(26,18,0,0.18)", cursor:onClick?"pointer":"default", position:"relative", overflow:"hidden", transition:"transform 150ms", fontFamily:font }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform="scale(1.02)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform="scale(1)")}>
      <div style={{ position:"absolute", inset:0, opacity:0.08, backgroundImage:"radial-gradient(circle at 80% 20%,white 0%,transparent 60%)", pointerEvents:"none" }}/>
      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
          <div style={{ padding:8, borderRadius:12, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon style={{ width:18, height:18, color:"white" }}/>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {alert && <span style={{ fontSize:9, fontWeight:900, background:"rgba(255,255,255,0.3)", color:"white", padding:"2px 6px", borderRadius:20, animation:"pulse 2s infinite" }}>!</span>}
            {loading && <Loader2 style={{ width:14, height:14, color:"rgba(255,255,255,0.6)", animation:"spin 0.8s linear infinite" }}/>}
          </div>
        </div>
        <div style={{ fontSize:26, fontWeight:900, color:"white", marginBottom:2 }}>
          {loading ? <span style={{ display:"inline-block", width:48, height:28, background:"rgba(255,255,255,0.2)", borderRadius:6 }}/> : (value ?? "—")}
        </div>
        <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
};

const Badge = ({ status }) => {
  const map = {
    approved:      { bg:C.emeraldBg,  text:C.emeraldDark, border:C.emeraldBord },
    nesa_rejected: { bg:C.red50,      text:C.red800,      border:C.redBorder   },
    rejected:      { bg:C.red50,      text:C.red800,      border:C.redBorder   },
    pending:       { bg:C.amberBg,    text:"#92400e",     border:C.amberBord   },
    revision:      { bg:C.amberBg,    text:"#92400e",     border:C.amberBord   },
    recommended:   { bg:C.blueBg,     text:C.blue700,     border:C.blueBord    },
    active:        { bg:C.emeraldBg,  text:C.emeraldDark, border:C.emeraldBord },
    exceeded:      { bg:C.red50,      text:C.red800,      border:C.redBorder   },
    compliant:     { bg:C.emeraldBg,  text:C.emeraldDark, border:C.emeraldBord },
    public:        { bg:C.blueBg,     text:C.blue700,     border:C.blueBord    },
    private:       { bg:C.violetBg,   text:C.violet,      border:C.violetBord  },
    primary:       { bg:"#ecfeff",    text:"#0e7490",     border:"#a5f3fc"     },
    secondary:     { bg:C.blueBg,     text:C.blue700,     border:C.blueBord    },
    nursery:       { bg:"#fdf2f8",    text:"#9d174d",     border:"#f9a8d4"     },
    tvet:          { bg:C.emeraldBg,  text:C.emeraldDark, border:C.emeraldBord },
  };
  const s = map[status?.toLowerCase()] || { bg:C.goldBg, text:C.goldDark, border:C.goldBorder };
  const label = status?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—';
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 10px", borderRadius:8, fontSize:11, fontWeight:700, background:s.bg, color:s.text, border:`1px solid ${s.border}`, fontFamily:font }}>
      {label}
    </span>
  );
};

const THead = ({ cols }) => (
  <thead>
    <tr style={{ borderBottom:`1px solid ${C.goldBorder}`, background:C.goldBg }}>
      {cols.map(h=>(
        <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", fontFamily:font }}>{h}</th>
      ))}
    </tr>
  </thead>
);

const Modal = ({ title, onClose, children, size='max-w-2xl' }) => (
  <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(26,18,0,0.35)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"0 0 0 0" }}
    className="sm:items-center sm:p-4">
    <div style={{ background:"white", borderRadius:"24px 24px 0 0", boxShadow:"0 -8px 40px rgba(26,18,0,0.2)", width:"100%", maxWidth:672, maxHeight:"92vh", display:"flex", flexDirection:"column", border:`1px solid ${C.goldBorder}`, fontFamily:font }}
      className="sm:rounded-3xl">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.goldBorder}`, background:C.goldBg, flexShrink:0 }}>
        <h3 style={{ fontSize:15, fontWeight:900, color:C.dark, margin:0 }}>{title}</h3>
        <button onClick={onClose} style={{ color:C.goldDark, padding:6, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", display:"flex" }}><X style={{ width:16, height:16 }}/></button>
      </div>
      <div style={{ overflowY:"auto", flex:1, padding:20 }}>{children}</div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// CHARTS
// ════════════════════════════════════════════════════════════════
const LineAreaChart = ({ data=[], labelKey='label', valueKey='value', color='#6366f1', height=140 }) => {
  const safe = toArray(data);
  if (!safe.length) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:C.goldDark, fontSize:12, height }} >No data</div>;
  const W=500,H=height,PAD={top:16,bottom:28,left:36,right:12};
  const vals=safe.map(d=>Number(d[valueKey])||0);
  const max=Math.max(...vals,1);
  const xStep=(W-PAD.left-PAD.right)/(safe.length-1||1);
  const toY=v=>PAD.top+(1-v/max)*(H-PAD.top-PAD.bottom);
  const toX=i=>PAD.left+i*xStep;
  const pts=safe.map((d,i)=>({x:toX(i),y:toY(Number(d[valueKey])||0)}));
  const linePath=pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath=linePath+` L${pts[pts.length-1].x.toFixed(1)},${(H-PAD.bottom).toFixed(1)} L${PAD.left},${(H-PAD.bottom).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height }}>
      <defs>
        <linearGradient id={`ag${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.7"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75,1].map(f=>{
        const y=PAD.top+(1-f)*(H-PAD.top-PAD.bottom);
        return <line key={f} x1={PAD.left} y1={y} x2={W-PAD.right} y2={y} stroke={C.goldBorder} strokeWidth="1" strokeDasharray="4,3"/>;
      })}
      <path d={areaPath} fill={`url(#ag${color.replace('#','')})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5"/>
          <circle cx={p.x} cy={p.y} r="2" fill={color}/>
          <text x={p.x} y={H-PAD.bottom+12} textAnchor="middle" fontSize="9" fill={C.goldDark} fontWeight="600" fontFamily={font}>{safe[i][labelKey]}</text>
          <text x={p.x} y={p.y-9} textAnchor="middle" fontSize="9" fill={color} fontWeight="800" fontFamily={font}>{vals[i]}</text>
        </g>
      ))}
    </svg>
  );
};

const HBarChart = ({ data=[] }) => {
  const max = Math.max(...data.map(d=>Number(d.value)||0),1);
  const colors=[C.dark,'#ef4444','#f59e0b','#10b981','#8b5cf6','#06b6d4'];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:font }}>
      {data.map((d,i)=>{
        const pct=Math.round((Number(d.value)||0)/max*100);
        const c=d.color||colors[i%colors.length];
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:20, height:20, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:"white", flexShrink:0, background:c }}>{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.dark }}>{d.label}</span>
                <span style={{ fontSize:12, fontWeight:900, marginLeft:8, flexShrink:0, color:c }}>{d.value}</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:C.goldBgMid, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:3, background:`linear-gradient(90deg,${c},${c}88)`, width:`${pct}%`, transition:"width 700ms ease" }}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DonutChart = ({ data=[], size=140 }) => {
  if (!data.length) return null;
  const total=data.reduce((s,d)=>s+d.value,0);
  if (!total) return null;
  const cx=size/2, cy=size/2, R=size/2-8, r=R*0.58;
  let angle=-Math.PI/2;
  const slices=data.map(d=>{
    const a=(d.value/total)*2*Math.PI;
    const x1=cx+R*Math.cos(angle),y1=cy+R*Math.sin(angle);
    angle+=a;
    const x2=cx+R*Math.cos(angle),y2=cy+R*Math.sin(angle);
    const xi1=cx+r*Math.cos(angle-a),yi1=cy+r*Math.sin(angle-a);
    const xi2=cx+r*Math.cos(angle),yi2=cy+r*Math.sin(angle);
    const large=a>Math.PI?1:0;
    return {...d,path:`M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z`};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} opacity="0.9" stroke="white" strokeWidth="2"/>)}
      <circle cx={cx} cy={cy} r={r-4} fill="white"/>
      <text x={cx} y={cy-5} textAnchor="middle" fontSize="14" fontWeight="900" fill={C.dark} fontFamily={font}>{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="8" fontWeight="600" fill={C.goldDark} fontFamily={font}>TOTAL</text>
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════
// DOC VIEWER MODAL
// ════════════════════════════════════════════════════════════════
function DocViewerModal({ url, title, onClose }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  const isPdf   = /\.pdf(\?|$)/i.test(url);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(26,18,0,0.7)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"white", borderRadius:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", width:"100%", maxWidth:768, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", border:`1px solid ${C.goldBorder}`, fontFamily:font }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:`1px solid ${C.goldBorder}`, background:C.goldBg, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <FileText style={{ width:16, height:16, color:C.goldDark }}/>
            <h3 style={{ fontWeight:900, color:C.dark, fontSize:13, margin:0, maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title || "Document"}</h3>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {[{ href:url, target:"_blank", label:"Open", icon:ExternalLink }, { href:url, download:true, label:"Save", icon:Download }].map(({href,target,download,label,icon:Icon})=>(
              <a key={label} href={href} target={target} download={download}
                style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:C.goldDark, padding:"6px 12px", borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", textDecoration:"none", fontFamily:font }}>
                <Icon style={{ width:12, height:12 }}/> {label}
              </a>
            ))}
            <button onClick={onClose} style={{ padding:6, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", color:C.goldDark, display:"flex" }}><X style={{ width:16, height:16 }}/></button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", background:C.goldBgMid, padding:16, display:"flex", alignItems:"center", justifyContent:"center", minHeight:400 }}>
          {isImage
            ? <img src={url} alt={title} style={{ maxWidth:"100%", maxHeight:"70vh", borderRadius:16, boxShadow:"0 8px 32px rgba(26,18,0,0.12)", objectFit:"contain" }}/>
            : isPdf
              ? <iframe src={url} title={title} style={{ width:"100%", height:"65vh", borderRadius:16, border:`1px solid ${C.goldBorder}` }}/>
              : (
                <div style={{ textAlign:"center", padding:"40px 0" }}>
                  <FileText style={{ width:48, height:48, color:C.goldBorder, margin:"0 auto 12px", display:"block" }}/>
                  <p style={{ color:C.goldDark, fontWeight:600, fontSize:13, fontFamily:font }}>Preview not available</p>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ color:C.goldDark, fontSize:13, fontFamily:font }}>Open file directly</a>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// LOGOUT BUTTON
// ════════════════════════════════════════════════════════════════
function LogoutButton({ className = '', compact = false }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [loading,     setLoading]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setLoading(true); setShowConfirm(false);
    try { await logout(); } finally {
      setLoading(false);
      navigate(getPostLogoutLoginPath(), { replace: true });
    }
  };

  return (
    <>
      {showConfirm && (
        <div style={{ position:"fixed", inset:0, zIndex:400, background:"rgba(26,18,0,0.3)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"white", borderRadius:24, border:`1px solid ${C.goldBorder}`, boxShadow:"0 20px 60px rgba(26,18,0,0.2)", width:"100%", maxWidth:360, padding:24, textAlign:"center", fontFamily:font }}>
            <div style={{ width:52, height:52, background:C.red50, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <LogOut style={{ width:26, height:26, color:C.red }}/>
            </div>
            <h3 style={{ fontWeight:900, color:C.dark, fontSize:17, margin:"0 0 6px" }}>Sign Out?</h3>
            <p style={{ color:C.goldDark, fontSize:13, margin:"0 0 20px" }}>You'll be redirected to the login page.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowConfirm(false)} style={{ flex:1, padding:12, border:`2px solid ${C.goldBorder}`, borderRadius:14, fontSize:13, fontWeight:700, color:C.darkMid, background:"white", cursor:"pointer", fontFamily:font }}>Cancel</button>
              <button onClick={handleLogout} disabled={loading} style={{ flex:1, padding:12, background:C.red, color:"white", borderRadius:14, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:loading?0.6:1, fontFamily:font }}>
                {loading?<Loader style={{ width:16, height:16, animation:"spin 0.8s linear infinite" }}/>:<><LogOut style={{ width:16, height:16 }}/> Sign Out</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {compact ? (
        <button onClick={()=>setShowConfirm(true)} disabled={loading} title="Sign Out"
          style={{ padding:8, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", color:C.goldDark, display:"flex", opacity:loading?0.5:1 }}>
          {loading?<Loader style={{ width:16, height:16, animation:"spin 0.8s linear infinite" }}/>:<LogOut style={{ width:16, height:16 }}/>}
        </button>
      ) : (
        <button onClick={()=>setShowConfirm(true)} disabled={loading}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, fontSize:13, fontWeight:700, color:C.red, background:"transparent", border:`1px solid transparent`, cursor:"pointer", fontFamily:font, transition:"all 150ms", opacity:loading?0.5:1 }}
          onMouseEnter={e=>{ e.currentTarget.style.background=C.red50; e.currentTarget.style.borderColor=C.redBorder; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.borderColor="transparent"; }}>
          {loading?<Loader style={{ width:16, height:16, animation:"spin 0.8s linear infinite", flexShrink:0 }}/>:<LogOut style={{ width:16, height:16, flexShrink:0 }}/>}
          <span>{loading?'Signing out…':'Sign Out'}</span>
        </button>
      )}
    </>
  );
}

// ── Profile photo URL ───────────────────────────────────────────
const profilePhotoUrl = (photo) => {
  if (!photo || typeof photo !== "string") return null;
  const p = photo.replace(/\\/g, "/").trim();
  if (p.startsWith("http")) return p;
  const base = (BASE_URL || "").replace(/\/$/, "");
  return base + (p.startsWith("/") ? p : "/" + p);
};

// ════════════════════════════════════════════════════════════════
// NESA PROFILE MODAL — change password + profile photo
// ════════════════════════════════════════════════════════════════
function NesaProfileModal({ open, user, onClose, onUpdated, toast }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const photoInputRef = useRef(null);

  if (!open) return null;

  const photoSrc = photoPreview || (user?.photo ? profilePhotoUrl(user.photo) : null);

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      const res = await fetch(`${API_BASE}/auth/profile/photo`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = "";
        onUpdated?.();
        if (toast) toast("Profile photo updated.", "success");
      } else if (toast) toast(json.message || "Upload failed", "error");
    } catch (e) {
      if (toast) toast("Failed to upload photo", "error");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      if (toast) toast("New password and confirm do not match", "error");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      if (toast) toast("New password must be at least 8 characters", "error");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        if (toast) toast("Password changed successfully.", "success");
      } else if (toast) toast(json.message || "Failed to change password", "error");
    } catch (e) {
      if (toast) toast("Failed to change password", "error");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(26,18,0,0.4)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"white", borderRadius:24, boxShadow:"0 20px 60px rgba(26,18,0,0.2)", border:`1px solid ${C.goldBorder}`, width:"100%", maxWidth:440, maxHeight:"90vh", overflowY:"auto", fontFamily:font }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.goldBorder}`, background:C.goldBg }}>
          <h3 style={{ fontWeight:900, color:C.dark, fontSize:18, margin:0, display:"flex", alignItems:"center", gap:8 }}>
            <User style={{ width:20, height:20, color:C.goldDark }}/> My Profile
          </h3>
          <button onClick={onClose} style={{ padding:8, borderRadius:12, border:"none", background:"transparent", cursor:"pointer", color:C.goldDark, display:"flex" }}>
            <X style={{ width:20, height:20 }}/>
          </button>
        </div>
        <div style={{ padding:24, display:"flex", flexDirection:"column", gap:24 }}>
          <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:16, padding:20 }}>
            <h4 style={{ fontWeight:700, color:C.dark, fontSize:13, margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}>
              <User style={{ width:16, height:16, color:C.gold }}/> Profile Photo
            </h4>
            <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
              <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:`3px solid ${C.goldBorder}`, background:C.goldBgMid, flexShrink:0 }}>
                {photoSrc ? (
                  <img src={photoSrc} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <User style={{ width:36, height:36, color:C.goldDark }}/>
                  </div>
                )}
              </div>
              <div>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display:"none" }}
                  onChange={e=>{ const f=e.target?.files?.[0]; if(f){ setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }}/>
                <button type="button" onClick={()=>photoInputRef.current?.click()} style={{ padding:"10px 16px", fontFamily:font, fontWeight:700, fontSize:12, background:C.goldBg, border:`2px solid ${C.goldBorder}`, borderRadius:12, color:C.dark, cursor:"pointer", marginRight:8 }}>
                  <Upload style={{ width:14, height:14, verticalAlign:"middle", marginRight:6 }}/> Choose
                </button>
                {photoFile && (
                  <button type="button" disabled={photoSaving} onClick={handlePhotoUpload} style={{ padding:"10px 16px", fontFamily:font, fontWeight:700, fontSize:12, background:C.dark, border:"none", borderRadius:12, color:C.gold, cursor:photoSaving?"not-allowed":"pointer", opacity:photoSaving?0.7:1 }}>
                    {photoSaving?<Loader2 style={{ width:14, height:14, animation:"spin 0.8s linear infinite", verticalAlign:"middle" }}/>:"Upload"}
                  </button>
                )}
                <p style={{ fontSize:11, color:C.goldDark, margin:"8px 0 0" }}>JPEG, PNG or WebP, max 2MB</p>
              </div>
            </div>
          </div>
          <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:16, padding:20 }}>
            <h4 style={{ fontWeight:700, color:C.dark, fontSize:13, margin:"0 0 12px", display:"flex", alignItems:"center", gap:8 }}>
              <Lock style={{ width:16, height:16, color:C.gold }}/> Change Password
            </h4>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Current password</label>
                <input type="password" value={pwForm.currentPassword} onChange={e=>setPwForm(f=>({ ...f, currentPassword:e.target.value }))} placeholder="Current password" style={{ ...inp, width:"100%", boxSizing:"border-box" }}/>
              </div>
              <div>
                <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>New password</label>
                <input type="password" value={pwForm.newPassword} onChange={e=>setPwForm(f=>({ ...f, newPassword:e.target.value }))} placeholder="At least 8 characters" style={{ ...inp, width:"100%", boxSizing:"border-box" }}/>
              </div>
              <div>
                <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Confirm new password</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e=>setPwForm(f=>({ ...f, confirmPassword:e.target.value }))} placeholder="Repeat new password" style={{ ...inp, width:"100%", boxSizing:"border-box" }}/>
              </div>
            </div>
            <button type="button" disabled={pwSaving||!pwForm.currentPassword||!pwForm.newPassword||!pwForm.confirmPassword} onClick={handleChangePassword} style={{ marginTop:16, padding:"12px 24px", fontFamily:font, fontWeight:700, fontSize:13, background:(pwSaving||!pwForm.currentPassword||!pwForm.newPassword||!pwForm.confirmPassword)?C.slate200:`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color:C.gold, border:"none", borderRadius:14, cursor:pwSaving?"not-allowed":"pointer", opacity:pwSaving?0.8:1 }}>
              {pwSaving?<><Loader2 style={{ width:16, height:16, animation:"spin 0.8s linear infinite", verticalAlign:"middle", marginRight:8 }}/> Updating…</>:"Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════════
const NAV = [
  { id:'dashboard',     icon:Home,       label:'Dashboard'       },
  { id:'fees',          icon:DollarSign, label:'Tuition Manager' },
  { id:'monitoring',    icon:Activity,   label:'Monitoring'      },
  { id:'approvals',     icon:ShieldCheck,label:'Approvals'       },
  { id:'schools',       icon:Building2,  label:'Schools'         },
  { id:'analytics',     icon:BarChart3,  label:'Analytics'       },
  { id:'notifications', icon:Bell,       label:'Notifications'   },
];

function Sidebar({ tab, switchTab, notifCount, online, user, onOpenProfile }) {
  return (
    <aside className="hidden lg:flex" style={{ flexDirection:"column", width:240, borderRight:`1px solid ${C.goldBorder}`, position:"fixed", left:0, top:0, height:"100%", zIndex:30, background:"rgba(255,251,232,0.98)", backdropFilter:"blur(8px)", fontFamily:font }}>
      {/* Header */}
      <div style={{ padding:"20px 16px", borderBottom:`1px solid ${C.goldBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:96, height:36, borderRadius:12, flexShrink:0, background:"#1F2937", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(26,18,0,0.25)", overflow:"hidden", padding:"4px 10px" }}>
            <img src={BRAND_LOGO} alt="Babyeyi logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
          </div>
          <div style={{ minWidth:0 }}>
            <h1 style={{ fontSize:14, fontWeight:900, color:C.dark, margin:0, lineHeight:1.2 }}>Authority Portal</h1>
            <p style={{ fontSize:10, color:C.goldDark, margin:0, fontWeight:600 }}>Babyeyi Fee Management</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:700, background:online?C.emeraldBg:C.amberBg, border:`1px solid ${online?C.emeraldBord:C.amberBord}`, color:online?C.emeraldDark:"#92400e" }}>
          {online?<Wifi style={{ width:12, height:12 }}/>:<WifiOff style={{ width:12, height:12 }}/>}
          {online?'Connected':'Offline Mode'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:10, overflowY:"auto" }}>
        {NAV.map(item=>{
          const isActive = tab===item.id;
          return (
            <button key={item.id} onClick={()=>switchTab(item.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, marginBottom:2, border:"none", cursor:"pointer", fontFamily:font, fontWeight:700, fontSize:13, textAlign:"left", background:isActive?`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`:"transparent", color:isActive?C.gold:C.goldDeep, boxShadow:isActive?"0 4px 12px rgba(26,18,0,0.18)":"none", transition:"all 150ms", position:"relative" }}>
              <item.icon style={{ width:16, height:16, flexShrink:0 }}/>
              <span>{item.label}</span>
              {item.id==='notifications' && notifCount>0 && (
                <span style={{ marginLeft:"auto", fontSize:9, background:C.red, color:"white", borderRadius:20, width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900 }}>{notifCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:10, borderTop:`1px solid ${C.goldBorder}` }}>
        {user && (
          <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:14, padding:10, marginBottom:8 }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.dark, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {user.full_name || `${user.first_name||''} ${user.last_name||''}`}
            </p>
            <p style={{ fontSize:10, color:C.goldDark, fontWeight:600, margin:0 }}>{user.role?.name || 'NESA Admin'}</p>
          </div>
        )}
        {onOpenProfile && (
          <button type="button" onClick={onOpenProfile} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, fontSize:13, fontWeight:700, color:C.goldDeep, background:C.goldBg, border:`1px solid ${C.goldBorder}`, cursor:"pointer", fontFamily:font, marginBottom:8 }}>
            <User style={{ width:16, height:16, flexShrink:0 }}/> My profile
          </button>
        )}
        <div style={{ background:C.goldBgMid, border:`1px solid ${C.goldBorder}`, borderRadius:12, padding:"8px 10px", textAlign:"center", marginBottom:8 }}>
          <p style={{ fontSize:10, color:C.goldDark, fontWeight:700, margin:0 }}>NESA Rwanda · v2.0</p>
        </div>
        <LogoutButton/>
      </div>
    </aside>
  );
}

// ════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════
function Header({ tab, online, notifCount, switchTab, setMobileOpen, user }) {
  const current = NAV.find(n=>n.id===tab);
  return (
    <header style={{ position:"sticky", top:0, zIndex:20, borderBottom:`1px solid ${C.goldBorder}`, padding:"12px 16px", background:"rgba(255,251,232,0.94)", backdropFilter:"blur(12px)", fontFamily:font }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="lg:hidden" onClick={()=>setMobileOpen(true)} style={{ color:C.goldDark, background:"transparent", border:"none", cursor:"pointer", padding:6, borderRadius:10, display:"flex" }}>
            <Menu style={{ width:20, height:20 }}/>
          </button>
          <div>
            <h2 style={{ fontSize:16, fontWeight:900, color:C.dark, margin:0, lineHeight:1.2 }}>{current?.label||'Dashboard'}</h2>
            <p className="hidden sm:block" style={{ fontSize:11, color:C.goldDark, fontWeight:600, margin:0 }}>NESA Rwanda · National Level</p>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="hidden sm:flex" style={{ alignItems:"center", gap:6, padding:"5px 10px", borderRadius:10, fontSize:11, fontWeight:700, background:online?C.emeraldBg:C.amberBg, border:`1px solid ${online?C.emeraldBord:C.amberBord}`, color:online?C.emeraldDark:"#92400e" }}>
            {online?<Wifi style={{ width:12, height:12 }}/>:<WifiOff style={{ width:12, height:12 }}/>}
            {online?'Online':'Offline'}
          </div>
          <button onClick={()=>switchTab('notifications')} style={{ position:"relative", padding:8, borderRadius:10, background:"transparent", border:"none", cursor:"pointer", color:C.goldDark, display:"flex" }}>
            <Bell style={{ width:18, height:18 }}/>
            {notifCount>0 && <span style={{ position:"absolute", top:2, right:2, width:14, height:14, background:C.red, color:"white", fontSize:8, fontWeight:900, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>{notifCount}</span>}
          </button>
          {user && (
            <div className="hidden sm:flex" style={{ alignItems:"center", gap:8, padding:"8px 12px", borderRadius:14, background:C.goldBg, border:`1px solid ${C.goldBorder}` }}>
              <div style={{
                width:28, height:28, borderRadius:9,
                background: resolveDocUrl(user.photo) ? "transparent" : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden",
              }}>
                {resolveDocUrl(user.photo) ? (
                  <img src={resolveDocUrl(user.photo)} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                ) : (
                  <Shield style={{ width:14, height:14, color:C.gold }}/>
                )}
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:C.dark, margin:0, lineHeight:1.2 }}>{user.full_name || `${user.first_name||''} ${user.last_name||''}`.trim() || "NESA User"}</p>
                <p style={{ fontSize:9, color:C.goldDark, margin:0 }}>NESA Admin</p>
              </div>
            </div>
          )}
          <LogoutButton compact className="lg:hidden"/>
        </div>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════
export default function NESABABYEYIDashboard() {
  const { user, loading: authLoading, isLoggedIn, refresh } = useAuth();
  const navigate = useNavigate();

  const [tab,        setTab]        = useState('dashboard');
  const [toasts,     setToasts]     = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online,     setOnline]     = useState(navigator.onLine);
  const [notifCount, setNotifCount] = useState(3);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(()=>{
    if (!authLoading && !isLoggedIn) navigate(getPostLogoutLoginPath(), { replace: true });
  },[authLoading,isLoggedIn,navigate]);

  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false);
    window.addEventListener('online',on); window.addEventListener('offline',off);
    return ()=>{ window.removeEventListener('online',on); window.removeEventListener('offline',off); };
  },[]);

  const toast = useCallback((message,type='info')=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p,{id,message,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);
  const removeToast = useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
  const switchTab = (id) => { setTab(id); setMobileOpen(false); };

  if (authLoading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:BABYEYI_PAGE_BG, fontFamily:font }}>
        <Loader2 style={{ width:40, height:40, color:C.gold, animation:"spin 0.8s linear infinite" }}/>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:BABYEYI_PAGE_BG, fontFamily:font, color:C.dark }}>
      <style>{globalStyles}</style>

      {profileOpen && (
        <NesaProfileModal open={profileOpen} user={user} onClose={() => setProfileOpen(false)} onUpdated={refresh} toast={toast}/>
      )}
      <Sidebar tab={tab} switchTab={switchTab} notifCount={notifCount} online={online} user={user} onOpenProfile={() => setProfileOpen(true)}/>

      {mobileOpen && (
        <div className="lg:hidden" style={{ position:"fixed", inset:0, background:"rgba(26,18,0,0.4)", backdropFilter:"blur(4px)", zIndex:50, display:"flex" }} onClick={()=>setMobileOpen(false)}>
          <div style={{ width:280, height:"100%", background:C.goldBg, boxShadow:"4px 0 24px rgba(26,18,0,0.2)", display:"flex", flexDirection:"column", fontFamily:font }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.goldBorder}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Shield style={{ width:16, height:16, color:C.gold }}/>
                </div>
                <span style={{ fontWeight:900, color:C.dark, fontSize:14 }}>NESA Portal</span>
              </div>
              <button onClick={()=>setMobileOpen(false)} style={{ padding:6, borderRadius:10, background:C.goldBgMid, border:"none", cursor:"pointer" }}><X style={{ width:18, height:18, color:C.goldDark }}/></button>
            </div>
            <nav style={{ padding:10, flex:1, overflowY:"auto" }}>
              {NAV.map(item=>(
                <button key={item.id} onClick={()=>switchTab(item.id)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:12, marginBottom:2, border:"none", cursor:"pointer", fontFamily:font, fontWeight:700, fontSize:13, background:tab===item.id?`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`:"transparent", color:tab===item.id?C.gold:C.goldDeep }}>
                  <item.icon style={{ width:16, height:16 }}/>{item.label}
                </button>
              ))}
            </nav>
            <div style={{ padding:10, borderTop:`1px solid ${C.goldBorder}` }}><LogoutButton/></div>
          </div>
        </div>
      )}

      <div className="lg:ml-60" style={{ flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" }}>
        <Header tab={tab} online={online} notifCount={notifCount} switchTab={switchTab} setMobileOpen={setMobileOpen} user={user}/>
        <main style={{ flex:1, padding:"20px 16px" }}>
          <div className="lg:px-2">
            {tab==='dashboard'     && <NESADashboardView   toast={toast} setTab={switchTab}/>}
            {tab==='fees'          && <FeeLimitsView       toast={toast}/>}
            {tab==='monitoring'    && <MonitoringView      toast={toast}/>}
            {tab==='approvals'     && <ApprovalsView       toast={toast}/>}
            {tab==='schools'       && <SchoolsView         toast={toast}/>}
            {tab==='analytics'     && <AnalyticsView       toast={toast}/>}
            {tab==='notifications' && <NotificationsView   toast={toast} setNotifCount={setNotifCount}/>}
          </div>
        </main>
      </div>
      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ════════════════════════════════════════════════════════════════
function NESADashboardView({ toast, setTab }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    const load = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          apiFetch(`${NESA_API}/stats`),
          apiFetch(`${NESA_API}/requests?limit=5&status=pending`),
        ]);
        const s = statsRes?.data  || {};
        const r = recentRes?.data || [];
        setStats({ ...s, recent_requests: r });
      } catch(e) {
        toast('Failed to load dashboard stats','error');
      } finally {
        setLoading(false);
      }
    };
    load();
  },[]);

  if (loading) return <Spinner msg="Loading dashboard…"/>;
  if (!stats)  return <Empty msg="Could not load dashboard"/>;

  const donut = [
    { label:'Compliant', value: Number(stats.active_count||0) - Number(stats.exceeds_count||0), color:C.emerald },
    { label:'Pending',   value: Number(stats.pending||0) + Number(stats.recommended||0),        color:C.amber   },
    { label:'Exceeded',  value: Number(stats.exceeds_count||0),                                  color:C.red     },
  ].filter(d=>d.value>0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, fontFamily:font }} className="anim">
      {/* Hero */}
      <div style={{ background:`linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`, borderRadius:24, padding:"20px 24px", boxShadow:"0 8px 32px rgba(26,18,0,0.2)", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.07, backgroundImage:"radial-gradient(circle at 80% 20%,white 0%,transparent 50%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-32, right:-32, width:160, height:160, borderRadius:"50%", background:"rgba(254,191,16,0.07)", border:`1px solid ${C.gold}22`, pointerEvents:"none" }}/>
        <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:C.emerald, animation:"pulse 2s infinite", flexShrink:0 }}/>
              <span style={{ color:C.goldLight, fontSize:11 }}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</span>
            </div>
            <h2 style={{ fontSize:22, fontWeight:900, color:"white", margin:"0 0 4px" }}>NESA Authority Portal</h2>
            <p style={{ color:C.goldLight, fontSize:13, margin:"0 0 14px" }}>National Fee Management System</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {[
                { icon:Building2,     label:`${fmt(stats.schools_count)} Schools`,    bg:"rgba(255,255,255,0.12)", border:"rgba(255,255,255,0.18)" },
                { icon:Clock,         label:`${fmt(stats.needs_action)} Need Action`, bg:"rgba(245,158,11,0.2)",  border:"rgba(245,158,11,0.3)", pulse:true },
                ...(Number(stats.exceeds_count||0)>0 ? [{ icon:AlertCircle, label:`${fmt(stats.exceeds_count)} Violations`, bg:"rgba(239,68,68,0.2)", border:"rgba(239,68,68,0.3)", pulse:true }] : []),
              ].map(({icon:Icon,label,bg,border,pulse})=>(
                <span key={label} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:12, background:bg, border:`1px solid ${border}`, fontSize:11, fontWeight:700, color:"white", animation:pulse?"pulse 2s infinite":"none" }}>
                  <Icon style={{ width:13, height:13 }}/> {label}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden sm:flex" style={{ width:52, height:52, background:"rgba(254,191,16,0.15)", border:`1px solid ${C.gold}44`, borderRadius:16, alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Flag style={{ width:26, height:26, color:C.gold, opacity:0.8 }}/>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
        {[
          {icon:FileText,    label:'Total Requests', value:fmt(stats.total_requests), color:'gold',    onClick:()=>setTab('approvals')},
          {icon:Clock,       label:'Needs Action',   value:fmt(stats.needs_action),   color:'amber',   alert:true, onClick:()=>setTab('approvals')},
          {icon:CheckCircle, label:'Approved',       value:fmt(stats.approved),       color:'emerald', onClick:()=>setTab('approvals')},
          {icon:XCircle,     label:'Rejected',       value:fmt(Number(stats.rejected||0)+Number(stats.nesa_rejected||0)), color:'red', onClick:()=>setTab('approvals')},
          {icon:Activity,    label:'Recommended',    value:fmt(stats.recommended),    color:'blue',    onClick:()=>setTab('approvals')},
          {icon:AlertTriangle,label:'Violations',    value:fmt(stats.exceeds_count),  color:'red',     alert:true, onClick:()=>setTab('monitoring')},
        ].map(c=><StatCard key={c.label} {...c} loading={loading}/>)}
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }} className="lg:grid-cols-3">
        <style>{`.lg\\:grid-cols-3 { @media(min-width:1024px){ grid-template-columns: 1fr 1fr 1fr; } }`}</style>
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}
          className="lg:col-span-2">
          <h3 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 4px" }}>
            <TrendingUp style={{ width:16, height:16, color:C.goldDark }}/> Monthly Submission Trend
          </h3>
          <p style={{ fontSize:10, color:C.goldDark, margin:"0 0 12px" }}>Last 12 months · All districts</p>
          {stats.monthly_trend?.length
            ? <LineAreaChart data={stats.monthly_trend} labelKey="label" valueKey="total" color={C.dark} height={140}/>
            : <Empty msg="No trend data yet"/>}
        </div>
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, display:"flex", flexDirection:"column", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
          <h3 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
            <Activity style={{ width:16, height:16, color:C.goldDark }}/> Request Status
          </h3>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, gap:20 }}>
            <DonutChart data={donut} size={130}/>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {donut.map(d=>(
                <div key={d.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:d.color }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:900, color:C.dark, margin:0 }}>{fmt(d.value)}</p>
                    <p style={{ fontSize:9, color:C.goldDark, margin:0 }}>{d.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Violations + Recent */}
      <div style={{ display:"grid", gap:16, gridTemplateColumns:"1fr" }} className="lg:grid-2">
        <style>{`.lg\\:grid-2 { @media(min-width:1024px){ grid-template-columns:1fr 1fr; } }`}</style>
        {stats.district_violations?.length>0 && (
          <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
            <h3 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
              <AlertCircle style={{ width:16, height:16, color:C.red }}/> Violations by District
            </h3>
            <HBarChart data={stats.district_violations}/>
          </div>
        )}
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.goldBorder}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:C.goldBg }}>
            <h3 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:0 }}>
              <Clock style={{ width:14, height:14, color:C.amber }}/> Pending Requests
            </h3>
            <button onClick={()=>setTab('approvals')} style={{ fontSize:11, color:C.goldDark, fontWeight:700, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:font }}>
              View all <ChevronRight style={{ width:13, height:13 }}/>
            </button>
          </div>
          {!stats.recent_requests?.length
            ? <div style={{ padding:"40px 20px", textAlign:"center", color:C.goldDark, fontSize:13 }}>No pending requests</div>
            : (
              <div>
                {(stats.recent_requests||[]).slice(0,5).map((r,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", borderBottom:`1px solid ${C.goldBorder}`, background:i%2?C.goldBg:"white" }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:C.goldBgMid, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Building2 style={{ width:16, height:16, color:C.goldDark }}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, color:C.dark, fontSize:12, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.school_name}</p>
                      <p style={{ fontSize:10, color:C.goldDark, margin:0 }}>{r.district} · {fmtD(r.submitted_at)}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:11, fontWeight:900, color:C.dark, margin:"0 0 2px" }}>RWF {fmt(r.requested_amount)}</p>
                      <Badge status={r.nesa_status}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          <div style={{ padding:12, borderTop:`1px solid ${C.goldBorder}` }}>
            <button onClick={()=>setTab('approvals')} style={{ width:"100%", padding:"10px 0", background:`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color:C.gold, border:"none", borderRadius:14, fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:font, boxShadow:"0 4px 12px rgba(26,18,0,0.2)" }}>
              Review All Requests →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MONITORING VIEW
// ════════════════════════════════════════════════════════════════
function MonitoringView({ toast }) {
  const [violations,    setViolations]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [districtFilter,setDistrictFilter]= useState('');
  const [reqFilter,     setReqFilter]     = useState('all');
  const [page,          setPage]          = useState(1);
  const [pagination,    setPagination]    = useState({ total:0, pages:1 });
  const [districts,     setDistricts]     = useState([]);

  const load = useCallback(async (pg=1, q='', d='') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:pg, limit:12 });
      if (q) params.append('search', q);
      if (d) params.append('district', d);
      const res = await apiFetch(`${NESA_API}/violations?${params}`);
      setViolations(res.data || []);
      setPagination(res.pagination || { total:0, pages:1 });
      setDistricts(prev => {
        const all = [...new Set([...prev, ...(res.data||[]).map(v=>v.district).filter(Boolean)])];
        return all.sort();
      });
    } catch(e) {
      toast('Failed to load violations','error');
    } finally {
      setLoading(false);
    }
  },[toast]);

  useEffect(()=>{ load(1,'',''); },[]);

  const filtered = violations.filter(v => {
    if (reqFilter === 'no_request') return !v.request_id;
    if (reqFilter === 'pending')    return v.request_status === 'pending' || v.request_status === 'recommended';
    if (reqFilter === 'approved')   return v.request_status === 'approved';
    if (reqFilter === 'rejected')   return v.request_status === 'rejected' || v.request_status === 'nesa_rejected';
    return true;
  });

  const counts = {
    all:        violations.length,
    no_request: violations.filter(v=>!v.request_id).length,
    pending:    violations.filter(v=>v.request_status==='pending'||v.request_status==='recommended').length,
    approved:   violations.filter(v=>v.request_status==='approved').length,
    rejected:   violations.filter(v=>v.request_status==='rejected'||v.request_status==='nesa_rejected').length,
  };

  const reqStatusBadge = (v) => {
    if (!v.request_id)                return { label:'No Request',      bg:C.red50,     text:C.red800,      border:C.redBorder   };
    if (v.request_status==='approved')return { label:'Approved',        bg:C.emeraldBg, text:C.emeraldDark, border:C.emeraldBord };
    if (v.request_status==='rejected'||v.request_status==='nesa_rejected') return { label:'Rejected', bg:C.red50, text:C.red800, border:C.redBorder };
    if (v.request_status==='recommended') return { label:'Recommended', bg:C.blueBg,    text:C.blue700,     border:C.blueBord    };
    return { label:'Pending Request', bg:C.amberBg, text:"#92400e", border:C.amberBord };
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, fontFamily:font }} className="anim">
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
        <StatCard icon={AlertTriangle} label="Total Violations"  value={fmt(pagination.total)} color="red"     alert loading={loading} onClick={()=>setReqFilter('all')}/>
        <StatCard icon={FileText}      label="No Request Filed"  value={counts.no_request}    color="red"     loading={loading} onClick={()=>setReqFilter('no_request')}/>
        <StatCard icon={Clock}         label="Pending Requests"  value={counts.pending}       color="amber"   loading={loading} onClick={()=>setReqFilter('pending')}/>
        <StatCard icon={CheckCircle}   label="Request Approved"  value={counts.approved}      color="emerald" loading={loading} onClick={()=>setReqFilter('approved')}/>
      </div>

      {/* Filters */}
      <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:16, boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:12 }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, color:C.goldDark }}/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); load(1,e.target.value,districtFilter); }}
              placeholder="Search school, district, doc ID…" style={{ ...inp, paddingLeft:38 }}/>
          </div>
          <select value={districtFilter} onChange={e=>{ setDistrictFilter(e.target.value); setPage(1); load(1,search,e.target.value); }}
            style={{ ...inp, width:180 }}>
            <option value="">All Districts</option>
            {districts.map(d=><option key={d}>{d}</option>)}
          </select>
          <button onClick={()=>{ setSearch(''); setDistrictFilter(''); setPage(1); load(1,'',''); }}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:12, fontSize:13, fontWeight:700, color:C.goldDark, cursor:"pointer", fontFamily:font, whiteSpace:"nowrap" }}>
            <RefreshCw style={{ width:14, height:14 }}/> Refresh
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4, background:C.goldBgMid, borderRadius:12, padding:4, width:"fit-content", overflowX:"auto" }}>
          {[
            { id:'all',        label:`All (${counts.all})`              },
            { id:'no_request', label:`No Request (${counts.no_request})` },
            { id:'pending',    label:`Pending (${counts.pending})`      },
            { id:'approved',   label:`Approved (${counts.approved})`    },
            { id:'rejected',   label:`Rejected (${counts.rejected})`    },
          ].map(f=>(
            <button key={f.id} onClick={()=>setReqFilter(f.id)}
              style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:700, whiteSpace:"nowrap", border:"none", cursor:"pointer", fontFamily:font, transition:"all 150ms", background:reqFilter===f.id?C.red:"transparent", color:reqFilter===f.id?"white":C.goldDeep, boxShadow:reqFilter===f.id?"0 2px 8px rgba(239,68,68,0.3)":"none" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner msg="Loading violations…"/> : filtered.length===0 ? (
        <Empty msg="No violations found" icon={AlertTriangle}/>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden" style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map(v=>{
              const diff = Number(v.total_fee||0) - Number(v.nesa_limit||0);
              const pct  = v.nesa_limit ? ((diff/v.nesa_limit)*100).toFixed(1) : 0;
              const st   = reqStatusBadge(v);
              return (
                <div key={v.id} style={{ background:"white", border:`2px solid ${C.redBorder}`, borderRadius:20, padding:16, boxShadow:"0 2px 8px rgba(254,191,16,0.06)", fontFamily:font }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:900, color:C.dark, fontSize:14, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.school_name}</p>
                      <p style={{ fontSize:10, color:C.goldDark, margin:0 }}>{v.district} · {v.category} · {v.level}</p>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:8, border:`1px solid ${st.border}`, background:st.bg, color:st.text, marginLeft:8, flexShrink:0 }}>{st.label}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8 }}>
                    {[{l:"Set Fee",bg:C.red50,tc:C.red800,v:`RWF ${fmt(v.total_fee)}`},{l:"NESA Limit",bg:C.emeraldBg,tc:C.emeraldDark,v:`RWF ${fmt(v.nesa_limit)}`},{l:"Over By",bg:C.red50,tc:C.red800,v:`+${pct}%`}].map(x=>(
                      <div key={x.l} style={{ background:x.bg, borderRadius:12, padding:8, textAlign:"center" }}>
                        <p style={{ fontSize:9, color:x.tc, fontWeight:900, margin:"0 0 2px", textTransform:"uppercase" }}>{x.l}</p>
                        <p style={{ fontSize:11, fontWeight:900, color:x.tc, margin:0 }}>{x.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block" style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <THead cols={['School','District','Category','Level','Set Fee','NESA Limit','Over By','% Over','Request Status','DEO Notes']}/>
                <tbody>
                  {filtered.map((v,i)=>{
                    const diff = Number(v.total_fee||0)-Number(v.nesa_limit||0);
                    const pct  = v.nesa_limit ? ((diff/Number(v.nesa_limit))*100).toFixed(1) : '—';
                    const st   = reqStatusBadge(v);
                    return (
                      <tr key={v.id} style={{ borderBottom:`1px solid ${C.goldBorder}`, background:i%2?C.goldBg:"white" }}>
                        <td style={{ padding:"12px 16px" }}>
                          <p style={{ fontWeight:700, color:C.dark, fontSize:13, margin:0 }}>{v.school_name}</p>
                          <p style={{ fontSize:10, color:C.goldDark, margin:0 }}>{v.academic_year} · {v.term}</p>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:12, fontWeight:700, color:C.darkMid }}>{v.district}</td>
                        <td style={{ padding:"12px 16px" }}><Badge status={(v.category||'').toLowerCase()}/></td>
                        <td style={{ padding:"12px 16px" }}><Badge status={(v.level||'').toLowerCase()}/></td>
                        <td style={{ padding:"12px 16px", fontWeight:900, color:C.red800, fontSize:13 }}>RWF {fmt(v.total_fee)}</td>
                        <td style={{ padding:"12px 16px", fontWeight:700, color:C.emeraldDark, fontSize:13 }}>RWF {fmt(v.nesa_limit)}</td>
                        <td style={{ padding:"12px 16px", fontWeight:900, color:C.red800, fontSize:13 }}>+RWF {fmt(diff)}</td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ background:C.red50, color:C.red800, border:`1px solid ${C.redBorder}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>+{pct}%</span>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:8, border:`1px solid ${st.border}`, background:st.bg, color:st.text }}>{st.label}</span>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:11, color:C.goldDark, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.deo_notes||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages>1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, paddingTop:4 }}>
              <button onClick={()=>{ const p=Math.max(1,page-1); setPage(p); load(p,search,districtFilter); }}
                disabled={page===1} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===1?0.4:1 }}>
                <ChevronLeft style={{ width:16, height:16, color:C.goldDark }}/>
              </button>
              <span style={{ fontSize:13, fontWeight:700, color:C.dark, padding:"0 8px", fontFamily:font }}>Page {page} of {pagination.pages}</span>
              <button onClick={()=>{ const p=Math.min(pagination.pages,page+1); setPage(p); load(p,search,districtFilter); }}
                disabled={page===pagination.pages} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===pagination.pages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===pagination.pages?0.4:1 }}>
                <ChevronRight style={{ width:16, height:16, color:C.goldDark }}/>
              </button>
              <span style={{ fontSize:11, color:C.goldDark, marginLeft:8, fontFamily:font }}>{fmt(pagination.total)} total violations</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// APPROVALS VIEW
// ════════════════════════════════════════════════════════════════
function ApprovalsView({ toast }) {
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [search,       setSearch]       = useState('');
  const [processing,   setProcessing]   = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [rejectNote,   setRejectNote]   = useState('');
  const [detailItem,   setDetailItem]   = useState(null);
  const [docViewer,    setDocViewer]    = useState(null);
  const [page,         setPage]         = useState(1);
  const [pagination,   setPagination]   = useState({ total:0, pages:1 });

  const loadRequests = useCallback(async (pg=1, status=filterStatus, q=search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:pg, limit:12 });
      if (status && status!=='all') params.append('status', status);
      if (q) params.append('search', q);
      const res = await apiFetch(`${NESA_API}/requests?${params}`);
      setRequests(res.data || []);
      setPagination(res.pagination || { total:0, pages:1 });
    } catch(e) {
      toast('Failed to load approvals list','error');
    } finally {
      setLoading(false);
    }
  },[filterStatus,search,toast]);

  useEffect(()=>{ loadRequests(1, filterStatus, ''); },[filterStatus]);

  const executeAction = async (id, action, notes) => {
    setProcessing(id);
    setConfirmModal(null);
    try {
      const endpoint = action==='approved'
        ? `${NESA_API}/requests/${id}/approve`
        : `${NESA_API}/requests/${id}/reject`;
      const res = await apiFetch(endpoint, { method:'PATCH', body:JSON.stringify({ notes }) });
      if (!res?.success) throw new Error(res?.message || 'Action failed');
      setRequests(prev => prev.map(r =>
        r.id===id ? { ...r, nesa_status: action==='approved' ? 'approved' : 'nesa_rejected', nesa_notes: notes } : r
      ));
      toast(action==='approved' ? '✅ Request approved by NESA.' : '❌ Request rejected by NESA.', action==='approved'?'success':'error');
      setDetailItem(null);
      setRejectNote('');
    } catch(e) {
      toast(`Failed: ${e.message}`, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const isPending = (r) => r.nesa_status==='pending' || r.nesa_status==='recommended';

  const getDocuments = (r) => {
    const docs = [];
    if (r.parent_rep_doc_path) docs.push({ url:resolveDocUrl(r.parent_rep_doc_path), title:r.parent_rep_doc_name||'Parent Representative Document', icon:FileCheck });
    if (r.budget_doc_path)     docs.push({ url:resolveDocUrl(r.budget_doc_path),     title:r.budget_doc_name||'School Budget Document',    icon:FileText  });
    if (r.approval_letter_path)docs.push({ url:resolveDocUrl(r.approval_letter_path),title:r.approval_letter_name||'DEO Approval Letter',  icon:FileBadge });
    if (r.deo_signature_path)  docs.push({ url:resolveDocUrl(r.deo_signature_path),  title:r.deo_signature_name||'DEO Signature',          icon:PenLine   });
    if (r.deo_stamp_path)      docs.push({ url:resolveDocUrl(r.deo_stamp_path),       title:r.deo_stamp_name||'DEO Stamp',                  icon:Stamp     });
    return docs;
  };

  const counts = {
    pending:     requests.filter(r=>isPending(r)).length,
    recommended: requests.filter(r=>r.nesa_status==='recommended').length,
    approved:    requests.filter(r=>r.nesa_status==='approved').length,
    rejected:    requests.filter(r=>r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected').length,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, fontFamily:font }} className="anim">
      {docViewer && <DocViewerModal url={docViewer.url} title={docViewer.title} onClose={()=>setDocViewer(null)}/>}

      {/* Confirm modal */}
      {confirmModal && (
        <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(26,18,0,0.4)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"white", borderRadius:24, boxShadow:"0 20px 60px rgba(26,18,0,0.2)", border:`1px solid ${C.goldBorder}`, width:"100%", maxWidth:420, padding:24, fontFamily:font }}>
            <div style={{ width:52, height:52, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", background:confirmModal.action==='approved'?C.emeraldBg:C.red50 }}>
              {confirmModal.action==='approved'
                ? <ThumbsUp style={{ width:24, height:24, color:C.emerald }}/>
                : <ThumbsDown style={{ width:24, height:24, color:C.red }}/>}
            </div>
            <h3 style={{ fontSize:17, fontWeight:900, color:C.dark, textAlign:"center", margin:"0 0 4px" }}>
              {confirmModal.action==='approved' ? 'Approve Request?' : 'Reject Request?'}
            </h3>
            <p style={{ fontSize:13, color:C.goldDark, textAlign:"center", margin:"0 0 20px" }}>
              <strong style={{ color:C.dark }}>{confirmModal.school}</strong>
            </p>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                {confirmModal.action==='approved' ? 'Approval Notes (optional)' : 'Rejection Reason *'}
              </label>
              <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} rows={3}
                style={{ ...inp, resize:"none", lineHeight:1.6 }}
                placeholder={confirmModal.action==='approved' ? 'Add notes for this approval…' : 'State reason for rejection (required)…'}/>
              {confirmModal.action!=='approved' && !rejectNote.trim() && (
                <p style={{ fontSize:10, color:C.red, fontWeight:700, marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                  <AlertCircle style={{ width:12, height:12 }}/> Rejection reason is required
                </p>
              )}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{ setConfirmModal(null); setRejectNote(''); }}
                style={{ flex:1, padding:"12px 0", border:`2px solid ${C.goldBorder}`, borderRadius:14, fontSize:13, fontWeight:700, color:C.darkMid, background:"white", cursor:"pointer", fontFamily:font }}>
                Cancel
              </button>
              <button
                onClick={()=>executeAction(confirmModal.id, confirmModal.action, rejectNote||(confirmModal.action==='approved'?'Approved by NESA':''))}
                disabled={processing===confirmModal.id||(confirmModal.action!=='approved'&&!rejectNote.trim())}
                style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", fontSize:13, fontWeight:700, color:"white", background:confirmModal.action==='approved'?C.emerald:C.red, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:(processing===confirmModal.id||(confirmModal.action!=='approved'&&!rejectNote.trim()))?0.5:1, fontFamily:font, boxShadow:`0 4px 16px ${confirmModal.action==='approved'?'rgba(16,185,129,0.35)':'rgba(239,68,68,0.35)'}` }}>
                {processing===confirmModal.id
                  ? <Loader2 style={{ width:16, height:16, animation:"spin 0.8s linear infinite" }}/>
                  : confirmModal.action==='approved'
                    ? <><ThumbsUp style={{ width:14, height:14 }}/> Confirm Approve</>
                    : <><ThumbsDown style={{ width:14, height:14 }}/> Confirm Reject</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
        <StatCard icon={Clock}       label="Pending / Recommended" value={fmt(pagination.total)} color="amber"   alert loading={loading} onClick={()=>setFilterStatus('pending')}/>
        <StatCard icon={CheckCircle} label="Approved"              value={counts.approved}       color="emerald" onClick={()=>setFilterStatus('approved')}/>
        <StatCard icon={XCircle}     label="Rejected"              value={counts.rejected}       color="red"     onClick={()=>setFilterStatus('rejected')}/>
        <StatCard icon={Activity}    label="Recommended"           value={counts.recommended}    color="blue"    onClick={()=>setFilterStatus('recommended')}/>
      </div>

      {/* Filter bar */}
      <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:16, display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, color:C.goldDark }}/>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); loadRequests(1,filterStatus,e.target.value); }}
            placeholder="Search school, district…" style={{ ...inp, paddingLeft:38 }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4, background:C.goldBgMid, borderRadius:12, padding:4, overflowX:"auto", flexShrink:0 }}>
          {['pending','recommended','approved','rejected','all'].map(f=>(
            <button key={f} onClick={()=>{ setFilterStatus(f); setPage(1); }}
              style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:700, textTransform:"capitalize", whiteSpace:"nowrap", border:"none", cursor:"pointer", fontFamily:font, transition:"all 150ms", background:filterStatus===f?`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`:"transparent", color:filterStatus===f?C.gold:C.goldDeep, boxShadow:filterStatus===f?"0 4px 12px rgba(26,18,0,0.2)":"none" }}>
              {f==='pending'?'Needs Action':f}
            </button>
          ))}
        </div>
        <button onClick={()=>loadRequests(page,filterStatus,search)}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:12, fontSize:12, fontWeight:700, color:C.goldDark, cursor:"pointer", fontFamily:font, whiteSpace:"nowrap" }}>
          <RefreshCw style={{ width:14, height:14 }}/> Refresh
        </button>
      </div>

      {/* Cards */}
      {loading ? <Spinner msg="Loading requests…"/> : requests.length===0 ? (
        <Empty msg={`No ${filterStatus} requests`} icon={ShieldCheck}/>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {requests.map(r=>{
            const borderColor = isPending(r) ? C.amberBord : r.nesa_status==='approved' ? C.emeraldBord : (r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected') ? C.redBorder : r.nesa_status==='recommended' ? C.blueBord : C.goldBorder;
            return (
              <div key={r.id} style={{ background:"white", border:`2px solid ${borderColor}`, borderRadius:22, boxShadow:"0 2px 12px rgba(26,18,0,0.06)", fontFamily:font, transition:"all 150ms" }}>
                <div style={{ padding:"14px 20px 16px 20px" }}>
                  {/* Header */}
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:14 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12, flex:1, minWidth:0 }}>
                      <div style={{ width:40, height:40, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:r.nesa_status==='recommended'?C.blueBg:isPending(r)?C.amberBg:C.emeraldBg, border:`2px solid ${r.nesa_status==='recommended'?C.blueBord:isPending(r)?C.amberBord:C.emeraldBord}` }}>
                        <Building2 style={{ width:20, height:20, color:r.nesa_status==='recommended'?C.blue700:isPending(r)?"#92400e":C.emeraldDark }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, marginBottom:4 }}>
                          <h4 style={{ fontWeight:900, color:C.dark, fontSize:15, margin:0 }}>{r.school_name}</h4>
                          <Badge status={r.nesa_status}/>
                          {r.nesa_status==='recommended' && (
                            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:900, background:C.blueBg, color:C.blue700, border:`1px solid ${C.blueBord}`, padding:"2px 8px", borderRadius:20 }}>
                              <ArrowUpRight style={{ width:11, height:11 }}/> DEO Recommended
                            </span>
                          )}
                          {r.nesa_status==='pending' && (
                            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:900, background:C.amberBg, color:"#92400e", border:`1px solid ${C.amberBord}`, padding:"2px 8px", borderRadius:20, animation:"pulse 2s infinite" }}>
                              <Clock style={{ width:11, height:11 }}/> Awaiting NESA
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", fontSize:11, color:C.goldDark }}>
                          {[
                            {i:MapPin,v:r.district},
                            {i:Building2,v:r.school_category},
                            {i:School,v:r.education_level},
                            {i:Layers,v:(r.classes && r.classes.length > 0 ? r.classes.join(", ") : r.class_name) || "—"},
                            {i:Calendar,v:fmtD(r.submitted_at)},
                            {i:FileText,v:`${r.academic_year} · ${r.term}`},
                          ].filter(x=>x.v).map(({i:Icon,v},idx)=>(
                            <span key={idx} style={{ display:"flex", alignItems:"center", gap:4 }}><Icon style={{ width:11, height:11 }}/>{v}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:22, fontWeight:900, color:C.dark, margin:0 }}>RWF {fmt(r.requested_amount)}</p>
                      <p style={{ fontSize:11, color:C.goldDark, margin:"2px 0 0" }}>Requested</p>
                      {r.current_limit>0 && (
                        <p style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4, fontSize:13, fontWeight:900, color:C.red, margin:"4px 0 0" }}>
                          <ArrowUpRight style={{ width:13, height:13 }}/> +{Math.round(((r.requested_amount-r.current_limit)/r.current_limit)*100)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Fee breakdown */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                    {[
                      {l:"NESA Limit",v:`RWF ${fmt(r.current_limit)}`,bg:C.emeraldBg,border:C.emeraldBord,tc:C.emeraldDark},
                      {l:"Requested",v:`RWF ${fmt(r.requested_amount)}`,bg:C.amberBg,border:C.amberBord,tc:"#92400e"},
                      {l:"Over By",v:`RWF ${fmt(Math.max(0,r.requested_amount-r.current_limit))}`,bg:C.red50,border:C.redBorder,tc:C.red800},
                    ].map(x=>(
                      <div key={x.l} style={{ background:x.bg, border:`1px solid ${x.border}`, borderRadius:14, padding:"10px 12px", textAlign:"center" }}>
                        <p style={{ fontSize:9, color:x.tc, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 4px" }}>{x.l}</p>
                        <p style={{ fontSize:14, fontWeight:900, color:x.tc, margin:0 }}>{x.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reason */}
                  {r.reason && (
                    <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:12, padding:12, marginBottom:12 }}>
                      <p style={{ fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px", display:"flex", alignItems:"center", gap:4 }}><MessageSquare style={{ width:11, height:11 }}/> School Justification</p>
                      <p style={{ fontSize:12, color:C.darkMid, lineHeight:1.6, margin:0 }}>{r.reason}</p>
                    </div>
                  )}

                  {/* DEO Recommendation (for recommended requests: comment, signature, stamp) */}
                  {(r.nesa_status==='recommended' || r.deo_notes || r.deo_signature_path || r.deo_stamp_path) && (
                    <div style={{ background:"linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", border:"2px solid #3b82f6", borderRadius:16, padding:14, marginBottom:12 }}>
                      <p style={{ fontSize:10, fontWeight:900, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 8px", display:"flex", alignItems:"center", gap:4 }}>
                        <ShieldCheck style={{ width:12, height:12 }}/> DEO Recommendation (from District)
                      </p>
                      {r.deo_notes && (
                        <div style={{ marginBottom:10 }}>
                          <p style={{ fontSize:10, fontWeight:700, color:"#1d4ed8", margin:"0 0 4px" }}>Comment / Reason</p>
                          <p style={{ fontSize:12, color:C.darkMid, margin:0, lineHeight:1.6, background:"rgba(255,255,255,0.7)", borderRadius:10, padding:10, border:"1px solid #93c5fd" }}>{r.deo_notes}</p>
                          {r.deo_reviewed_at && <p style={{ fontSize:9, color:C.goldDark, marginTop:4 }}>Reviewed: {fmtD(r.deo_reviewed_at)}</p>}
                        </div>
                      )}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {r.deo_signature_path && (
                          <button onClick={()=>setDocViewer({url:resolveDocUrl(r.deo_signature_path),title:r.deo_signature_name||'DEO Signature'})}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"white", border:"1px solid #93c5fd", borderRadius:12, cursor:"pointer", fontSize:11, fontWeight:700, color:"#1d4ed8", fontFamily:font }}>
                            <PenLine style={{ width:14, height:14 }}/> DEO Signature
                          </button>
                        )}
                        {r.deo_stamp_path && (
                          <button onClick={()=>setDocViewer({url:resolveDocUrl(r.deo_stamp_path),title:r.deo_stamp_name||'DEO Stamp'})}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"white", border:"1px solid #93c5fd", borderRadius:12, cursor:"pointer", fontSize:11, fontWeight:700, color:"#1d4ed8", fontFamily:font }}>
                            <Stamp style={{ width:14, height:14 }}/> DEO Stamp
                          </button>
                        )}
                        {!r.deo_notes && !r.deo_signature_path && !r.deo_stamp_path && <span style={{ fontSize:11, color:C.goldDark }}>No DEO details attached.</span>}
                      </div>
                    </div>
                  )}

                  {/* School-submitted documents — review before approve/reject */}
                  <div style={{ marginBottom:12, background:"linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)", border:"2px solid #c4b5fd", borderRadius:16, padding:12 }}>
                    <p style={{ fontSize:10, fontWeight:900, color:"#6d28d9", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px", display:"flex", alignItems:"center", gap:4 }}>
                      <Paperclip style={{ width:11, height:11 }}/> Documents submitted by school (review before decision)
                    </p>
                    <p style={{ fontSize:11, color:C.darkMid, margin:"0 0 10px", lineHeight:1.5 }}>Parent Representative Document and School Budget sent by the school manager when requesting the fee increase.</p>
                    {getDocuments(r).length>0 ? (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8 }}>
                        {getDocuments(r).map((doc,di)=>(
                          <button key={di} onClick={()=>setDocViewer({url:doc.url,title:doc.title})}
                            style={{ display:"flex", alignItems:"center", gap:10, padding:10, background:C.emeraldBg, border:`1px solid ${C.emeraldBord}`, borderRadius:14, cursor:"pointer", textAlign:"left", fontFamily:font, transition:"all 150ms" }}>
                            <div style={{ width:32, height:32, borderRadius:10, background:C.emerald, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <doc.icon style={{ width:14, height:14, color:"white" }}/>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:11, fontWeight:700, color:C.emeraldDark, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.title}</p>
                              <p style={{ fontSize:9, color:C.emeraldDark, margin:0, display:"flex", alignItems:"center", gap:3 }}><Eye style={{ width:10, height:10 }}/> Click to view</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize:11, color:C.goldDark, margin:0 }}>No documents uploaded by school for this request.</p>
                    )}
                  </div>

                  {/* NESA decision notes */}
                  {r.nesa_notes && !isPending(r) && (
                    <div style={{ border:`1px solid ${r.nesa_status==='approved'?C.emeraldBord:C.redBorder}`, borderRadius:12, padding:12, marginBottom:12, background:r.nesa_status==='approved'?C.emeraldBg:C.red50 }}>
                      <p style={{ fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px", color:r.nesa_status==='approved'?C.emeraldDark:C.red800 }}>NESA Decision Notes</p>
                      <p style={{ fontSize:12, margin:0, color:r.nesa_status==='approved'?C.emeraldDark:C.red800 }}>{r.nesa_notes}</p>
                      {r.nesa_reviewed_at && <p style={{ fontSize:9, color:C.goldDark, marginTop:4 }}>{fmtD(r.nesa_reviewed_at)}</p>}
                    </div>
                  )}

                  {/* Actions */}
                  {isPending(r) ? (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>{ setRejectNote(''); setConfirmModal({id:r.id,action:'approved',school:r.school_name}); }} disabled={!!processing}
                        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px 0", background:C.emerald, color:"white", borderRadius:14, fontSize:13, fontWeight:900, border:"none", cursor:processing?"not-allowed":"pointer", opacity:processing?0.6:1, fontFamily:font, boxShadow:"0 4px 12px rgba(16,185,129,0.35)" }}>
                        {processing===r.id?<Loader2 style={{ width:14, height:14, animation:"spin 0.8s linear infinite" }}/>:<><ThumbsUp style={{ width:14, height:14 }}/> Approve</>}
                      </button>
                      <button onClick={()=>{ setRejectNote(''); setConfirmModal({id:r.id,action:'rejected',school:r.school_name}); }} disabled={!!processing}
                        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px 0", background:C.red, color:"white", borderRadius:14, fontSize:13, fontWeight:900, border:"none", cursor:processing?"not-allowed":"pointer", opacity:processing?0.6:1, fontFamily:font, boxShadow:"0 4px 12px rgba(239,68,68,0.35)" }}>
                        {processing===r.id?<Loader2 style={{ width:14, height:14, animation:"spin 0.8s linear infinite" }}/>:<><ThumbsDown style={{ width:14, height:14 }}/> Reject</>}
                      </button>
                      <button onClick={()=>setDetailItem(r)}
                        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px 16px", background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:14, fontSize:13, fontWeight:700, color:C.goldDark, cursor:"pointer", fontFamily:font }}>
                        <Eye style={{ width:14, height:14 }}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:12, border:`1px solid ${r.nesa_status==='approved'?C.emeraldBord:(r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected')?C.redBorder:C.goldBorder}`, background:r.nesa_status==='approved'?C.emeraldBg:(r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected')?C.red50:C.goldBg, fontSize:13, fontWeight:700, color:r.nesa_status==='approved'?C.emeraldDark:(r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected')?C.red800:C.goldDark }}>
                        {r.nesa_status==='approved'?<><CheckCircle style={{ width:14, height:14 }}/> Approved by NESA</>:(r.nesa_status==='rejected'||r.nesa_status==='nesa_rejected')?<><XCircle style={{ width:14, height:14 }}/> Rejected by NESA</>:<><Activity style={{ width:14, height:14 }}/> {r.nesa_status}</>}
                      </div>
                      <button onClick={()=>setDetailItem(r)}
                        style={{ padding:"10px 14px", background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:12, fontSize:12, fontWeight:700, color:C.goldDark, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:font }}>
                        <Eye style={{ width:13, height:13 }}/> Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages>1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, paddingTop:4 }}>
          <button onClick={()=>{ const p=Math.max(1,page-1); setPage(p); loadRequests(p,filterStatus,search); }}
            disabled={page===1} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===1?0.4:1 }}>
            <ChevronLeft style={{ width:16, height:16, color:C.goldDark }}/>
          </button>
          <span style={{ fontSize:13, fontWeight:700, color:C.dark, padding:"0 8px", fontFamily:font }}>Page {page} of {pagination.pages}</span>
          <button onClick={()=>{ const p=Math.min(pagination.pages,page+1); setPage(p); loadRequests(p,filterStatus,search); }}
            disabled={page===pagination.pages} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===pagination.pages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===pagination.pages?0.4:1 }}>
            <ChevronRight style={{ width:16, height:16, color:C.goldDark }}/>
          </button>
          <span style={{ fontSize:11, color:C.goldDark, marginLeft:8, fontFamily:font }}>{fmt(pagination.total)} total</span>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <Modal title={`Request Detail — ${detailItem.school_name}`} onClose={()=>setDetailItem(null)}>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:C.goldBg, border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                <div style={{ width:40, height:40, background:`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Building2 style={{ width:18, height:18, color:C.gold }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <h4 style={{ fontWeight:900, color:C.dark, margin:0 }}>{detailItem.school_name}</h4>
                  <p style={{ fontSize:11, color:C.goldDark, margin:0 }}>{detailItem.district} · {detailItem.school_category} · {detailItem.education_level}</p>
                </div>
                <Badge status={detailItem.nesa_status}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  {l:'Class',v:(detailItem.classes && detailItem.classes.length > 0 ? detailItem.classes.join(", ") : detailItem.class_name) || "—"},{l:'Term',v:detailItem.term},
                  {l:'Academic Year',v:detailItem.academic_year},{l:'Submitted',v:fmtD(detailItem.submitted_at)},
                  {l:'NESA Limit',v:`RWF ${fmt(detailItem.current_limit)}`},{l:'Requested',v:`RWF ${fmt(detailItem.requested_amount)}`},
                  {l:'Over By',v:`+RWF ${fmt(Math.max(0,detailItem.requested_amount-detailItem.current_limit))}`},
                  {l:'% Increase',v:`+${Math.round(((detailItem.requested_amount-detailItem.current_limit)/detailItem.current_limit)*100)}%`},
                ].map(f=>(
                  <div key={f.l} style={{ background:"white", borderRadius:12, padding:10, border:`1px solid ${C.goldBorder}`, textAlign:"center" }}>
                    <p style={{ fontSize:9, color:C.goldDark, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 2px" }}>{f.l}</p>
                    <p style={{ fontWeight:900, fontSize:13, color:C.dark, margin:0 }}>{f.v||'—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {detailItem.reason && (
              <div>
                <p style={{ fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 6px" }}>School Justification</p>
                <p style={{ fontSize:13, color:C.darkMid, background:C.goldBg, borderRadius:12, padding:12, border:`1px solid ${C.goldBorder}`, lineHeight:1.6, margin:0 }}>{detailItem.reason}</p>
              </div>
            )}

            {/* DEO Recommendation: comment, signature, stamp */}
            {(detailItem.nesa_status==='recommended' || detailItem.deo_notes || detailItem.deo_signature_path || detailItem.deo_stamp_path) && (
              <div style={{ background:"linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", border:"2px solid #3b82f6", borderRadius:16, padding:14 }}>
                <p style={{ fontSize:10, fontWeight:900, color:"#1d4ed8", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 8px", display:"flex", alignItems:"center", gap:4 }}>
                  <ShieldCheck style={{ width:12, height:12 }}/> DEO Recommendation (from District)
                </p>
                {detailItem.deo_notes && (
                  <div style={{ marginBottom:10 }}>
                    <p style={{ fontSize:10, fontWeight:700, color:"#1d4ed8", margin:"0 0 4px" }}>Comment / Reason</p>
                    <p style={{ fontSize:13, color:C.darkMid, margin:0, lineHeight:1.6, background:"rgba(255,255,255,0.7)", borderRadius:12, padding:12, border:"1px solid #93c5fd" }}>{detailItem.deo_notes}</p>
                    {detailItem.deo_reviewed_at && <p style={{ fontSize:9, color:C.goldDark, marginTop:4 }}>Reviewed: {fmtD(detailItem.deo_reviewed_at)}</p>}
                  </div>
                )}
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {detailItem.deo_signature_path && (
                    <button onClick={()=>setDocViewer({url:resolveDocUrl(detailItem.deo_signature_path),title:detailItem.deo_signature_name||'DEO Signature'})}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"white", border:"1px solid #93c5fd", borderRadius:12, cursor:"pointer", fontSize:12, fontWeight:700, color:"#1d4ed8", fontFamily:font }}>
                      <PenLine style={{ width:14, height:14 }}/> DEO Signature
                    </button>
                  )}
                  {detailItem.deo_stamp_path && (
                    <button onClick={()=>setDocViewer({url:resolveDocUrl(detailItem.deo_stamp_path),title:detailItem.deo_stamp_name||'DEO Stamp'})}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"white", border:"1px solid #93c5fd", borderRadius:12, cursor:"pointer", fontSize:12, fontWeight:700, color:"#1d4ed8", fontFamily:font }}>
                      <Stamp style={{ width:14, height:14 }}/> DEO Stamp
                    </button>
                  )}
                </div>
              </div>
            )}

            <div style={{ background:"linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)", border:"2px solid #c4b5fd", borderRadius:16, padding:14 }}>
              <p style={{ fontSize:10, fontWeight:900, color:"#6d28d9", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 4px" }}>Documents submitted by school (review before approving/rejecting)</p>
              <p style={{ fontSize:11, color:C.darkMid, margin:"0 0 10px", lineHeight:1.5 }}>Parent Representative Document and School Budget sent by the school manager when requesting the fee increase.</p>
              {getDocuments(detailItem).length>0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {getDocuments(detailItem).map((doc,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:12, background:C.emeraldBg, border:`1px solid ${C.emeraldBord}`, borderRadius:12 }}>
                      <CheckCircle style={{ width:14, height:14, color:C.emerald, flexShrink:0 }}/>
                      <span style={{ fontSize:12, fontWeight:700, color:C.emeraldDark, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.title}</span>
                      <button onClick={()=>setDocViewer({url:doc.url,title:doc.title})}
                        style={{ fontSize:11, color:C.goldDark, fontWeight:700, background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontFamily:font }}>
                        <Eye style={{ width:11, height:11 }}/> View
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:11, color:C.goldDark, margin:0 }}>No documents uploaded by school for this request.</p>
              )}
            </div>

            {isPending(detailItem) && (
              <>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>NESA Notes</label>
                  <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} rows={3}
                    style={{ ...inp, resize:"none" }} placeholder="Add notes for this decision…"/>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>{ setDetailItem(null); setConfirmModal({id:detailItem.id,action:'approved',school:detailItem.school_name}); }} disabled={!!processing}
                    style={{ flex:1, padding:"12px 0", borderRadius:14, background:C.emerald, color:"white", fontWeight:900, fontSize:13, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:font }}>
                    <ThumbsUp style={{ width:14, height:14 }}/> Approve
                  </button>
                  <button onClick={()=>{ setDetailItem(null); setConfirmModal({id:detailItem.id,action:'rejected',school:detailItem.school_name}); }} disabled={!!processing}
                    style={{ flex:1, padding:"12px 0", borderRadius:14, background:C.red, color:"white", fontWeight:900, fontSize:13, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:font }}>
                    <ThumbsDown style={{ width:14, height:14 }}/> Reject
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SCHOOLS VIEW
// ════════════════════════════════════════════════════════════════
const PER_PAGE = 12;

function SchoolsView({ toast }) {
  const [schools, setSchools] = useState([]);
  const [search,  setSearch]  = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [districts, setDistricts] = useState([]);

  const load = useCallback(async (pg=1, q='', d='') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page:pg, limit:PER_PAGE });
      if (q) params.append('search', q);
      if (d) params.append('district', d);
      const res = await apiFetch(`${NESA_API}/violations?${params}`);
      setSchools(res.data || []);
      setPagination(res.pagination || { total:0, pages:1 });
      if (res.data?.length) setDistricts(prev => [...new Set([...prev, ...(res.data||[]).map(x=>x.district).filter(Boolean)])].sort());
    } catch (e) {
      toast('Failed to load schools','error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(()=>{ load(1,'',''); }, []);

  const totalCount = pagination.total;
  const goPage = (p) => { setPage(p); load(p, search, districtFilter); };

  if (loading && schools.length===0) return <Spinner msg="Loading schools…"/>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, fontFamily:font }} className="anim">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
        <StatCard icon={Building2}    label="Total Violations" value={fmt(totalCount)}                           color="gold"/>
        <StatCard icon={CheckCircle}  label="With Request"     value={schools.filter(s=>s.request_id).length}  color="emerald"/>
        <StatCard icon={AlertTriangle}label="No Request"       value={schools.filter(s=>!s.request_id).length} color="red" alert/>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:200, maxWidth:400 }}>
          <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, color:C.goldDark }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setPage(1), load(1, e.target.value, districtFilter))} placeholder="Search schools…" style={{ ...inp, paddingLeft:38 }}/>
        </div>
        <button onClick={()=>{ setPage(1); load(1, search, districtFilter); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:12, fontWeight:700, fontSize:12, color:C.goldDark, cursor:"pointer", fontFamily:font }}>
          <Search style={{ width:14, height:14 }}/> Search
        </button>
        <select value={districtFilter} onChange={e=>{ setDistrictFilter(e.target.value); setPage(1); load(1, search, e.target.value); }} style={{ ...inp, width:160 }}>
          <option value="">All Districts</option>
          {districts.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={()=>{ setPage(1); load(1, search, districtFilter); }} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", background:C.dark, color:C.gold, border:"none", borderRadius:12, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:font }}>
          <RefreshCw style={{ width:14, height:14 }}/> Refresh
        </button>
      </div>
      <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <THead cols={['School','District','Category','Level','Set Fee','NESA Limit','Over By','Request Status']}/>
            <tbody>
              {schools.map((s,i)=>{
                const diff=Number(s.total_fee||0)-Number(s.nesa_limit||0);
                const pct=s.nesa_limit?((diff/Number(s.nesa_limit))*100).toFixed(1):'—';
                const rs=s.request_status||'none';
                const rsBadge={
                  approved:{bg:C.emeraldBg,text:C.emeraldDark,border:C.emeraldBord},
                  recommended:{bg:C.blueBg,text:C.blue700,border:C.blueBord},
                  pending:{bg:C.amberBg,text:"#92400e",border:C.amberBord},
                  none:{bg:C.red50,text:C.red800,border:C.redBorder},
                }[rs]||{bg:C.goldBg,text:C.goldDark,border:C.goldBorder};
                return (
                  <tr key={s.id} style={{ borderBottom:`1px solid ${C.goldBorder}`, background:i%2?C.goldBg:"white" }}>
                    <td style={{ padding:"12px 16px" }}>
                      <p style={{ fontWeight:700, color:C.dark, fontSize:13, margin:0 }}>{s.school_name}</p>
                      <p style={{ fontSize:10, color:C.goldDark, margin:0 }}>{s.academic_year} · {s.class_name}</p>
                    </td>
                    <td style={{ padding:"12px 16px", fontSize:12, fontWeight:700, color:C.darkMid }}>{s.district}</td>
                    <td style={{ padding:"12px 16px" }}><Badge status={(s.category||'').toLowerCase()}/></td>
                    <td style={{ padding:"12px 16px" }}><Badge status={(s.level||'').toLowerCase()}/></td>
                    <td style={{ padding:"12px 16px", fontWeight:900, color:C.red800, fontSize:13 }}>RWF {fmt(s.total_fee)}</td>
                    <td style={{ padding:"12px 16px", fontWeight:700, color:C.emeraldDark, fontSize:13 }}>RWF {fmt(s.nesa_limit)}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ background:C.red50, color:C.red800, border:`1px solid ${C.redBorder}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>+{pct}%</span>
                    </td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:8, border:`1px solid ${rsBadge.border}`, background:rsBadge.bg, color:rsBadge.text }}>
                        {rs==='none'?'No Request':rs.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:16, borderTop:`1px solid ${C.goldBorder}`, flexWrap:"wrap" }}>
            <button onClick={()=>goPage(Math.max(1,page-1))} disabled={page===1} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===1?0.4:1 }}>
              <ChevronLeft style={{ width:16, height:16, color:C.goldDark }}/>
            </button>
            <span style={{ fontSize:13, fontWeight:700, color:C.dark, padding:"0 8px", fontFamily:font }}>Page {page} of {pagination.pages}</span>
            <button onClick={()=>goPage(Math.min(pagination.pages,page+1))} disabled={page===pagination.pages} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===pagination.pages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===pagination.pages?0.4:1 }}>
              <ChevronRight style={{ width:16, height:16, color:C.goldDark }}/>
            </button>
            <span style={{ fontSize:11, color:C.goldDark, marginLeft:8, fontFamily:font }}>{fmt(totalCount)} total</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ANALYTICS VIEW — Filters (district, sector, year, term) + charts
// ════════════════════════════════════════════════════════════════
function AnalyticsView({ toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ district: '', sector: '', academic_year: '', term: '' });
  const [filterOptions, setFilterOptions] = useState({
    districts: [], sectors: [], academic_years: [],
    terms: ['Term 1', 'Term 2', 'Term 3'],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.district) params.append('district', filters.district);
      if (filters.sector) params.append('sector', filters.sector);
      if (filters.academic_year) params.append('academic_year', filters.academic_year);
      if (filters.term) params.append('term', filters.term);
      const r = await apiFetch(`${NESA_API}/analytics?${params}`);
      setData(r.data || null);
      if (r.filterOptions) setFilterOptions(r.filterOptions);
      else setFilterOptions(prev => ({ ...prev, terms: prev.terms || ['Term 1', 'Term 2', 'Term 3'] }));
    } catch (e) {
      toast('Failed to load analytics', 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [filters.district, filters.sector, filters.academic_year, filters.term, toast]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const applyFilters = () => load();

  if (loading && !data) return <Spinner msg="Loading analytics…"/>;

  const d = data || {};
  const districtBreakdown = d.district_breakdown || [];
  const districtViolations = d.district_violations || [];
  const yearBreakdown = d.year_breakdown || [];
  const monthlyTrend = d.monthly_trend || [];
  const sectorBreakdown = d.sector_breakdown || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, fontFamily:font }} className="anim">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h3 style={{ fontWeight:900, color:C.dark, fontSize:18, margin:"0 0 4px" }}>📊 Analytics & Reports</h3>
          <p style={{ fontSize:12, color:C.goldDark, margin:0 }}>Filter by district, sector, academic year & term</p>
        </div>
        <button onClick={applyFilters} disabled={loading} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:loading?"#9ca3af":`linear-gradient(135deg, ${C.dark}, ${C.darkMid})`, color:C.gold, border:"none", borderRadius:14, fontWeight:700, fontSize:13, cursor:loading?"not-allowed":"pointer", fontFamily:font, boxShadow:"0 4px 12px rgba(26,18,0,0.2)" }}>
          {loading ? <Loader2 style={{ width:14, height:14, animation:"spin 0.8s linear infinite" }}/> : <RefreshCw style={{ width:14, height:14 }}/>} Refresh
        </button>
      </div>

      {/* Filters — mobile responsive */}
      <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:16, boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
        <p style={{ fontSize:10, fontWeight:900, color:C.goldDark, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 12px", fontFamily:font }}>Filters</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, marginBottom:4 }}>District</label>
            <select value={filters.district} onChange={e=>setFilter("district", e.target.value)} style={inp}>
              <option value="">All</option>
              {(filterOptions.districts || []).map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, marginBottom:4 }}>Sector</label>
            <select value={filters.sector} onChange={e=>setFilter("sector", e.target.value)} style={inp}>
              <option value="">All</option>
              {(filterOptions.sectors || []).map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, marginBottom:4 }}>Academic Year</label>
            <select value={filters.academic_year} onChange={e=>setFilter("academic_year", e.target.value)} style={inp}>
              <option value="">All</option>
              {(filterOptions.academic_years || []).map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:10, fontWeight:700, color:C.goldDark, marginBottom:4 }}>Term</label>
            <select value={filters.term} onChange={e=>setFilter("term", e.target.value)} style={inp}>
              <option value="">All</option>
              {(filterOptions.terms || []).map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} disabled={loading} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", background:C.dark, color:C.gold, border:"none", borderRadius:12, fontWeight:700, fontSize:12, cursor:loading?"not-allowed":"pointer", fontFamily:font }}>
            {loading ? <Loader2 style={{ width:14, height:14, animation:"spin 0.8s linear infinite" }}/> : <Filter style={{ width:14, height:14 }}/>} Apply
          </button>
        </div>
      </div>

      {/* Charts grid — 1 col mobile, 2 cols from 768px */}
      <style>{`.nesa-charts { display:grid; gap:16; grid-template-columns:1fr; } @media(min-width:768px){ .nesa-charts { grid-template-columns:repeat(2,1fr); } }`}</style>
      <div className="nesa-charts">
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)", minWidth:0 }}>
          <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
            <TrendingUp style={{ width:14, height:14, color:C.goldDark }}/> Increase requests by District
          </h4>
          {districtBreakdown.length ? (
            <HBarChart data={districtBreakdown.map(x=>({ label: x.district, value: x.total }))}/>
          ) : <Empty msg="No data"/>}
        </div>
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)", minWidth:0 }}>
          <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
            <Calendar style={{ width:14, height:14, color:C.blue700 }}/> By Academic Year
          </h4>
          {yearBreakdown.length ? (
            <HBarChart data={yearBreakdown.map(x=>({ label: String(x.academic_year), value: x.total }))}/>
          ) : <Empty msg="No data"/>}
        </div>
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)", minWidth:0 }}>
          <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
            <MapPin style={{ width:14, height:14, color:C.red }}/> Violations by District
          </h4>
          {districtViolations.length ? <HBarChart data={districtViolations}/> : <Empty msg="No violation data"/>}
        </div>
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, padding:20, boxShadow:"0 2px 8px rgba(254,191,16,0.07)", minWidth:0 }}>
          <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, display:"flex", alignItems:"center", gap:8, margin:"0 0 16px" }}>
            <Activity style={{ width:14, height:14, color:C.goldDark }}/> Monthly Trend
          </h4>
          {monthlyTrend.length ? <LineAreaChart data={monthlyTrend} labelKey="label" valueKey="total" color={C.dark} height={160}/> : <Empty msg="No trend data"/>}
        </div>
      </div>

      {/* District breakdown table — horizontal scroll on mobile */}
      {districtBreakdown.length > 0 && (
        <div style={{ background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:20, overflow:"hidden", boxShadow:"0 2px 8px rgba(254,191,16,0.07)" }}>
          <div style={{ padding:"12px 20px", borderBottom:`1px solid ${C.goldBorder}`, background:C.goldBg }}>
            <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, margin:0 }}>District Breakdown (Increase Requests)</h4>
          </div>
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520 }}>
              <THead cols={['District','Total','Recommended','Approved','Pending','Rejected']}/>
              <tbody>
                {districtBreakdown.map((d,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.goldBorder}`, background:i%2?C.goldBg:"white" }}>
                    <td style={{ padding:"12px 16px", fontWeight:700, color:C.dark, fontSize:13 }}>{d.district}</td>
                    <td style={{ padding:"12px 16px", fontWeight:900, color:C.dark }}>{d.total}</td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:C.blueBg, color:C.blue700, border:`1px solid ${C.blueBord}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>{d.recommended}</span></td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:C.emeraldBg, color:C.emeraldDark, border:`1px solid ${C.emeraldBord}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>{d.approved}</span></td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:C.amberBg, color:"#92400e", border:`1px solid ${C.amberBord}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>{d.pending}</span></td>
                    <td style={{ padding:"12px 16px" }}><span style={{ background:C.red50, color:C.red800, border:`1px solid ${C.redBorder}`, padding:"2px 8px", borderRadius:8, fontSize:11, fontWeight:900 }}>{d.rejected}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// NOTIFICATIONS VIEW
// ════════════════════════════════════════════════════════════════
function NotificationsView({ toast, setNotifCount }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]   = useState(1);

  useEffect(() => {
    apiFetch(`${NESA_API}/notifications?limit=100`)
      .then(r => { setNotifs(r.data || []); setNotifCount(r.unread_count || 0); })
      .catch(() => toast('Failed to load notifications', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => setNotifCount(notifs.filter(n => !n.is_read).length), [notifs]);

  const markRead = id => setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  const markAll  = ()  => setNotifs(p => p.map(n => ({ ...n, is_read: true })));

  const typeStyle = {
    violation: { bg:C.red50,     border:C.redBorder,   iconColor:C.red     },
    request:   { bg:C.amberBg,   border:C.amberBord,   iconColor:C.amber   },
    approved:  { bg:C.emeraldBg, border:C.emeraldBord, iconColor:C.emerald },
    system:    { bg:C.goldBg,    border:C.goldBorder,  iconColor:C.goldDark},
  };

  const perPage = PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(notifs.length / perPage));
  const paginated = notifs.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, fontFamily:font }} className="anim">
      {loading && <Spinner msg="Loading notifications…"/>}
      {!loading && notifs.length===0 && <Empty msg="No notifications yet" icon={Bell}/>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <h3 style={{ fontWeight:900, color:C.dark, fontSize:16, margin:0 }}>Notifications</h3>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={markAll} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"white", border:`1px solid ${C.goldBorder}`, borderRadius:12, fontSize:12, fontWeight:700, color:C.goldDark, cursor:"pointer", fontFamily:font }}>
            <CheckCircle style={{ width:13, height:13 }}/> Mark All Read
          </button>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {!loading && paginated.map(n=>{
          const ts = typeStyle[n.type] || { bg:C.goldBg, border:C.goldBorder, iconColor:C.goldDark };
          return (
            <div key={n.id} onClick={()=>markRead(n.id)}
              style={{ border:`1px solid ${ts.border}`, borderRadius:20, padding:16, cursor:"pointer", background:ts.bg, opacity:n.is_read?0.7:1, transition:"all 150ms" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:n.is_read?"rgba(0,0,0,0.05)":"rgba(254,191,16,0.15)" }}>
                  <Bell style={{ width:14, height:14, color:n.is_read?C.goldBorder:ts.iconColor }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:2 }}>
                    <h4 style={{ fontWeight:900, color:C.dark, fontSize:13, margin:0 }}>{n.title}</h4>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                      <span style={{ fontSize:10, color:C.goldDark }}>{n.time}</span>
                      {!n.is_read && <div style={{ width:8, height:8, borderRadius:"50%", background:C.dark }}/>}
                    </div>
                  </div>
                  <p style={{ fontSize:12, color:C.darkMid, margin:0 }}>{n.body}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===1?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===1?0.4:1 }}>
            <ChevronLeft style={{ width:16, height:16, color:C.goldDark }}/>
          </button>
          <span style={{ fontSize:13, fontWeight:700, color:C.dark, padding:"0 8px", fontFamily:font }}>Page {page} of {totalPages}</span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:36, height:36, borderRadius:12, border:`1px solid ${C.goldBorder}`, background:"white", cursor:page===totalPages?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity:page===totalPages?0.4:1 }}>
            <ChevronRight style={{ width:16, height:16, color:C.goldDark }}/>
          </button>
          <span style={{ fontSize:11, color:C.goldDark, fontFamily:font }}>{fmt(notifs.length)} total</span>
        </div>
      )}
    </div>
  );
}