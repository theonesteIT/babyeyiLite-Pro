import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CalendarDays, CheckCheck, CreditCard, FileText,
  GraduationCap, KeyRound, LayoutDashboard, LogOut,
  MessageSquare, Moon, Paperclip, Reply, Send, Sun, Trash2,
  UserCircle2, TrendingUp, Download, AlertTriangle, CheckCircle2,
  Clock, ChevronRight, X, Filter, BarChart3, Shield,
  Wallet, BookOpen, Award, Activity, ArrowUpRight,
  ArrowDownRight, Eye, Calendar, MapPin, Phone, Mail,
  ZapIcon, Star, Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StudentChat from './studentChat';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const TIMETABLE_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ─── Brand tokens ─────────────────────────────────────────────────── */
const B = {
  navy:     '#000435',
  navyMid:  '#0a1045',
  navyLight:'#1a237e',
  amber:    '#f59e0b',
  amberDark:'#d97706',
  amberPale:'#fef3c7',
  white:    '#ffffff',
  offWhite: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate600: '#475569',
  slate800: '#1e293b',
  green:    '#16a34a',
  greenPale:'#dcfce7',
  red:      '#dc2626',
  redPale:  '#fee2e2',
  blue:     '#2563eb',
  bluePale: '#dbeafe',
  orange:   '#ea580c',
  orangePale:'#ffedd5',
  purple:   '#7c3aed',
  purplePale:'#ede9fe',
};

/* ─── Empty state ─────────────────────────────────────────────────── */
const emptyData = {
  profile: null,
  attendance: {
    percentage: 0, today_status: null,
    monthly_summary: { present: 0, absent: 0, late: 0 },
    calendar: [], period_records: [], gate_records: [],
    gate_summary: { morning_checked: 0, evening_checked: 0 },
  },
  marks: { average_grade: 0, latest_by_subject: [], assessments: [], timetable: [] },
  discipline: {
    score: 100, behavior_grade: 'A', incidents: [], mark_logs: [],
    current_marks: 0, positive_events: 0, negative_events: 0,
  },
  fees: { total_due: 0, total_paid: 0, balance: 0, payments: [], transactions: [] },
  filters: { academic_year: '', term: '', available_academic_years: [], available_terms: [] },
  messages: { unread_count: 0, recent: [] },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtMoney = (v) => `RWF ${Number(v || 0).toLocaleString()}`;
const fmtDate  = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '—');
const fmtDT    = (v) => (v ? new Date(v).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' }) : '—');
const fmtTime  = (v) => (v ? new Date(v).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '—');

const statusColor = (s) => {
  const m = { present:'#16a34a', Present:'#16a34a', PRESENT:'#16a34a',
               absent:'#dc2626',  Absent:'#dc2626',  ABSENT:'#dc2626',
               late:'#f59e0b',    Late:'#f59e0b',    LATE:'#f59e0b',
               'on time':'#16a34a','On Time':'#16a34a','ON_TIME':'#16a34a' };
  return m[s] || B.slate400;
};

const bgradeColor = (g) => {
  const m = { A:B.green, B:B.blue, C:B.amber, D:B.orange, E:B.red, F:B.red };
  return m[String(g||'A').toUpperCase()[0]] || B.amber;
};

const TIMETABLE_SUBJECT_PALETTES = [
  { bg: '#fff1f2', border: '#fecdd3', title: '#9f1239', meta: '#881337' },
  { bg: '#eff6ff', border: '#bfdbfe', title: '#1d4ed8', meta: '#1e40af' },
  { bg: '#ecfdf5', border: '#bbf7d0', title: '#047857', meta: '#065f46' },
  { bg: '#fff7ed', border: '#fed7aa', title: '#c2410c', meta: '#9a3412' },
  { bg: '#f5f3ff', border: '#ddd6fe', title: '#6d28d9', meta: '#5b21b6' },
  { bg: '#f0fdfa', border: '#99f6e4', title: '#0f766e', meta: '#115e59' },
  { bg: '#fefce8', border: '#fde68a', title: '#a16207', meta: '#854d0e' },
  { bg: '#eef2ff', border: '#c7d2fe', title: '#3730a3', meta: '#312e81' },
];

const timetablePaletteForSubject = (subject = '') => {
  const value = String(subject || '').trim().toLowerCase();
  if (!value) return TIMETABLE_SUBJECT_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return TIMETABLE_SUBJECT_PALETTES[hash % TIMETABLE_SUBJECT_PALETTES.length];
};

async function apiGet(path, params = {}) {
  const qs  = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!=='')));
  const url = `${API}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `Request failed: ${path}`);
  return json;
}

/* ─── Mini chart (SVG sparkline) ─────────────────────────────────── */
function Sparkline({ data = [], color = B.amber, height = 36, width = 120 }) {
  if (data.length < 2) return null;
  const max  = Math.max(...data, 1);
  const min  = Math.min(...data);
  const rng  = max - min || 1;
  const W    = width, H = height, pad = 4;
  const pts  = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    H - pad - ((v - min) / rng) * (H - pad * 2),
  ]);
  const path  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area  = `${path} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.slice(1)})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3.5" fill={color}/>
    </svg>
  );
}

/* ─── Progress ring ──────────────────────────────────────────────── */
function Ring({ value = 0, size = 88, stroke = 8, color = B.amber, bg = 'rgba(255,255,255,0.12)', label, dark = false }) {
  const r   = (size - stroke) / 2;
  const circ= 2 * Math.PI * r;
  const off = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke={bg} strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
        <span style={{ fontSize: size * 0.18, fontWeight:900, color: dark ? '#fff' : B.navy, lineHeight:1 }}>{value}%</span>
        {label && <span style={{ fontSize: size * 0.1, color: dark ? 'rgba(255,255,255,0.6)' : B.slate400, lineHeight:1 }}>{label}</span>}
      </div>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, trend, onClick, dark }) {
  const bg     = dark ? 'rgba(255,255,255,0.05)' : B.white;
  const border = dark ? 'rgba(255,255,255,0.08)' : B.slate200;
  return (
    <div onClick={onClick} style={{ background:bg, border:`1px solid ${border}`, borderRadius:18, padding:'18px 20px', cursor:onClick?'pointer':'default', transition:'transform 0.18s, box-shadow 0.18s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e => { if(onClick){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 12px 40px ${color}30`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:color, opacity:0.08, pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={18} color={color}/>
        </div>
        {trend != null && (
          <span style={{ fontSize:11, fontWeight:700, color: trend >= 0 ? B.green : B.red, display:'flex', alignItems:'center', gap:2 }}>
            {trend >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p style={{ margin:0, fontSize:11, color: dark ? B.slate400 : B.slate600, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
      <p style={{ margin:'4px 0 0', fontSize:22, fontWeight:900, color: dark ? '#fff' : B.navy, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ margin:'4px 0 0', fontSize:11, color: dark ? B.slate400 : B.slate600 }}>{sub}</p>}
    </div>
  );
}

/* ─── Section card ───────────────────────────────────────────────── */
function Section({ title, subtitle, icon: Icon, children, action, dark }) {
  const bg     = dark ? 'rgba(255,255,255,0.03)' : B.white;
  const border = dark ? 'rgba(255,255,255,0.07)' : B.slate200;
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:18, padding:'20px 22px', marginTop:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {Icon && <div style={{ width:34, height:34, borderRadius:10, background:`${B.amber}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={16} color={B.amber}/>
          </div>}
          <div>
            <h3 style={{ margin:0, fontSize:15, fontWeight:900, color: dark ? '#fff' : B.navy }}>{title}</h3>
            {subtitle && <p style={{ margin:'2px 0 0', fontSize:11, color: dark ? B.slate400 : B.slate600 }}>{subtitle}</p>}
          </div>
        </div>
        {action && action}
      </div>
      {children}
    </div>
  );
}

/* ─── Status badge ───────────────────────────────────────────────── */
function Badge({ text, color }) {
  const c = statusColor(text) || color || B.slate400;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', background:`${c}18`, color:c, border:`1px solid ${c}30` }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0 }}/>
      {text}
    </span>
  );
}

/* ─── Download helper ────────────────────────────────────────────── */
function csvDownload(rows, headers, filename) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })), download: filename,
  });
  a.click();
}

/* ─── Banner ─────────────────────────────────────────────────────── */
function Banner({ type = 'info', text, onClose }) {
  const MAP = { info:{bg:B.bluePale,fg:B.blue}, error:{bg:B.redPale,fg:B.red}, success:{bg:B.greenPale,fg:B.green}, warn:{bg:B.amberPale,fg:B.amberDark} };
  const m = MAP[type] || MAP.info;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:m.bg, color:m.fg, fontSize:13, fontWeight:600, marginBottom:8 }}>
      <AlertTriangle size={14} style={{ flexShrink:0 }}/>
      <span style={{ flex:1 }}>{text}</span>
      {onClose && <button onClick={onClose} style={{ border:'none', background:'transparent', color:m.fg, cursor:'pointer', padding:0, display:'flex' }}><X size={14}/></button>}
    </div>
  );
}

/* ─── Data table ─────────────────────────────────────────────────── */
function DataTable({ columns, rows, emptyText = 'No records', dark }) {
  const bg     = dark ? 'rgba(255,255,255,0.03)' : B.offWhite;
  const border = dark ? 'rgba(255,255,255,0.07)' : B.slate200;
  return (
    <div style={{ border:`1px solid ${border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
          <thead>
            <tr style={{ background: dark ? 'rgba(255,255,255,0.05)' : B.slate100 }}>
              {columns.map(c => (
                <th key={c} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color: dark ? B.slate400 : B.slate600, borderBottom:`1px solid ${border}`, whiteSpace:'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding:'20px 12px', fontSize:13, color: dark ? B.slate400 : B.slate600, textAlign:'center' }}>{emptyText}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.04)' : B.slate100}`, transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : B.slate100}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding:'10px 12px', fontSize:12, color: dark ? B.slate400 : B.slate600, whiteSpace:'nowrap' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Progress bar ───────────────────────────────────────────────── */
function ProgressBar({ value = 0, color = B.amber, height = 8, dark, label, showPct = true }) {
  return (
    <div>
      {(label || showPct) && (
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          {label && <span style={{ fontSize:11, fontWeight:600, color: dark ? B.slate400 : B.slate600 }}>{label}</span>}
          {showPct && <span style={{ fontSize:11, fontWeight:800, color }}>{value}%</span>}
        </div>
      )}
      <div style={{ height, borderRadius:999, background: dark ? 'rgba(255,255,255,0.08)' : B.slate200, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(100,Math.max(0,value))}%`, borderRadius:999, background:color, transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const auth     = useAuth();
  const navigate = useNavigate();

  const [dark,    setDark]    = useState(false);
  const [page,    setPage]    = useState('dashboard');
  const [mobile,  setMobile]  = useState(() => typeof window !== 'undefined' ? window.innerWidth < 980 : false);
  const [dash,    setDash]    = useState(emptyData);
  const [year,    setYear]    = useState('');
  const [term,    setTerm]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [notifs,  setNotifs]  = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifPanelRef = useRef(null);

  /* password change */
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError,   setPwdError]   = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdForm,    setPwdForm]    = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });

  /* chat */
  const [staff,         setStaff]         = useState([]);
  const [threads,       setThreads]       = useState([]);
  const [activeThreadId,setActiveThreadId]= useState(null);
  const [messages,      setMessages]      = useState([]);
  const [chatText,      setChatText]      = useState('');
  const [replyTarget,   setReplyTarget]   = useState(null);
  const [chatFile,      setChatFile]      = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [chatInfo,      setChatInfo]      = useState('');
  const [chatError,     setChatError]     = useState('');
  const [staffSearch,   setStaffSearch]   = useState('');
  const [timetableSelDay, setTimetableSelDay] = useState(() => new Date().toLocaleDateString('en-GB', { weekday:'long' }));
  const [timetableViewMode, setTimetableViewMode] = useState('day');
  const msgEndRef = useRef(null);

  const activeThread = useMemo(() => threads.find(t => Number(t.id) === Number(activeThreadId)) || null, [threads, activeThreadId]);
  const user         = auth.user || {};
  const mustChange   = !!user?.force_password_change;
  const currentNow   = new Date();

  /* ── colors ── */
  const pageBg   = dark ? '#02071a' : B.slate100;
  const panelBg  = dark ? '#060d24' : B.white;
  const panelBdr = dark ? 'rgba(255,255,255,0.07)' : B.slate200;
  const txt      = dark ? '#e2e8f0' : B.navy;
  const sub      = dark ? B.slate400 : B.slate600;

  /* ── resize ── */
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 980);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!showNotifPanel) return;
    const onDocDown = (e) => {
      if (!notifPanelRef.current) return;
      if (!notifPanelRef.current.contains(e.target)) setShowNotifPanel(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowNotifPanel(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showNotifPanel]);

  /* ── auth guard ── */
  useEffect(() => {
    if (!auth.loading && (!auth.isLoggedIn || String(auth.role||'').toUpperCase() !== 'STUDENT'))
      navigate('/online-service', { replace:true });
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  /* ── fetch dashboard data ── */
  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn) return;
    (async () => {
      setLoading(true); setError('');
      try {
        const json = await apiGet('/api/online-service/dashboard-data', { academic_year: year||undefined, term: term||undefined });
        const d = json.data || {};
        setDash({ ...emptyData, ...d,
          attendance: { ...emptyData.attendance, ...(d.attendance||{}) },
          marks:      { ...emptyData.marks,      ...(d.marks||{})      },
          discipline: { ...emptyData.discipline, ...(d.discipline||{}) },
          fees:       { ...emptyData.fees,       ...(d.fees||{})       },
          filters:    { ...emptyData.filters,    ...(d.filters||{})    },
          messages:   { ...emptyData.messages,   ...(d.messages||{})   },
        });
        if (!year && d.filters?.academic_year) setYear(String(d.filters.academic_year));
        /* auto-generate notifications from data */
        const ns = [];
        if (d.fees?.balance > 0) ns.push({ id:'f1', type:'warn', msg:`Outstanding fee balance: ${fmtMoney(d.fees.balance)}` });
        if (d.attendance?.percentage < 75) ns.push({ id:'a1', type:'warn', msg:`Low attendance: ${d.attendance?.percentage}% (minimum 75% required)` });
        if (d.discipline?.current_marks < 20) ns.push({ id:'d1', type:'error', msg:`Discipline score dropped below 20 — please review` });
        if (d.attendance?.today_status === 'Absent') ns.push({ id:'a2', type:'error', msg:`You were marked absent today` });
        setNotifs(ns);
      } catch(e) {
        setError(e.message || 'Failed to load dashboard data');
      } finally { setLoading(false); }
    })();
  }, [auth.loading, auth.isLoggedIn, year, term]);

  /* ── scroll messages to bottom ── */
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  /* ── chat load ── */
  useEffect(() => {
    if (page !== 'chat') return;
    (async () => {
      setChatError('');
      try {
        const schoolId = Number(dash.profile?.school_id || user?.school_id || user?.school?.id || 0);
        if (!schoolId) return;
        const [sr, tr] = await Promise.all([
          apiGet('/api/chat/staff', { school_id: schoolId }),
          apiGet('/api/chat/threads', { school_id: schoolId }),
        ]);
        setStaff(Array.isArray(sr.data) ? sr.data : []);
        const ts = Array.isArray(tr.data) ? tr.data : [];
        setThreads(ts);
        if (ts.length && !activeThreadId) setActiveThreadId(Number(ts[0].id));
      } catch(e) { setChatError(e.message||'Chat unavailable'); }
    })();
  }, [page]);

  /* ── load messages ── */
  useEffect(() => {
    if (page !== 'chat' || !activeThreadId) return;
    (async () => {
      try {
        const schoolId = Number(dash.profile?.school_id || user?.school_id || user?.school?.id || 0);
        if (!schoolId) return;
        const res = await apiGet(`/api/chat/threads/${activeThreadId}/messages`, { school_id: schoolId });
        setMessages(Array.isArray(res.data) ? res.data : []);
      } catch { setMessages([]); }
    })();
  }, [page, activeThreadId]);

  const logout = async () => { await auth.logout(); navigate('/online-service', { replace:true }); };

  const changePwd = async (e) => {
    e.preventDefault(); setPwdError(''); setPwdSuccess('');
    if (pwdForm.newPassword.length < 8) return setPwdError('New password must be at least 8 characters.');
    if (pwdForm.newPassword !== pwdForm.confirmPassword) return setPwdError('Passwords do not match.');
    setPwdLoading(true);
    try {
      const res  = await fetch(`${API}/api/online-service/change-password`, {
        method:'PUT', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) return setPwdError(json.message||'Failed to change password');
      setPwdSuccess('Password changed successfully!');
      setPwdForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      await auth.refresh();
    } catch { setPwdError('Cannot reach server.'); } finally { setPwdLoading(false); }
  };

  const sendChat = async () => {
    setChatError(''); setChatInfo('');
    const schoolId = Number(dash.profile?.school_id || user?.school_id || user?.school?.id || 0);
    if (!schoolId || !activeThreadId || (!chatText.trim() && !chatFile)) return;
    try {
      let attachment = null;
      if (chatFile) {
        setUploading(true);
        const fd = new FormData(); fd.append('file', chatFile);
        const ur = await fetch(`${API}/api/chat/uploads`, { method:'POST', credentials:'include', body:fd });
        const uj = await ur.json().catch(() => ({}));
        setUploading(false);
        if (!ur.ok || !uj.success) throw new Error(uj.message||'Upload failed');
        attachment = uj.data?.url || null;
      }
      const sr = await fetch(`${API}/api/chat/threads/${activeThreadId}/messages?school_id=${schoolId}`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ school_id:schoolId, body:chatText.trim(), attachment_url:attachment, reply_to_message_id: replyTarget?.id||null }),
      });
      const sj = await sr.json().catch(() => ({}));
      if (!sr.ok || !sj.success) throw new Error(sj.message||'Failed to send');
      setChatText(''); setReplyTarget(null); setChatFile(null);
      const mr = await apiGet(`/api/chat/threads/${activeThreadId}/messages`, { school_id:schoolId });
      setMessages(Array.isArray(mr.data) ? mr.data : []);
      const tr = await apiGet('/api/chat/threads', { school_id:schoolId });
      setThreads(Array.isArray(tr.data) ? tr.data : []);
      setChatInfo('Message sent.');
    } catch(e) { setUploading(false); setChatError(e.message||'Send failed'); }
  };

  const deleteThread = async (id) => {
    const schoolId = Number(dash.profile?.school_id || user?.school_id || user?.school?.id || 0);
    try {
      await fetch(`${API}/api/chat/threads/${id}?school_id=${schoolId}`, { method:'DELETE', credentials:'include' });
      const tr = await apiGet('/api/chat/threads', { school_id:schoolId });
      const ts = Array.isArray(tr.data) ? tr.data : [];
      setThreads(ts);
      if (Number(activeThreadId) === Number(id)) setActiveThreadId(ts[0]?.id ? Number(ts[0].id) : null);
    } catch {}
  };

  const createThread = async (staffId) => {
    const schoolId = Number(dash.profile?.school_id || user?.school_id || user?.school?.id || 0);
    try {
      const res = await fetch(`${API}/api/chat/threads`, {
        method:'POST', credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ school_id:schoolId, participant_user_id:Number(staffId) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message);
      setActiveThreadId(Number(j.data?.thread_id||0)||null);
      const tr = await apiGet('/api/chat/threads', { school_id:schoolId });
      setThreads(Array.isArray(tr.data) ? tr.data : []);
    } catch(e) { setChatError(e.message||'Could not open chat'); }
  };

  /* ── derived stats ── */
  const feesPct      = dash.fees.total_due > 0 ? Math.round((dash.fees.total_paid / dash.fees.total_due) * 100) : 0;
  const discScore    = Number(dash.discipline?.current_marks || 0);
  const attendPct    = Number(dash.attendance?.percentage || 0);
  const avgGrade     = Number(dash.marks?.average_grade || 0);

  const subjectTrend = useMemo(() => {
    const rows = dash.marks?.latest_by_subject || [];
    return rows.map(r => Number(r.percent||0));
  }, [dash.marks]);

  const payTrend = useMemo(() => {
    const rows = (dash.fees?.transactions || dash.fees?.payments || []).slice(-8);
    return rows.map(r => Number(r.amount_paid||0));
  }, [dash.fees]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase();
      const role = String(s.role_code || '').toLowerCase().replace(/_/g, ' ');
      return fullName.includes(q) || role.includes(q);
    });
  }, [staff, staffSearch]);

  /* ── nav items ── */
  const NAV = [
    { id:'dashboard',  label:'Dashboard',  Icon:LayoutDashboard },
    { id:'attendance', label:'Attendance', Icon:CalendarDays    },
    { id:'academics',  label:'Academics',  Icon:GraduationCap   },
    { id:'discipline', label:'Discipline', Icon:Shield          },
    { id:'fees',       label:'Fees',       Icon:Wallet          },
    { id:'timetable',  label:'Timetable',  Icon:Calendar        },
    { id:'chat',       label:'Chat',       Icon:MessageSquare   },
    { id:'profile',    label:'Profile',    Icon:UserCircle2     },
    { id:'security',   label:'Security',   Icon:KeyRound        },
  ];
  const MOB_NAV = NAV.slice(0, 5);

  /* ─── FILTER BAR ─── */
  const FilterBar = () => (
    <div style={{ background: panelBg, border:`1px solid ${panelBdr}`, borderRadius:14, padding:'14px 16px', marginTop:12 }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flex:'0 0 auto' }}>
          <Filter size={13} color={B.amber}/>
          <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color: B.amber }}>Filters</span>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, flex:1 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:10, color:sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Academic Year</label>
            <select value={year} onChange={e=>setYear(e.target.value)} style={{ height:36, borderRadius:10, border:`1px solid ${panelBdr}`, background: dark?'rgba(255,255,255,0.05)':B.offWhite, color:txt, padding:'0 12px', fontSize:12, fontWeight:700, outline:'none', minWidth:140, fontFamily:'Montserrat, sans-serif' }}>
              <option value="">All Years</option>
              {(dash.filters?.available_academic_years||[]).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:10, color:sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Term</label>
            <select value={term} onChange={e=>setTerm(e.target.value)} style={{ height:36, borderRadius:10, border:`1px solid ${panelBdr}`, background: dark?'rgba(255,255,255,0.05)':B.offWhite, color:txt, padding:'0 12px', fontSize:12, fontWeight:700, outline:'none', minWidth:110, fontFamily:'Montserrat, sans-serif' }}>
              <option value="">All Terms</option>
              {(dash.filters?.available_terms||[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => { setYear(''); setTerm(''); }} style={{ alignSelf:'flex-end', height:36, borderRadius:10, border:`1px solid ${panelBdr}`, background:'transparent', color:txt, padding:'0 14px', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'Montserrat, sans-serif' }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );

  /* ─────────────────── PAGE: DASHBOARD ─────────────────── */
  const PageDashboard = () => (
    <>
      {/* summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginTop:14 }}>
        <StatCard icon={CalendarDays} label="Attendance" value={`${attendPct}%`} sub={`Today: ${dash.attendance?.today_status||'N/A'}`} color={B.green} trend={attendPct >= 80 ? 2 : -3} dark={dark} onClick={() => setPage('attendance')}/>
        <StatCard icon={GraduationCap} label="Avg Grade" value={`${avgGrade}%`} sub={`${(dash.marks?.latest_by_subject||[]).length} subjects`} color={B.blue} dark={dark} onClick={() => setPage('academics')}/>
        <StatCard icon={Shield} label="Discipline" value={dash.discipline?.behavior_grade||'A'} sub={`Score: ${discScore}`} color={bgradeColor(dash.discipline?.behavior_grade)} dark={dark} onClick={() => setPage('discipline')}/>
        <StatCard icon={Wallet} label="Fees Balance" value={fmtMoney(dash.fees?.balance)} sub={`${feesPct}% paid`} color={dash.fees?.balance > 0 ? B.orange : B.green} dark={dark} onClick={() => setPage('fees')}/>
      </div>

      {/* alerts */}
      {notifs.length > 0 && (
        <div style={{ marginTop:14, display:'grid', gap:8 }}>
          {notifs.map(n => <Banner key={n.id} type={n.type} text={n.msg} onClose={() => setNotifs(p => p.filter(x=>x.id!==n.id))}/>)}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap:14, marginTop:14 }}>

        {/* Performance chart */}
        <Section title="Subject Performance" subtitle="Latest marks by subject" icon={BarChart3} dark={dark}
          action={<button onClick={() => csvDownload((dash.marks?.latest_by_subject||[]).map(r=>[r.subject_name,r.percent+'%']),['Subject','Percent'],'academics.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> Export</button>}>
          <div style={{ display:'grid', gap:10 }}>
            {(dash.marks?.latest_by_subject||[]).slice(0,6).map((r,i) => (
              <ProgressBar key={i} label={String(r.subject_name||`Subject ${i+1}`).slice(0,18)} value={Number(r.percent||0)} color={B.blue} dark={dark}/>
            ))}
            {(dash.marks?.latest_by_subject||[]).length === 0 && <p style={{ margin:0, color:sub, fontSize:12 }}>No marks yet for selected period.</p>}
          </div>
        </Section>

        {/* Fees summary */}
        <Section title="Fees Overview" subtitle="Current balance status" icon={Wallet} dark={dark}
          action={<button onClick={() => setPage('fees')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}>View All <ChevronRight size={11}/></button>}>
          <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <Ring value={feesPct} size={96} color={feesPct >= 100 ? B.green : B.amber} dark={dark} label="Paid"/>
            <div style={{ flex:1, minWidth:140 }}>
              {[
                { label:'Total Due',  value:fmtMoney(dash.fees?.total_due),  color:B.slate600 },
                { label:'Total Paid', value:fmtMoney(dash.fees?.total_paid), color:B.green    },
                { label:'Balance',    value:fmtMoney(dash.fees?.balance),    color: dash.fees?.balance > 0 ? B.orange : B.green },
              ].map(({label,value,color}) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${dark?'rgba(255,255,255,0.05)':B.slate100}` }}>
                  <span style={{ fontSize:12, color:sub }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color }}>{value}</span>
                </div>
              ))}
              {dash.fees?.balance > 0 && (
                <div style={{ marginTop:10, padding:'8px 12px', borderRadius:10, background:`${B.orange}15`, border:`1px solid ${B.orange}30`, fontSize:11, color:B.orange, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                  <AlertTriangle size={12}/> You still owe {fmtMoney(dash.fees.balance)}
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* Attendance ring + summary */}
        <Section title="Attendance Summary" subtitle="Monthly breakdown" icon={CalendarDays} dark={dark}>
          <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <Ring value={attendPct} size={96} color={attendPct >= 80 ? B.green : B.red} dark={dark} label="Attend."/>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, minWidth:180 }}>
              {[
                { label:'Present', value: dash.attendance?.monthly_summary?.present||0, color:B.green  },
                { label:'Absent',  value: dash.attendance?.monthly_summary?.absent||0,  color:B.red    },
                { label:'Late',    value: dash.attendance?.monthly_summary?.late||0,    color:B.amber  },
              ].map(({label,value,color}) => (
                <div key={label} style={{ textAlign:'center', padding:'10px 8px', borderRadius:12, background:`${color}12`, border:`1px solid ${color}25` }}>
                  <p style={{ margin:0, fontSize:22, fontWeight:900, color }}>{value}</p>
                  <p style={{ margin:'2px 0 0', fontSize:10, color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Discipline */}
        <Section title="Discipline Score" subtitle="Behavior rating" icon={Shield} dark={dark}
          action={<button onClick={() => setPage('discipline')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}>History <ChevronRight size={11}/></button>}>
          <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <Ring value={Math.round((discScore/40)*100)} size={96} color={bgradeColor(dash.discipline?.behavior_grade)} dark={dark} label="Score"/>
            <div style={{ flex:1, minWidth:140 }}>
              <p style={{ margin:0, fontSize:28, fontWeight:900, color:bgradeColor(dash.discipline?.behavior_grade) }}>{dash.discipline?.behavior_grade||'A'}</p>
              <p style={{ margin:'2px 0 0', fontSize:13, color:sub }}>
                {discScore >= 35 ? 'Excellent Behavior' : discScore >= 25 ? 'Good' : discScore >= 15 ? 'Needs Improvement' : '⚠ Critical'}
              </p>
              <p style={{ margin:'8px 0 0', fontSize:12, color:sub }}>Score: <strong style={{ color:txt }}>{discScore}/40</strong></p>
            </div>
          </div>
        </Section>
      </div>
    </>
  );

  /* ─────────────────── PAGE: ATTENDANCE ─────────────────── */
  const PageAttendance = () => (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginTop:14 }}>
        <StatCard icon={Activity}    label="Overall %" value={`${attendPct}%`}  color={B.green}  dark={dark}/>
        <StatCard icon={CheckCircle2}label="Today"     value={dash.attendance?.today_status||'—'} color={statusColor(dash.attendance?.today_status)} dark={dark}/>
        <StatCard icon={CalendarDays}label="Gate Logs"  value={String((dash.attendance?.gate_records||[]).length)} color={B.blue}  dark={dark}/>
        <StatCard icon={Clock}       label="Late Count" value={String(dash.attendance?.monthly_summary?.late||0)} color={B.amber} dark={dark}/>
      </div>

      {/* Late alert */}
      {(dash.attendance?.monthly_summary?.late||0) >= 3 && (
        <Banner type="warn" text={`You were late ${dash.attendance.monthly_summary.late} time(s) this period. Consistent tardiness affects your record.`}/>
      )}

      {/* Subject attendance progress */}
      <Section title="Attendance by Subject" subtitle="Percentage per subject/period" icon={BarChart3} dark={dark}
        action={<button onClick={() => csvDownload((dash.attendance?.period_records||[]).map(r=>[fmtDate(r.date),r.subject_name||'—',r.day_of_week||'—',r.time_range||'—',r.status||'—']),['Date','Subject','Day','Time','Status'],'attendance-period.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> CSV</button>}>
        {(() => {
          const bySubj = {};
          (dash.attendance?.period_records||[]).forEach(r => {
            const n = r.subject_name||'Unknown';
            if (!bySubj[n]) bySubj[n] = { total:0, present:0 };
            bySubj[n].total++;
            if (String(r.status||'').toLowerCase() === 'present') bySubj[n].present++;
          });
          const entries = Object.entries(bySubj);
          return entries.length === 0 ? <p style={{ margin:0, color:sub, fontSize:12 }}>No period records for selected filters.</p> : (
            <div style={{ display:'grid', gap:10 }}>
              {entries.map(([subj, d]) => {
                const pct = d.total > 0 ? Math.round((d.present/d.total)*100) : 0;
                return <ProgressBar key={subj} label={`${subj} (${d.present}/${d.total})`} value={pct} color={pct >= 80 ? B.green : pct >= 60 ? B.amber : B.red} dark={dark}/>;
              })}
            </div>
          );
        })()}
      </Section>

      {/* Period table */}
      <Section title="Class Period Log" subtitle="Detailed period-by-period attendance" icon={CalendarDays} dark={dark}>
        <DataTable dark={dark}
          columns={['Date','Subject','Day','Time','Status']}
          rows={(dash.attendance?.period_records||[]).slice(0,120).map(r => [
            fmtDate(r.date), r.subject_name||'—', r.day_of_week||'—', r.time_range||'—',
            <Badge key="s" text={String(r.status||'—')}/>,
          ])}
          emptyText="No period attendance for selected filters."
        />
      </Section>

      {/* Gate entry/exit */}
      <Section title="Gate Entry & Exit (RFID)" subtitle="Daily check-in / check-out log" icon={MapPin} dark={dark}
        action={<button onClick={() => csvDownload((dash.attendance?.gate_records||[]).map(r=>[fmtDate(r.attendance_date),fmtDT(r.morning_check_in),r.morning_status||'—',fmtDT(r.evening_check_out),r.evening_status||'—']),['Date','Entry','Morning Status','Exit','Evening Status'],'gate-log.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> CSV</button>}>
        <DataTable dark={dark}
          columns={['Date','Entry Time','Morning','Exit Time','Evening']}
          rows={(dash.attendance?.gate_records||[]).slice(0,120).map(r => [
            fmtDate(r.attendance_date), fmtTime(r.morning_check_in),
            <Badge key="m" text={r.morning_status||'—'}/>,
            fmtTime(r.evening_check_out),
            <Badge key="e" text={r.evening_status||'—'}/>,
          ])}
          emptyText="No gate records for selected filters."
        />
      </Section>
    </>
  );

  /* ─────────────────── PAGE: ACADEMICS ─────────────────── */
  const PageAcademics = () => (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginTop:14 }}>
        <StatCard icon={TrendingUp}   label="Average Grade" value={`${avgGrade}%`}  color={B.blue}   dark={dark}/>
        <StatCard icon={BookOpen}     label="Subjects"      value={String((dash.marks?.latest_by_subject||[]).length)} color={B.purple} dark={dark}/>
        <StatCard icon={FileText}     label="Assessments"   value={String((dash.marks?.assessments||[]).length)}       color={B.amber}  dark={dark}/>
        <StatCard icon={Star}         label="Class"         value={dash.profile?.class_name||'—'}  color={B.green}  dark={dark}/>
      </div>

      <Section title="Subject Grades" subtitle="Latest performance per subject" icon={BarChart3} dark={dark}
        action={<button onClick={() => csvDownload((dash.marks?.latest_by_subject||[]).map(r=>[r.subject_name,r.percent+'%']),['Subject','Percent'],'grades.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> CSV</button>}>
        <div style={{ display:'grid', gap:10 }}>
          {(dash.marks?.latest_by_subject||[]).map((r,i) => (
            <ProgressBar key={i} label={String(r.subject_name||`Subject ${i+1}`)} value={Number(r.percent||0)} color={Number(r.percent||0) >= 70 ? B.green : Number(r.percent||0) >= 50 ? B.amber : B.red} dark={dark}/>
          ))}
          {(dash.marks?.latest_by_subject||[]).length === 0 && <p style={{ margin:0, color:sub, fontSize:12 }}>No marks available.</p>}
        </div>
      </Section>

      <Section title="Class Timetable" subtitle="Your weekly schedule with teachers" icon={Calendar} dark={dark}>
        <DataTable dark={dark}
          columns={['Day','Start','End','Subject','Teacher','Room']}
          rows={(dash.marks?.timetable||[]).map(r => [
            r.day_of_week||'—', r.start_time||'—', r.end_time||'—',
            <strong key="s" style={{ color: dark?'#fff':B.navy }}>{r.subject_name||'—'}</strong>,
            r.teacher_name||'Not assigned', r.room||'—',
          ])}
          emptyText="No timetable configured for your class."
        />
      </Section>
    </>
  );

  /* ─────────────────── PAGE: DISCIPLINE ─────────────────── */
  const PageDiscipline = () => {
    const grade = dash.discipline?.behavior_grade||'A';
    const color = bgradeColor(grade);
    return (
      <>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginTop:14 }}>
          <StatCard icon={Shield}  label="Score"      value={`${discScore}/40`}   color={color}  dark={dark}/>
          <StatCard icon={Award}   label="Grade"      value={grade}                color={color}  dark={dark}/>
          <StatCard icon={Target}  label="Positives"  value={String(dash.discipline?.positive_events||0)} color={B.green}  dark={dark}/>
          <StatCard icon={AlertTriangle} label="Negatives" value={String(dash.discipline?.negative_events||0)} color={B.red} dark={dark}/>
        </div>

        {discScore < 20 && <Banner type="error" text="⚠ Your discipline score is critically low. Please speak with your class teacher immediately."/>}
        {discScore >= 20 && discScore < 28 && <Banner type="warn" text="Your discipline score needs improvement. Review your recent incidents below."/>}

        <Section title="Behavior Summary" icon={Shield} dark={dark}>
          <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <Ring value={Math.round((discScore/40)*100)} size={110} color={color} dark={dark} label="Score"/>
            <div>
              <p style={{ margin:0, fontSize:40, fontWeight:900, color, lineHeight:1 }}>{grade}</p>
              <p style={{ margin:'4px 0 0', fontSize:15, color:txt, fontWeight:700 }}>
                {discScore >= 35 ? '🌟 Excellent Behavior'
                 : discScore >= 28 ? '✅ Good'
                 : discScore >= 20 ? '⚠ Needs Improvement'
                 : '🚨 Critical — Immediate Action Required'}
              </p>
              <ProgressBar value={Math.round((discScore/40)*100)} color={color} dark={dark} height={10} showPct={false}/>
            </div>
          </div>
        </Section>

        <Section title="Discipline History" subtitle="All mark changes" icon={Activity} dark={dark}
          action={<button onClick={() => csvDownload((dash.discipline?.mark_logs||[]).map(r=>[fmtDate(r.action_date||r.created_at),r.action||'—',r.marks||0,r.reason||'—',r.notes||'—']),['Date','Action','Marks','Reason','Notes'],'discipline.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> CSV</button>}>
          <DataTable dark={dark}
            columns={['Date','Action','Marks','Reason','Notes']}
            rows={(dash.discipline?.mark_logs||[]).slice(0,150).map(r => [
              fmtDate(r.action_date||r.created_at),
              <Badge key="a" text={String(r.action||'—').toUpperCase()} color={String(r.action||'').toLowerCase()==='add' ? B.green : B.red}/>,
              <strong key="m" style={{ color: Number(r.marks||0) > 0 ? B.green : B.red }}>{r.marks > 0 ? `+${r.marks}` : r.marks}</strong>,
              r.reason||'—', r.notes||'—',
            ])}
            emptyText="No discipline records."
          />
        </Section>
      </>
    );
  };

  /* ─────────────────── PAGE: FEES ─────────────────── */
  const PageFees = () => (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginTop:14 }}>
        <StatCard icon={Wallet}      label="Total Due"  value={fmtMoney(dash.fees?.total_due)}  color={B.navy}  dark={dark}/>
        <StatCard icon={CheckCircle2}label="Paid"       value={fmtMoney(dash.fees?.total_paid)} color={B.green} dark={dark}/>
        <StatCard icon={AlertTriangle} label="Balance"  value={fmtMoney(dash.fees?.balance)} color={dash.fees?.balance>0?B.orange:B.green} dark={dark}/>
        <StatCard icon={TrendingUp}  label="% Paid"     value={`${feesPct}%`} color={B.amber}  dark={dark}/>
      </div>

      {dash.fees?.balance > 0 && (
        <Banner type="warn" text={`Payment reminder: You still owe ${fmtMoney(dash.fees.balance)}. Please contact the bursar's office.`}/>
      )}

      {/* Payment progress */}
      <Section title="Payment Progress" subtitle="How much of your fees have been cleared" icon={TrendingUp} dark={dark}>
        <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          <Ring value={feesPct} size={110} color={feesPct>=100?B.green:B.amber} dark={dark} label="Paid"/>
          <div style={{ flex:1, minWidth:200 }}>
            <ProgressBar value={feesPct} color={feesPct>=100?B.green:B.amber} height={14} dark={dark} label={`${fmtMoney(dash.fees?.total_paid)} of ${fmtMoney(dash.fees?.total_due)}`}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
              {payTrend.length >= 2 && (
                <div style={{ padding:'12px', borderRadius:12, background:`${B.amber}10`, border:`1px solid ${B.amber}25` }}>
                  <p style={{ margin:'0 0 4px', fontSize:10, color:sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Payment Trend</p>
                  <Sparkline data={payTrend} color={B.amber} height={42} width={100}/>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Transaction history */}
      <Section title="Payment History" subtitle="All fee transactions" icon={CreditCard} dark={dark}
        action={<button onClick={() => csvDownload((dash.fees?.transactions||dash.fees?.payments||[]).map(r=>[fmtDate(r.created_at),r.academic_year||'—',r.term||'—',r.class_name||'—',fmtMoney(r.total_due),fmtMoney(r.amount_paid),fmtMoney(r.balance_remaining),r.notes||'—']),['Date','Year','Term','Class','Due','Paid','Balance','Notes'],'fees.csv')} style={{ height:32, borderRadius:9, border:`1px solid ${panelBdr}`, background:'transparent', color:sub, fontSize:10, cursor:'pointer', padding:'0 10px', display:'flex', alignItems:'center', gap:5, fontFamily:'Montserrat,sans-serif' }}><Download size={11}/> CSV</button>}>
        <DataTable dark={dark}
          columns={['Date','Year','Term','Class','Due','Paid','Balance','Notes']}
          rows={(dash.fees?.transactions||dash.fees?.payments||[]).slice(0,200).map(r => [
            fmtDate(r.created_at), r.academic_year||'—', r.term||'—', r.class_name||'—',
            fmtMoney(r.total_due),
            <span key="p" style={{ color:B.green, fontWeight:700 }}>{fmtMoney(r.amount_paid)}</span>,
            <span key="b" style={{ color: Number(r.balance_remaining)>0?B.orange:B.green, fontWeight:700 }}>{fmtMoney(r.balance_remaining)}</span>,
            r.notes||'—',
          ])}
          emptyText="No transactions found."
        />
      </Section>
    </>
  );

  /* ─────────────────── PAGE: TIMETABLE ─────────────────── */
  const PageTimetable = () => {
    const now      = currentNow;
    const today    = now.toLocaleDateString('en-GB', { weekday:'long' });
    const selDay = TIMETABLE_DAYS.includes(timetableSelDay) ? timetableSelDay : today;
    const viewMode = timetableViewMode;
    const DAYS = TIMETABLE_DAYS;
    const timetableRows = dash.marks?.timetable || [];
    const filtered = timetableRows.filter(r => r.day_of_week === selDay);
    const hasData = timetableRows.length > 0;

    const currentPeriod = timetableRows.find(r => {
      if (!r.start_time || !r.end_time) return false;
      if (String(r.day_of_week || '').toLowerCase() !== String(today || '').toLowerCase()) return false;
      const [sh,sm] = r.start_time.split(':').map(Number);
      const [eh,em] = r.end_time.split(':').map(Number);
      const cur = now.getHours()*60 + now.getMinutes();
      return cur >= sh*60+sm && cur <= eh*60+em;
    });

    const allTimeRanges = useMemo(() => {
      const uniq = Array.from(new Set(timetableRows
        .map(r => `${r.start_time || '—'}-${r.end_time || '—'}`)))
        .filter(v => v !== '—-—')
        .sort((a, b) => {
          const [aStart] = a.split('-');
          const [bStart] = b.split('-');
          return String(aStart).localeCompare(String(bStart));
        });
      return uniq;
    }, [timetableRows]);

    const timetableMap = useMemo(() => {
      const m = new Map();
      timetableRows.forEach((r) => {
        const key = `${r.day_of_week}__${r.start_time || '—'}-${r.end_time || '—'}`;
        m.set(key, r);
      });
      return m;
    }, [timetableRows]);

    const subjectLegend = useMemo(() => {
      const names = Array.from(new Set(timetableRows.map((r) => String(r.subject_name || '').trim()).filter(Boolean)));
      return names.sort((a, b) => a.localeCompare(b)).slice(0, 12);
    }, [timetableRows]);

    return (
      <>
        <div style={{ marginTop:14, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => setTimetableViewMode('day')} style={{ height:34, borderRadius:10, border:`1px solid ${viewMode==='day'?B.amber:panelBdr}`, background:viewMode==='day'?`${B.amber}20`:'transparent', color:viewMode==='day'?B.amber:txt, fontWeight:700, fontSize:11, padding:'0 12px', cursor:'pointer', fontFamily:'Montserrat,sans-serif' }}>Day View</button>
            <button onClick={() => setTimetableViewMode('week')} style={{ height:34, borderRadius:10, border:`1px solid ${viewMode==='week'?B.amber:panelBdr}`, background:viewMode==='week'?`${B.amber}20`:'transparent', color:viewMode==='week'?B.amber:txt, fontWeight:700, fontSize:11, padding:'0 12px', cursor:'pointer', fontFamily:'Montserrat,sans-serif' }}>Week Grid</button>
          </div>
          <p style={{ margin:0, alignSelf:'center', fontSize:11, color:sub, fontWeight:600 }}>Teacher names and rooms are shown in all views</p>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:14 }}>
          {DAYS.map(d => (
            <button key={d} onClick={() => setTimetableSelDay(d)} style={{ height:36, borderRadius:10, border:`1px solid ${selDay===d?B.amber:panelBdr}`, background: selDay===d?B.amber:'transparent', color: selDay===d?B.navy:txt, fontWeight:700, fontSize:11, cursor:'pointer', padding:'0 14px', transition:'all 0.15s', fontFamily:'Montserrat,sans-serif' }}>
              {d.slice(0,3)}
              {d === today && <span style={{ marginLeft:4, fontSize:8, background:B.navy, color:B.amber, borderRadius:4, padding:'1px 4px' }}>TODAY</span>}
            </button>
          ))}
        </div>

        {currentPeriod && (
          <div style={{ marginTop:14, padding:'14px 18px', borderRadius:14, background:`linear-gradient(135deg,${B.amber}20,${B.amber}08)`, border:`1px solid ${B.amber}40`, display:'flex', alignItems:'center', gap:12 }}>
            <ZapIcon size={18} color={B.amber}/>
            <div>
              <p style={{ margin:0, fontSize:11, color:B.amber, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Currently in session</p>
              <p style={{ margin:'2px 0 0', fontSize:15, fontWeight:900, color:txt }}>{currentPeriod.subject_name} — {currentPeriod.start_time} to {currentPeriod.end_time}</p>
              <p style={{ margin:'2px 0 0', fontSize:12, color:sub }}>{currentPeriod.teacher_name||'Teacher not assigned'} · Room {currentPeriod.room||'TBD'}</p>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div style={{ display:'grid', gap:10, marginTop:14 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:sub }}>
                <Calendar size={32} style={{ margin:'0 auto 10px', opacity:0.3 }}/>
                <p style={{ margin:0 }}>No classes scheduled for {selDay}</p>
              </div>
            ) : filtered.map((r, i) => {
              const isCurrent = r === currentPeriod;
              const palette = timetablePaletteForSubject(r.subject_name);
              return (
                <div key={i} style={{ padding:'14px 18px', borderRadius:14, border:`1px solid ${isCurrent ? B.amber : palette.border}`, background: isCurrent ? `${B.amber}10` : palette.bg, display:'grid', gridTemplateColumns: mobile ? '1fr' : '78px 1fr auto', gap:12, alignItems:'center', transition:'border-color 0.2s' }}>
                  <div style={{ textAlign: mobile ? 'left' : 'center' }}>
                    <p style={{ margin:0, fontSize:11, fontWeight:800, color:isCurrent?B.amber:sub }}>{r.start_time||'—'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:10, color:sub }}>{r.end_time||'—'}</p>
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:800, fontSize:14, color:isCurrent?B.amber:palette.title }}>{r.subject_name||'—'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:palette.meta }}>{r.teacher_name||'Not assigned'} · Room {r.room||'TBD'}</p>
                  </div>
                  {isCurrent && <span style={{ justifySelf: mobile ? 'flex-start' : 'end', fontSize:9, fontWeight:800, color:B.amber, textTransform:'uppercase', letterSpacing:'0.1em', background:`${B.amber}20`, padding:'4px 10px', borderRadius:999 }}>Live</span>}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'week' && (
          <div style={{ marginTop:14 }}>
            {!hasData ? (
              <div style={{ textAlign:'center', padding:'40px', color:sub }}>
                <Calendar size={32} style={{ margin:'0 auto 10px', opacity:0.3 }}/>
                <p style={{ margin:0 }}>No timetable configured for your class yet.</p>
              </div>
            ) : (
              <div style={{ overflow:'auto', maxHeight: mobile ? 440 : 540, border:`1px solid ${panelBdr}`, borderRadius:14 }}>
                <div style={{ minWidth: mobile ? 780 : 920, display:'grid', gridTemplateColumns:'110px repeat(6, minmax(110px, 1fr))', background:dark?'rgba(255,255,255,0.02)':B.offWhite }}>
                  <div style={{ position:'sticky', top:0, left:0, zIndex:4, padding:'10px 8px', borderRight:`1px solid ${panelBdr}`, borderBottom:`1px solid ${panelBdr}`, fontSize:10, fontWeight:800, color:sub, textTransform:'uppercase', letterSpacing:'0.08em', background: dark ? '#0b1638' : '#f8fafc' }}>Time</div>
                  {DAYS.map((d) => (
                    <div key={d} style={{ position:'sticky', top:0, zIndex:3, padding:'10px 8px', borderRight:`1px solid ${panelBdr}`, borderBottom:`1px solid ${panelBdr}`, fontSize:10, fontWeight:800, color:d===today?B.amber:txt, textTransform:'uppercase', letterSpacing:'0.08em', background:d===today?(dark ? '#33280a' : '#fef3c7'):(dark ? '#0b1638' : '#f8fafc') }}>{d}</div>
                  ))}
                  {allTimeRanges.map((slot) => {
                    const [start, end] = slot.split('-');
                    return (
                      <React.Fragment key={slot}>
                        <div style={{ position:'sticky', left:0, zIndex:2, padding:'10px 8px', borderRight:`1px solid ${panelBdr}`, borderBottom:`1px solid ${panelBdr}`, fontSize:11, color:txt, background:dark ? '#08112e' : '#ffffff' }}>
                          <p style={{ margin:0, fontWeight:800 }}>{start}</p>
                          <p style={{ margin:'2px 0 0', color:sub, fontSize:10 }}>{end}</p>
                        </div>
                        {DAYS.map((d) => {
                          const item = timetableMap.get(`${d}__${slot}`);
                          const isCurrent = currentPeriod && item && item.day_of_week === currentPeriod.day_of_week && item.start_time === currentPeriod.start_time && item.end_time === currentPeriod.end_time;
                          const palette = item ? timetablePaletteForSubject(item.subject_name) : null;
                          return (
                            <div key={`${d}-${slot}`} style={{ padding:'8px', borderRight:`1px solid ${panelBdr}`, borderBottom:`1px solid ${panelBdr}`, minHeight:86, background:isCurrent?`${B.amber}14`:(item ? palette.bg : 'transparent') }}>
                              {item ? (
                                <>
                                  <p style={{ margin:0, fontSize:12, fontWeight:800, color:isCurrent?B.amber:palette.title }}>{item.subject_name||'Subject'}</p>
                                  <p style={{ margin:'3px 0 0', fontSize:10, color:palette.meta }}>{item.teacher_name||'Teacher pending'}</p>
                                  <p style={{ margin:'2px 0 0', fontSize:10, color:palette.meta }}>Room {item.room||'TBD'}</p>
                                </>
                              ) : (
                                <p style={{ margin:0, fontSize:10, color:sub }}>—</p>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {subjectLegend.length > 0 && (
          <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, border:`1px solid ${panelBdr}`, background:dark?'rgba(255,255,255,0.02)':'#ffffff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <p style={{ margin:0, fontSize:10, fontWeight:800, color:sub, textTransform:'uppercase', letterSpacing:'0.08em' }}>Course Color Legend</p>
              <p style={{ margin:0, fontSize:10, color:sub, fontWeight:700 }}>{subjectLegend.length} courses</p>
            </div>
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:8 }}>
              {subjectLegend.map((subject) => {
                const palette = timetablePaletteForSubject(subject);
                return (
                  <span key={subject} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 9px', borderRadius:999, border:`1px solid ${palette.border}`, background:palette.bg, color:palette.title, fontSize:11, fontWeight:700 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:palette.title }} />
                    {subject}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {subjectLegend.length > 0 && (
          <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, border:`1px solid ${panelBdr}`, background:dark?'rgba(255,255,255,0.02)':'#ffffff' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <p style={{ margin:0, fontSize:10, fontWeight:800, color:sub, textTransform:'uppercase', letterSpacing:'0.08em' }}>Course Color Legend</p>
              <p style={{ margin:0, fontSize:10, color:sub, fontWeight:700 }}>{subjectLegend.length} courses</p>
            </div>
            <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:8 }}>
              {subjectLegend.map((subject) => {
                const palette = timetablePaletteForSubject(subject);
                return (
                  <span key={subject} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 9px', borderRadius:999, border:`1px solid ${palette.border}`, background:palette.bg, color:palette.title, fontSize:11, fontWeight:700 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:palette.title }} />
                    {subject}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  /* ─────────────────── PAGE: PROFILE ─────────────────── */
  const PageProfile = () => {
    const p = dash.profile || {};
    return (
      <Section title="Student Profile" icon={UserCircle2} dark={dark}>
        <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : '160px 1fr', gap:24, alignItems:'start' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:120, height:120, borderRadius:'50%', background:`linear-gradient(135deg,${B.navy},${B.navyLight})`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', border:`3px solid ${B.amber}` }}>
              <UserCircle2 size={60} color={B.amber}/>
            </div>
            <p style={{ margin:'10px 0 0', fontWeight:900, fontSize:15, color:txt }}>{p.full_name||user.full_name||'—'}</p>
            <Badge text={p.class_name||'Class N/A'} color={B.blue}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
            {[
              { label:'Student ID',    value: p.student_id||'—',             icon:UserCircle2 },
              { label:'Full Name',     value: p.full_name||user.full_name||'—', icon:UserCircle2 },
              { label:'School',        value: p.school_name||user?.school?.name||'—', icon:BookOpen },
              { label:'Class',         value: p.class_name||'—',             icon:GraduationCap },
              { label:'Stream',        value: p.stream||'—',                 icon:Target },
              { label:'Academic Year', value: dash.filters?.academic_year||'—', icon:Calendar },
            ].map(({ label, value, icon:Icon2 }) => (
              <div key={label} style={{ padding:'12px 14px', borderRadius:12, border:`1px solid ${panelBdr}`, background: dark?'rgba(255,255,255,0.03)':B.offWhite }}>
                <p style={{ margin:0, fontSize:10, color:sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</p>
                <p style={{ margin:'4px 0 0', fontSize:13, fontWeight:800, color:txt }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  };

  /* ─────────────────── PAGE: CHAT ─────────────────── */
  const PageChat = () => <StudentChat />;

  /* ─────────────────── PAGE: SECURITY ─────────────────── */
  const PageSecurity = () => (
    <Section title="Change Password" subtitle="Keep your account secure" icon={KeyRound} dark={dark}>
      {mustChange && <Banner type="warn" text="First login detected. Please set your own private password now."/>}
      {pwdError   && <Banner type="error" text={pwdError}/>}
      {pwdSuccess && <Banner type="success" text={pwdSuccess}/>}
      <form onSubmit={changePwd} style={{ display:'grid', gap:12, maxWidth:400 }}>
        {['currentPassword','newPassword','confirmPassword'].map(k => (
          <input key={k} type="password" value={pwdForm[k]} onChange={e => setPwdForm(p=>({...p,[k]:e.target.value}))}
            placeholder={{ currentPassword:'Current password', newPassword:'New password (min 8)', confirmPassword:'Confirm new password' }[k]}
            style={{ height:44, borderRadius:12, border:`1px solid ${panelBdr}`, background: dark?'rgba(255,255,255,0.05)':B.offWhite, color:txt, padding:'0 14px', fontSize:14, outline:'none', fontFamily:'Montserrat,sans-serif' }}/>
        ))}
        <button type="submit" disabled={pwdLoading} style={{ height:44, borderRadius:12, border:'none', background:B.navy, color:B.amber, fontWeight:900, fontSize:14, cursor:'pointer', fontFamily:'Montserrat,sans-serif', letterSpacing:'0.03em' }}>
          {pwdLoading ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </Section>
  );

  /* ─────────────────── RENDER ─────────────────── */
  const pageContent = {
    dashboard:  PageDashboard(),
    attendance: PageAttendance(),
    academics:  PageAcademics(),
    discipline: PageDiscipline(),
    fees:       PageFees(),
    timetable:  PageTimetable(),
    chat:       PageChat(),
    profile:    PageProfile(),
    security:   PageSecurity(),
  };

  return (
    <div style={{ minHeight:'100vh', background:pageBg, color:txt, paddingBottom: mobile ? 80 : 0, fontFamily:"'Montserrat', 'Segoe UI', sans-serif", position:'relative', zIndex:1200, isolation:'isolate' }}>
      <div style={{ maxWidth:1380, margin:'0 auto', display:'grid', gridTemplateColumns: mobile ? '1fr' : '248px 1fr', gap:12, padding:'12px 12px 12px' }}>

        {/* ─── SIDEBAR ─── */}
        {!mobile && (
          <aside style={{ background:panelBg, border:`1px solid ${panelBdr}`, borderRadius:20, padding:'16px', height:'calc(100vh - 24px)', position:'sticky', top:12, display:'flex', flexDirection:'column', gap:6 }}>
            {/* Profile block */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 4px 14px', borderBottom:`1px solid ${panelBdr}`, marginBottom:4 }}>
              <div style={{ width:42, height:42, borderRadius:14, background:`linear-gradient(135deg,${B.navy},${B.navyLight})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`2px solid ${B.amber}40` }}>
                <UserCircle2 size={22} color={B.amber}/>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ margin:0, fontWeight:900, fontSize:13, color:txt, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dash.profile?.full_name||user.full_name||'Student'}</p>
                <p style={{ margin:0, color:sub, fontSize:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dash.profile?.school_name||user?.school?.name||'School'}</p>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex:1, display:'grid', gap:4, alignContent:'start', overflowY:'auto' }}>
              {NAV.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setPage(id)} style={{
                  border: page===id ? 'none' : `1px solid transparent`,
                  background: page===id ? B.navy : 'transparent',
                  color: page===id ? B.amber : txt,
                  borderRadius:12, minHeight:40, padding:'0 12px',
                  fontWeight: page===id ? 800 : 600,
                  fontSize:13, display:'flex', alignItems:'center', gap:10,
                  cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                  fontFamily:"'Montserrat', sans-serif",
                  boxShadow: page===id ? `0 4px 16px ${B.navy}60` : 'none',
                }}
                onMouseEnter={e => { if(page!==id){ e.currentTarget.style.background=dark?'rgba(255,255,255,0.04)':B.slate100; }}}
                onMouseLeave={e => { if(page!==id){ e.currentTarget.style.background='transparent'; }}}>
                  <Icon size={16}/>
                  {label}
                  {id==='chat' && dash.messages?.unread_count > 0 && (
                    <span style={{ marginLeft:'auto', fontSize:9, background:B.amber, color:B.navy, borderRadius:999, padding:'1px 7px', fontWeight:900 }}>{dash.messages.unread_count}</span>
                  )}
                </button>
              ))}
            </nav>

            <div style={{ display:'grid', gap:6, paddingTop:10, borderTop:`1px solid ${panelBdr}` }}>
              <button onClick={() => setDark(d=>!d)} style={{ border:`1px solid ${panelBdr}`, background:'transparent', color:txt, borderRadius:11, minHeight:36, padding:'0 12px', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:"'Montserrat', sans-serif" }}>
                {dark ? <Sun size={14}/> : <Moon size={14}/>} {dark ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={logout} style={{ border:'none', background:'#dc2626', color:'#fff', borderRadius:11, minHeight:36, padding:'0 12px', fontWeight:800, fontSize:12, display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontFamily:"'Montserrat', sans-serif" }}>
                <LogOut size={14}/> Logout
              </button>
            </div>
          </aside>
        )}

        {/* ─── MAIN ─── */}
        <main style={{ minWidth:0 }}>
          {/* Topbar */}
          <div style={{ background:`linear-gradient(135deg,${B.navy},${B.navyMid})`, borderRadius:18, padding: mobile ? '14px 16px' : '16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', boxShadow:`0 8px 32px ${B.navy}60` }}>
            <div>
              <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Student Portal</p>
              <h1 style={{ margin:'2px 0 0', fontSize: mobile ? 16 : 20, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>
                {NAV.find(n=>n.id===page)?.label||'Dashboard'}
              </h1>
              <p style={{ margin:'3px 0 0', fontSize:11, color:'rgba(255,255,255,0.6)' }}>
                {currentNow.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})} · Class {dash.profile?.class_name||'—'}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Notification bell */}
              <div style={{ position:'relative' }} ref={notifPanelRef}>
                <button onClick={() => setShowNotifPanel(p=>!p)} style={{ width:40, height:40, borderRadius:12, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.07)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}>
                  <Bell size={16}/>
                  {notifs.length > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:B.amber, color:B.navy, fontSize:8, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>{notifs.length}</span>}
                </button>
                {showNotifPanel && (
                  <div style={{ position:'absolute', top:48, right:0, width:300, borderRadius:16, background: dark?B.slate800:B.white, border:`1px solid ${panelBdr}`, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', zIndex:100, overflow:'hidden' }}>
                    <div style={{ padding:'12px 16px', borderBottom:`1px solid ${panelBdr}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <p style={{ margin:0, fontWeight:900, fontSize:12, color:txt }}>Notifications</p>
                      <button onClick={() => setShowNotifPanel(false)} style={{ border:'none', background:'transparent', color:sub, cursor:'pointer' }}><X size={13}/></button>
                    </div>
                    {notifs.length === 0 ? (
                      <p style={{ margin:0, padding:'16px', fontSize:12, color:sub, textAlign:'center' }}>All clear! No alerts.</p>
                    ) : notifs.map(n => (
                      <div key={n.id} style={{ padding:'10px 16px', borderBottom:`1px solid ${panelBdr}`, display:'flex', gap:10, alignItems:'flex-start' }}>
                        <AlertTriangle size={13} color={n.type==='error'?B.red:B.amber} style={{ marginTop:1, flexShrink:0 }}/>
                        <p style={{ margin:0, fontSize:12, color:txt, flex:1 }}>{n.msg}</p>
                        <button onClick={() => setNotifs(p=>p.filter(x=>x.id!==n.id))} style={{ border:'none', background:'transparent', color:sub, cursor:'pointer', padding:0, flexShrink:0 }}><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Ring */}
              <Ring value={avgGrade} size={mobile?60:72} stroke={6} color={B.amber} bg="rgba(255,255,255,0.12)" dark/>
            </div>
          </div>

          {/* Mobile mode/logout row */}
          {mobile && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
              <button onClick={() => setDark(d=>!d)} style={{ border:`1px solid ${panelBdr}`, background:panelBg, color:txt, borderRadius:11, minHeight:38, fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer', fontFamily:"'Montserrat',sans-serif" }}>
                {dark ? <Sun size={14}/> : <Moon size={14}/>} {dark?'Light':'Dark'}
              </button>
              <button onClick={logout} style={{ border:'none', background:'#dc2626', color:'#fff', borderRadius:11, minHeight:38, fontWeight:800, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer', fontFamily:"'Montserrat',sans-serif" }}>
                <LogOut size={14}/> Logout
              </button>
            </div>
          )}

          <FilterBar/>

          {loading && <Banner type="info" text="Loading your latest data…"/>}
          {error   && <Banner type="error" text={error}/>}

          {pageContent[page] || null}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─── */}
      {mobile && (
        <>
          <button onClick={() => setPage('chat')} style={{ position:'fixed', right:14, bottom:84, width:52, height:52, borderRadius:'50%', border:'none', background:B.navy, color:B.amber, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 8px 24px ${B.navy}80`, zIndex:60, cursor:'pointer' }}>
            <MessageSquare size={20}/>
            {dash.messages?.unread_count > 0 && <span style={{ position:'absolute', top:-2, right:-2, width:16, height:16, borderRadius:'50%', background:B.amber, color:B.navy, fontSize:8, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>{dash.messages.unread_count}</span>}
          </button>
          <div style={{ position:'fixed', left:0, right:0, bottom:0, background: dark?'rgba(6,13,36,0.98)':'rgba(255,255,255,0.98)', borderTop:`1px solid ${panelBdr}`, display:'grid', gridTemplateColumns:'repeat(5,1fr)', padding:'6px 8px', paddingBottom:`calc(6px + env(safe-area-inset-bottom, 0px))`, gap:4, zIndex:55, backdropFilter:'blur(12px)' }}>
            {MOB_NAV.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setPage(id)} style={{ border:'none', background: page===id ? `${B.amber}18` : 'transparent', color: page===id ? B.amber : sub, borderRadius:12, minHeight:54, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, fontSize:10, fontWeight: page===id?900:600, cursor:'pointer', fontFamily:"'Montserrat',sans-serif", transition:'all 0.15s' }}>
                <Icon size={16}/>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}



      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${B.amber}40; border-radius: 2px; }
        select option { background: ${dark ? '#060d24' : '#fff'}; color: ${txt}; }
        @media (max-width: 480px) {
          h1 { font-size: 15px !important; }
        }
      `}</style>
    </div>
  );
}