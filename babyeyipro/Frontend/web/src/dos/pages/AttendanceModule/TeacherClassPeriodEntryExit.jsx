import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart2, Bell, BookOpen, Calendar,
  CheckCircle2, CheckSquare, ChevronDown, Clock, Filter, Home, Loader2,
  Radio, RefreshCw, Search, Share2, Shield, Square, Trash2, TrendingDown, TrendingUp,
  User, Users, X, XCircle, Zap, ScanLine, Eye, Download,
  ArrowRight, Layers, Hash, MapPin, ChevronRight
} from "lucide-react";
import api from "../../services/api";
import DosOrangePageHero from "../../components/DosOrangePageHero";

const NAVY = "#000435";
const AMBER = "#f59e0b";
const AMBER_DARK = "#d97706";
const DEFAULT_LATE_MINUTES = 10;

function getNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getToday() {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return days[new Date().getDay()];
}

function timeToMins(t) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function buildDaySummary(timetable, logs) {
  const nowMins = timeToMins(getNow());
  let on_time = 0;
  let late = 0;
  let missed = 0;
  let early_exit = 0;
  const slotKey = (teacherId, className, startTime) => `${teacherId}|${className}|${startTime}`;
  const logMap = new Map(logs.map((l) => [slotKey(l.teacher_id, l.class, l.start_time), l]));

  for (const slot of timetable) {
    const log = logMap.get(slotKey(slot.teacher_id, slot.class, slot.start_time));
    const endM = timeToMins(slot.end_time);
    if (log) {
      if (log.status === "late") late += 1;
      else if (log.status === "on_time") on_time += 1;
      if (log.exit_status === "before") early_exit += 1;
    } else if (nowMins > endM) {
      missed += 1;
    }
  }

  return { on_time, late, missed, early_exit, total: timetable.length };
}

function fmt12(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h % 12) || 12)}:${String(m).padStart(2, "0")} ${ampm}`;
}

/* ── AVATAR INITIAL ── */
function Avatar({ name, size = 36, accent = AMBER }) {
  const initials = name ? name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase() : "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `linear-gradient(135deg, ${accent}cc, ${accent})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 900, color: "#fff",
      flexShrink: 0, letterSpacing: "-0.5px",
      boxShadow: `0 2px 8px ${accent}44`,
    }}>{initials}</div>
  );
}

/* ── STATUS BADGE ── */
function StatusBadge({ status, size = "sm" }) {
  const cfg = {
    on_time: { bg: "#ecfdf5", color: "#065f46", border: "#6ee7b7", label: "On Time",     Icon: CheckCircle2 },
    late:    { bg: "#fffbeb", color: "#92400e", border: "#fde68a", label: "Late",         Icon: Clock },
    before:  { bg: "#eef2ff", color: "#3730a3", border: "#c7d2fe", label: "Early Exit",   Icon: TrendingDown },
    missed:  { bg: "#fff1f2", color: "#be123c", border: "#fecaca", label: "Missed",       Icon: XCircle },
  };
  const c = cfg[status] || cfg.missed;
  const Icon = c.Icon;
  const pad = size === "lg" ? "6px 14px" : "3px 10px";
  const fs  = size === "lg" ? 13 : 11;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:c.bg, color:c.color, border:`1.5px solid ${c.border}`, borderRadius:99, padding:pad, fontSize:fs, fontWeight:700, whiteSpace:"nowrap" }}>
      <Icon size={size === "lg" ? 14 : 11} />{c.label}
    </span>
  );
}

function ModeBadge({ source }) {
  const isDevice = String(source || "").toUpperCase().startsWith("CLASSATT_");
  return (
    <span style={{ display:"inline-flex", alignItems:"center", borderRadius:99, padding:"2px 8px", fontSize:10, fontWeight:800, border:`1.5px solid ${isDevice?"#c7d2fe":"#e5e7eb"}`, background:isDevice?"#eef2ff":"#f9fafb", color:isDevice?"#4338ca":"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em" }}>
      {isDevice?"DEVICE":"Manual"}
    </span>
  );
}

/* ── STAT CARD ── */
function StatCard({ icon: Icon, label, value, sub, accent, animate, idx = 0 }) {
  return (
    <div style={{
      background:"#fff", borderRadius:20, padding:"20px 22px",
      border:`1.5px solid ${accent}18`,
      boxShadow:`0 4px 20px ${accent}0d`,
      animation: animate ? `tpFadeUp 0.4s ease ${idx*0.07}s both` : undefined,
      position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`${accent}08`, pointerEvents:"none" }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:800, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.09em", lineHeight:1.4 }}>{label}</span>
        <div style={{ width:36, height:36, borderRadius:12, background:`${accent}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={17} color={accent} />
        </div>
      </div>
      <p style={{ fontSize:36, fontWeight:900, color:NAVY, margin:0, fontFamily:"'DM Mono', monospace", lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:"#9ca3af", margin:"8px 0 0", fontWeight:600 }}>{sub}</p>}
    </div>
  );
}

/* ── ALERT TOAST ── */
function AlertToast({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:10, maxWidth:340, pointerEvents:"none" }}>
      {alerts.map((a) => (
        <div key={a.id} style={{
          pointerEvents:"all",
          background:a.type==="late"?"#fffbeb":"#fff1f2",
          border:`1.5px solid ${a.type==="late"?"#fde68a":"#fecaca"}`,
          borderRadius:16, padding:"14px 16px",
          boxShadow:"0 10px 40px rgba(0,4,53,0.16)",
          display:"flex", alignItems:"flex-start", gap:12,
          animation:"tpSlideRight 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ width:34,height:34,borderRadius:10,background:a.type==="late"?"#fef3c7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            {a.type==="late"?<Clock size={16} color={AMBER_DARK}/>:<AlertTriangle size={16} color="#dc2626"/>}
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:800, fontSize:13, color:NAVY, margin:0 }}>{a.title}</p>
            <p style={{ fontSize:12, color:"#6b7280", margin:"3px 0 0" }}>{a.message}</p>
          </div>
          <button onClick={()=>onDismiss(a.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:0,display:"flex" }}>
            <X size={15} color="#9ca3af"/>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── SCAN PULSE ── */
function ScanPulse({ result }) {
  if (!result) return null;
  const cfg = {
    on_time:   { color:"#10b981", bg:"#ecfdf5", border:"#6ee7b7", icon:CheckCircle2, label:"Entry Recorded",      sub:"On Time ✓" },
    late:      { color:AMBER_DARK, bg:"#fffbeb", border:"#fde68a", icon:Clock,        label:"Late Entry",           sub:`${result.late_mins||0} min late ⚠️` },
    exit:      { color:"#6366f1", bg:"#eef2ff", border:"#c7d2fe", icon:Zap,           label:"Exit Recorded",         sub:"Period closed ✓" },
    before:    { color:"#4338ca", bg:"#eef2ff", border:"#c7d2fe", icon:TrendingDown,  label:"Early Exit",            sub:"Left before period ended" },
    duplicate: { color:"#dc2626", bg:"#fff1f2", border:"#fecaca", icon:AlertTriangle, label:"Attendance Closed",    sub:"All attendance done for this period" },
    missed:    { color:"#dc2626", bg:"#fff1f2", border:"#fecaca", icon:XCircle,       label:"No Period Found",       sub:"Not in timetable" },
  };
  const c = cfg[result.type] || cfg.missed;
  const Icon = c.icon;
  const todaySlots = result.today_slots || [];
  const missedSub = result.type === "missed" && todaySlots.length > 0
    ? `No period right now (${result.day || ""} ${result.time || ""})`
    : result.type === "missed" && result.day
      ? `No timetable for ${result.day}`
      : c.sub;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16, padding:"24px 0", animation:"tpPop 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <div style={{ position:"relative" }}>
        <div style={{ width:88,height:88,borderRadius:"50%",background:c.bg,border:`3px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon size={38} color={c.color}/>
        </div>
        <div style={{ position:"absolute",inset:-8,borderRadius:"50%",border:`2px solid ${c.color}`,opacity:0.3,animation:"tpRipple 1s ease-out forwards" }}/>
      </div>
      <div style={{ textAlign:"center" }}>
        <p style={{ fontSize:20,fontWeight:900,color:NAVY,margin:0 }}>{c.label}</p>
        <p style={{ fontSize:14,color:"#6b7280",margin:"4px 0 0" }}>{result.type === "missed" ? missedSub : c.sub}</p>
        {result.teacher&&<p style={{ fontSize:15,fontWeight:700,color:c.color,margin:"8px 0 0" }}>{result.teacher}</p>}
        {result.class&&<p style={{ fontSize:13,color:"#9ca3af",margin:"2px 0 0" }}>{result.class} · {result.subject}</p>}
      </div>
      {result.type === "missed" && todaySlots.length > 0 && (
        <div style={{ width:"100%",maxWidth:320,background:"#fafbff",border:"1.5px solid #e5e7eb",borderRadius:14,padding:"14px 16px",marginTop:4 }}>
          <p style={{ fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",margin:"0 0 8px" }}>
            Today's timetable ({result.day})
          </p>
          {todaySlots.map((s,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderTop:i?"1px solid #f3f4f6":"none" }}>
              <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",color:"#6b7280",minWidth:90 }}>{s.start}–{s.end}</span>
              <span style={{ fontSize:12,fontWeight:700,color:NAVY }}>{s.subject}</span>
              <span style={{ fontSize:11,color:"#9ca3af" }}>({s.class})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   REPORT DETAIL MODAL — RIGHT SLIDE
══════════════════════════════════════════ */
function ReportDetailDrawer({ report, onClose }) {
  const open = !!report;

  if (!report && !open) return null;

  const statusColors = {
    on_time: { color:"#065f46", bg:"#ecfdf5", glow:"#10b981" },
    late:    { color:"#92400e", bg:"#fffbeb", glow:AMBER },
    before:  { color:"#3730a3", bg:"#eef2ff", glow:"#6366f1" },
    missed:  { color:"#be123c", bg:"#fff1f2", glow:"#ef4444" },
  };
  const sc = statusColors[report?.status] || statusColors.missed;

  const Row = ({ icon: Icon, label, value, mono }) => (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 0", borderBottom:"1px solid #f3f4f6" }}>
      <div style={{ width:34,height:34,borderRadius:10,background:"#f8f9fc",border:"1.5px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
        <Icon size={15} color="#6b7280"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:11,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 3px" }}>{label}</p>
        <p style={{ fontSize:14,fontWeight:700,color:NAVY,margin:0,fontFamily:mono?"'DM Mono',monospace":undefined, overflow:"hidden", textOverflow:"ellipsis" }}>{value||"—"}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, background:"rgba(0,4,53,0.45)",
          backdropFilter:"blur(4px)", zIndex:1000,
          animation: open ? "tpFadeIn 0.25s ease" : undefined,
        }}
      />

      {/* Drawer */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0,
        width:"min(480px, 100vw)",
        background:"#fff",
        zIndex:1001,
        display:"flex", flexDirection:"column",
        boxShadow:"-20px 0 60px rgba(0,4,53,0.18)",
        animation: open ? "tpSlideDrawer 0.35s cubic-bezier(0.34,1.1,0.64,1)" : undefined,
        borderRadius:"24px 0 0 24px",
        overflow:"hidden",
      }}>

        {/* Drawer header */}
        <div style={{
          background:`linear-gradient(135deg, ${NAVY} 0%, #000d6b 100%)`,
          padding:"22px 24px 20px",
          position:"relative", overflow:"hidden", flexShrink:0,
        }}>
          {/* decorative circles */}
          <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",border:`1.5px solid ${AMBER}20`,pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:-20,left:20,width:80,height:80,borderRadius:"50%",background:`${AMBER}08`,pointerEvents:"none" }}/>

          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"relative",zIndex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <Avatar name={report?.teacher_name} size={48} accent={AMBER}/>
              <div>
                <p style={{ color:"rgba(255,255,255,0.5)",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",margin:"0 0 3px" }}>Attendance Detail</p>
                <p style={{ color:"#fff",fontSize:18,fontWeight:900,margin:0,lineHeight:1.2 }}>{report?.teacher_name||"—"}</p>
                <p style={{ color:"rgba(255,255,255,0.5)",fontSize:12,margin:"4px 0 0" }}>{report?.class} · {report?.subject}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width:36,height:36,borderRadius:12,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}
            >
              <X size={16} color="#fff"/>
            </button>
          </div>

          {/* Status pill */}
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:16,position:"relative",zIndex:1 }}>
            <StatusBadge status={report?.status} size="lg"/>
            {report?.exit_status==="before"&&<StatusBadge status="before" size="lg"/>}
            <ModeBadge source={report?.scan_source}/>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 24px 24px" }}>

          {/* Time summary card */}
          <div style={{
            margin:"20px 0 4px",
            background:`linear-gradient(135deg, ${sc.bg}, #fff)`,
            border:`1.5px solid ${sc.glow}22`,
            borderRadius:18, padding:"18px 20px",
            display:"grid", gridTemplateColumns:"1fr 1fr",
            gap:12,
          }}>
            {[
              { label:"Entry Time", val:fmt12(report?.entry_time), color:"#065f46" },
              { label:"Exit Time",  val:fmt12(report?.exit_time),  color:"#1d4ed8" },
              { label:"Scheduled Start", val:fmt12(report?.start_time), color:"#6b7280" },
              { label:"Scheduled End",   val:fmt12(report?.end_time),   color:"#6b7280" },
            ].map(f=>(
              <div key={f.label}>
                <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 4px" }}>{f.label}</p>
                <p style={{ fontSize:18,fontWeight:900,color:f.color,margin:0,fontFamily:"'DM Mono',monospace" }}>{f.val}</p>
              </div>
            ))}
          </div>

          {report?.late_mins > 0 && (
            <div style={{ margin:"12px 0", padding:"12px 16px", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:14, display:"flex",alignItems:"center",gap:10 }}>
              <Clock size={16} color={AMBER_DARK}/>
              <div>
                <p style={{ fontSize:12,fontWeight:800,color:"#92400e",margin:0 }}>Late by {report.late_mins} minutes</p>
                <p style={{ fontSize:11,color:"#b45309",margin:"2px 0 0" }}>Teacher arrived after the limit minutes</p>
              </div>
            </div>
          )}

          {/* Detail rows */}
          <div style={{ marginTop:8 }}>
            <Row icon={Calendar}  label="Date"            value={report?.date}         mono />
            <Row icon={Layers}    label="Class"           value={report?.class}              />
            <Row icon={BookOpen}  label="Subject"         value={report?.subject}            />
            <Row icon={Hash}      label="Period"          value={report?.period}       mono  />
            <Row icon={MapPin}    label="Scan Source"     value={report?.scan_source||"Manual"} mono />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1.5px solid #f3f4f6", flexShrink:0, background:"#fafbff", display:"flex", gap:10 }}>
          <button
            onClick={onClose}
            style={{ flex:1, padding:"12px", borderRadius:14, border:"1.5px solid #e5e7eb", background:"#fff", color:"#6b7280", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}
          >
            Close
          </button>
          <button
            onClick={onClose}
            style={{ flex:1, padding:"12px", borderRadius:14, border:"none", background:`linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`, color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", boxShadow:`0 4px 16px ${AMBER}44`, fontFamily:"'Sora',sans-serif" }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function TeacherClassPeriodEntryExit() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "scan");
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [toastAlerts, setToastAlerts] = useState([]);
  const [toastId, setToastId] = useState(0);
  const [dbAlerts, setDbAlerts] = useState([]);
  const [dbAlertsLoading, setDbAlertsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAlertIds, setSelectedAlertIds] = useState(new Set());
  const [lateThreshold, setLateThreshold] = useState(DEFAULT_LATE_MINUTES);
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [scanMode, setScanMode] = useState("Manual");
  const [liveClock, setLiveClock] = useState(getNow());
  const [liveDate, setLiveDate] = useState(new Date().toLocaleDateString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }));
  const scanRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveClock(getNow());
      setLiveDate(new Date().toLocaleDateString("en-GB", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const pushAlert = useCallback((a) => {
    setToastId((prev) => {
      const id = prev + 1;
      setToastAlerts((list) => [...list.slice(-4), { ...a, id }]);
      setTimeout(() => setToastAlerts((list) => list.filter((x) => x.id !== id)), 8000);
      return id;
    });
  }, []);

  const loadDbAlerts = useCallback(async () => {
    try {
      setDbAlertsLoading(true);
      const res = await api.get("/dos/teacher-period/alerts");
      setDbAlerts(res?.data?.data || []);
      setUnreadCount(res?.data?.unread_count || 0);
    } catch (_) { /* silent */ }
    finally { setDbAlertsLoading(false); }
  }, []);

  const markAlertRead = async (id, read = true) => {
    try {
      await api.patch(`/dos/teacher-period/alerts/${id}/read`, { is_read: read });
      setDbAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: read ? 1 : 0 } : a));
      setUnreadCount((c) => read ? Math.max(0, c - 1) : c + 1);
    } catch (_) { pushAlert({ type:"missed", title:"Error", message:"Failed to update alert" }); }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/dos/teacher-period/alerts/read-all");
      setDbAlerts((prev) => prev.map((a) => ({ ...a, is_read: 1 })));
      setUnreadCount(0);
    } catch (_) { pushAlert({ type:"missed", title:"Error", message:"Failed to mark all read" }); }
  };

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/dos/teacher-period/alerts/${id}`);
      setDbAlerts((prev) => prev.filter((a) => a.id !== id));
      setSelectedAlertIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (_) { pushAlert({ type:"missed", title:"Error", message:"Failed to delete alert" }); }
  };

  const deleteSelectedAlerts = async () => {
    if (selectedAlertIds.size === 0) return;
    try {
      await api.post("/dos/teacher-period/alerts/bulk-delete", { ids: [...selectedAlertIds] });
      setDbAlerts((prev) => prev.filter((a) => !selectedAlertIds.has(a.id)));
      setSelectedAlertIds(new Set());
    } catch (_) { pushAlert({ type:"missed", title:"Error", message:"Failed to delete alerts" }); }
  };

  const deleteAllAlerts = async () => {
    try {
      await api.post("/dos/teacher-period/alerts/bulk-delete", { all: true });
      setDbAlerts([]);
      setSelectedAlertIds(new Set());
      setUnreadCount(0);
    } catch (_) { pushAlert({ type:"missed", title:"Error", message:"Failed to delete all alerts" }); }
  };

  const shareAlert = (alert) => {
    const text = `[${alert.title}] ${alert.message}${alert.teacher_name ? ` — ${alert.teacher_name}` : ""}${alert.class_name ? ` (${alert.class_name})` : ""} — ${new Date(alert.created_at).toLocaleString()}`;
    if (navigator.share) { navigator.share({ title: alert.title, text }).catch(() => {}); }
    else { navigator.clipboard.writeText(text).then(() => pushAlert({ type:"late", title:"Copied", message:"Alert copied to clipboard" })); }
  };

  const toggleAlertSelect = (id) => {
    setSelectedAlertIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    setSelectedAlertIds((prev) => prev.size === dbAlerts.length ? new Set() : new Set(dbAlerts.map((a) => a.id)));
  };

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, teachersRes, timetableRes, logsRes, alertsRes] = await Promise.all([
        api.get("/dos/teacher-period/settings"),
        api.get("/dos/teacher-period/teachers"),
        api.get("/dos/teacher-period/timetable", { params:{ day:getToday() } }),
        api.get("/dos/teacher-period/logs", { params:{ date:new Date().toISOString().slice(0,10) } }),
        api.get("/dos/teacher-period/alerts").catch(() => ({ data: { data: [], unread_count: 0 } })),
      ]);
      setDbAlerts(alertsRes?.data?.data || []);
      setUnreadCount(alertsRes?.data?.unread_count || 0);
      const settings = settingsRes?.data?.data || {};
      setAcademicYear(settings.academic_year || "");
      setTerm(settings.term || "");
      setLateThreshold(Number(settings.late_threshold_minutes || DEFAULT_LATE_MINUTES));
      setTeachers((teachersRes?.data?.data || []).map((t) => ({ id:t.teacher_id, name:t.teacher_name, uid:t.teacher_uid, card_uid:t.card_uid||"" })));
      setTimetable((timetableRes?.data?.data || []).map((s) => ({ id:s.id, teacher_id:s.teacher_id, teacher_name:s.teacher_name, class:s.class_name, subject:s.subject_name, start_time:String(s.start_time||"").slice(0,5), end_time:String(s.end_time||"").slice(0,5) })));
      const nextLogs = (logsRes?.data?.data || []).map((l) => ({
        id:l.id, teacher_id:l.teacher_id, teacher_name:l.teacher_name, class:l.class_name, subject:l.subject_name,
        period:l.period||`${String(l.start_time||"").slice(0,5)}-${String(l.end_time||"").slice(0,5)}`,
        start_time:String(l.start_time||"").slice(0,5), end_time:String(l.end_time||"").slice(0,5),
        entry_time:l.entry_time||null, exit_time:l.exit_time||null,
        exit_status:String(l.exit_status||"").toLowerCase()||null, scan_source:l.scan_source||null,
        status:String(l.status||"ON_TIME").toLowerCase(), late_mins:Number(l.late_minutes||0),
        date:l.period_date||new Date().toISOString().slice(0,10),
      }));
      setLogs(nextLogs);
      const recentSource = String(nextLogs[0]?.scan_source||"").toUpperCase();
      if (recentSource) setScanMode(recentSource.startsWith("CLASSATT_")?"DEVICE":"Manual");
    } catch (err) {
      pushAlert({ type:"missed", title:"Load Error", message:err?.response?.data?.message||"Failed to load data" });
    } finally { setLoading(false); }
  }, [pushAlert]);

  useEffect(() => { loadPageData(); }, [loadPageData]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["scan", "live", "reports", "analytics", "alerts", "settings"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const saveLateThreshold = useCallback(async (value) => {
    const next = Math.max(0, Math.min(120, Number(value || 0)));
    setLateThreshold(next);
    try {
      await api.put("/dos/teacher-period/settings", {
        academic_year: academicYear,
        term,
        late_threshold_minutes: next,
      });
    } catch (err) {
      pushAlert({
        type: "missed",
        title: "Save Failed",
        message: err?.response?.data?.message || "Could not save late threshold",
      });
      await loadPageData();
    }
  }, [academicYear, term, pushAlert, loadPageData]);

  const loadReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus.toUpperCase();
      if (filterClass) params.class_name = filterClass;
      if (filterTeacher) { const t = teachers.find((x) => x.name===filterTeacher); if (t?.id) params.teacher_id = t.id; }
      const res = await api.get("/dos/teacher-period/logs", { params });
      setReportRows((res?.data?.data||[]).map((l) => ({
        id:l.id, teacher_id:l.teacher_id, teacher_name:l.teacher_name, class:l.class_name, subject:l.subject_name,
        period:`${String(l.start_time||"").slice(0,5)}-${String(l.end_time||"").slice(0,5)}`,
        start_time:String(l.start_time||"").slice(0,5), end_time:String(l.end_time||"").slice(0,5),
        entry_time:l.entry_time||null, exit_time:l.exit_time||null,
        exit_status:String(l.exit_status||"").toLowerCase()||null, scan_source:l.scan_source||null,
        status:String(l.status||"ON_TIME").toLowerCase(), late_mins:Number(l.late_minutes||0),
        date:l.period_date||"",
      })));
    } catch (err) {
      pushAlert({ type:"missed", title:"Load Error", message:err?.response?.data?.message||"Failed to load reports" });
    } finally { setLoadingReports(false); }
  }, [filterDate,filterStatus,filterClass,filterTeacher,teachers,pushAlert]);

  useEffect(() => { if (activeTab==="reports") loadReports(); }, [activeTab,loadReports]);
  useEffect(() => { if (activeTab==="alerts") loadDbAlerts(); }, [activeTab,loadDbAlerts]);

  const processTap = async (uid) => {
    if (!uid.trim()) return;
    setScanning(true); setScanResult(null);
    try {
      const res = await api.post("/dos/teacher-period/scan", { card_uid:uid.trim(), device_id:"DOS_UI_SCANNER" });
      const payload = res?.data || {};
      const data = payload?.data || {};
      const statusLower = String(data.status||"").toLowerCase();
      const normalizedLog = {
        id:data.id||Date.now(), teacher_id:data.teacher_id, teacher_name:data.teacher_name||data.teacher,
        class:data.class_name||data.class, subject:data.subject_name||data.subject,
        period:data.period||`${data.start_time||""}-${data.end_time||""}`,
        start_time:data.start_time||"", end_time:data.end_time||"",
        entry_time:data.entry_time||null, exit_time:data.exit_time||null,
        exit_status:String(data.exit_status||"").toLowerCase()||null, scan_source:data.scan_source||"DOS_UI_SCANNER",
        status:statusLower==="late"?"late":statusLower==="before"?"before":"on_time",
        late_mins:Number(data.late_minutes||0), date:data.date||new Date().toISOString().slice(0,10),
      };
      const sourceVal = String(data.scan_source||"DOS_UI_SCANNER").toUpperCase();
      setScanMode(sourceVal.startsWith("CLASSATT_")?"DEVICE":"Manual");
      if (payload.action==="entry") setLogs((prev)=>[...prev.filter((l)=>l.id!==normalizedLog.id),normalizedLog]);
      else if (payload.action==="exit") setLogs((prev)=>prev.map((l)=>l.id===normalizedLog.id?{...l,exit_time:normalizedLog.exit_time||l.exit_time,status:normalizedLog.status||l.status,exit_status:normalizedLog.exit_status||l.exit_status||null}:l));
      else if (payload.action==="duplicate") { pushAlert({ type:"missed", title:"Attendance Closed", message:payload?.message||"All attendance done for this period" }); }
      else if (payload.code==="NO_CLASS_ASSIGNED") {
        const todaySlots = Array.isArray(data.today_slots) ? data.today_slots : [];
        setScanResult({ type:"missed", teacher:data.teacher, late_mins:0, day:data.day, time:data.time, today_slots:todaySlots });
        pushAlert({ type:"missed", title:"No Period Found", message:`${data.teacher||"Teacher"} has no class now` });
        return;
      }
      if (statusLower==="late") pushAlert({ type:"late", title:"Late Entry", message:`${data.teacher_name||"Teacher"} is ${Number(data.late_minutes||0)} min late` });
      setScanResult({
        type:payload.action==="duplicate"?"duplicate":payload.action==="exit"?(statusLower==="before"?"before":"exit"):statusLower==="late"?"late":"on_time",
        teacher:data.teacher_name||data.teacher, class:data.class_name||data.class,
        subject:data.subject_name||data.subject, late_mins:Number(data.late_minutes||0),
      });
    } catch (err) {
      setScanResult({ type:"missed" });
      pushAlert({ type:"missed", title:"Scan Failed", message:err?.response?.data?.message||"Failed to process scan" });
    } finally { setScanning(false); loadDbAlerts(); }
  };

  const handleScanSubmit = (e) => { e.preventDefault(); processTap(scanInput); setScanInput(""); };
  const simulateTap = (uid) => { setScanInput(uid); processTap(uid); };

  const filteredLogs = logs.filter((l) => {
    if (filterTeacher && !l.teacher_name.toLowerCase().includes(filterTeacher.toLowerCase())) return false;
    if (filterStatus && filterStatus==="before" && l.exit_status!=="before") return false;
    if (filterStatus && filterStatus!=="before" && l.status!==filterStatus) return false;
    if (filterClass && !l.class.toLowerCase().includes(filterClass.toLowerCase())) return false;
    if (filterDate && l.date!==filterDate) return false;
    if (searchQ && !l.teacher_name.toLowerCase().includes(searchQ.toLowerCase()) && !l.subject.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const daySummary = useMemo(() => buildDaySummary(timetable, logs), [timetable, logs]);
  const onTimeCount = daySummary.on_time;
  const lateCount = daySummary.late;
  const beforeCount = daySummary.early_exit;
  const missedCount = daySummary.missed;
  const totalPeriods = daySummary.total || logs.length;
  const attendancePct = totalPeriods > 0 ? Math.round(((onTimeCount + lateCount) / totalPeriods) * 100) : 0;

  const teacherStats = teachers.map((t) => {
    const tL = logs.filter((l)=>l.teacher_id===t.id);
    return { ...t, total:tL.length, late:tL.filter((l)=>l.status==="late").length, missed:tL.filter((l)=>l.status==="missed").length, on_time:tL.filter((l)=>l.status==="on_time").length };
  }).filter((t)=>t.total>0);

  const tabs = [
    { key:"scan",      label:"Scan",      icon:ScanLine },
    { key:"live",      label:"Live Log",  icon:Activity },
    { key:"reports",   label:"Reports",   icon:Eye },
    { key:"analytics", label:"Analytics", icon:BarChart2 },
    { key:"alerts",    label:"Alerts",    icon:Bell, badge:unreadCount },
    { key:"settings",  label:"Settings",  icon:Shield },
  ];

  /* Select component */
  const FilterSelect = ({ label, val, set, opts, placeholder, isDate }) => (
    <div>
      <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.09em", marginBottom:5 }}>{label}</label>
      {isDate ? (
        <input type="date" value={val} onChange={(e)=>set(e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"2px solid #e5e7eb", borderRadius:11, fontSize:12, fontWeight:600, color:NAVY, background:"#fafafa", fontFamily:"'Sora',sans-serif" }}/>
      ) : (
        <div style={{ position:"relative" }}>
          <select value={val} onChange={(e)=>set(e.target.value)} style={{ width:"100%", padding:"9px 36px 9px 12px", border:"2px solid #e5e7eb", borderRadius:11, fontSize:12, fontWeight:600, color:val?NAVY:"#9ca3af", background:"#fafafa", appearance:"none", fontFamily:"'Sora',sans-serif" }}>
            <option value="">{placeholder}</option>
            {(opts||[]).map((o)=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <ChevronDown size={13} color="#9ca3af" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}/>
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap');

        @keyframes tpFadeUp     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tpFadeIn     { from{opacity:0} to{opacity:1} }
        @keyframes tpPop        { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
        @keyframes tpRipple     { from{opacity:0.5;transform:scale(1)} to{opacity:0;transform:scale(1.9)} }
        @keyframes tpSlideRight { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes tpSlideDrawer{ from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes tpSpin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tpPulse      { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes tpScanLine   { 0%{top:0}100%{top:100%} }
        @keyframes tpBlink      { 0%,100%{opacity:1}50%{opacity:0} }
        @keyframes tpBarGrow    { from{width:0} to{width:var(--bar-w)} }

        *,*::before,*::after{box-sizing:border-box}
        body{margin:0;background:#eef0f8}

        .tp-page{font-family:'Sora',sans-serif;min-height:100vh;background:#eef0f8;max-width:1300px;margin:0 auto}

        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#dde0ee;border-radius:99px}

        .tp-table{width:100%;border-collapse:collapse}
        .tp-table th{background:#f8f9fc;color:#9ca3af;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;padding:11px 14px;text-align:left;border-bottom:1.5px solid #f0f1f8;white-space:nowrap}
        .tp-table td{padding:13px 14px;border-bottom:1px solid #f5f6fb;font-size:13px;color:${NAVY};vertical-align:middle}
        .tp-table tr:last-child td{border-bottom:none}
        .tp-table tbody tr{transition:background 0.15s}
        .tp-table tbody tr:hover td{background:#fafbff}

        input:focus,select:focus{border-color:${AMBER}!important;box-shadow:0 0 0 3px ${AMBER}22!important;outline:none!important}
        select option{color:${NAVY};background:#fff}

        .tp-tab{transition:all 0.2s ease;font-family:'Sora',sans-serif}
        .tp-tab:hover:not(.tp-tab-active){background:rgba(255,255,255,0.12)!important}
        .tp-tab-active{background:#fff!important;color:${NAVY}!important;box-shadow:0 -4px 0 ${AMBER} inset}

        .tp-card-hover{transition:transform 0.18s ease,box-shadow 0.18s ease}
        .tp-card-hover:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,4,53,0.11)!important}

        .tp-scan-box{position:relative;overflow:hidden}
        .tp-scan-box::after{content:'';position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${AMBER},transparent);animation:tpScanLine 2s linear infinite}

        .tp-btn-primary{background:linear-gradient(135deg,${AMBER},${AMBER_DARK});color:#fff;border:none;border-radius:14px;padding:11px 20px;font-weight:800;font-size:13px;cursor:pointer;font-family:'Sora',sans-serif;box-shadow:0 4px 16px ${AMBER}44;transition:all 0.18s ease}
        .tp-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 24px ${AMBER}55}
        .tp-btn-ghost{border:1.5px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:12px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;font-family:'Sora',sans-serif;transition:all 0.15s}
        .tp-btn-ghost:hover{background:#f8f9fc;border-color:#d1d5db}

        .report-row-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 12px;borderRadius:10px;font-size:12px;font-weight:700;font-family:'Sora',sans-serif;transition:all 0.15s}
        .report-row-btn:hover{background:#f0f4ff}

        @media(max-width:900px){
          .tp-desktop-grid{display:block!important}
          .tp-stats-grid{grid-template-columns:1fr 1fr!important}
          .tp-header-clock-grid{grid-template-columns:1fr 1fr!important}
          .tp-filter-grid-4{grid-template-columns:1fr 1fr!important}
          .tp-filter-grid-5{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:600px){
          .tp-stats-grid{grid-template-columns:1fr 1fr!important}
          .tp-header-clock-grid{grid-template-columns:1fr 1fr!important}
          .tp-filter-grid-4{grid-template-columns:1fr!important}
          .tp-filter-grid-5{grid-template-columns:1fr!important}
          .tp-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .tp-hide-mobile{display:none!important}
          .tp-header-row{flex-direction:column;gap:12px;align-items:flex-start!important}
          .tp-tab-label{display:none}
        }
        @media(min-width:1024px){
          .tp-desktop-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:20px}
        }
      `}</style>

      <AlertToast alerts={toastAlerts} onDismiss={(id)=>setToastAlerts((a)=>a.filter((x)=>x.id!==id))}/>
      <ReportDetailDrawer report={selectedReport} onClose={()=>setSelectedReport(null)}/>

      <DosOrangePageHero
        title="Teacher period attendance"
        subtitle={`${liveDate} · ${liveClock} — monitor scans, live logs, reports, and alerts.`}
        heroStats={[
          { label: 'On time', value: String(onTimeCount) },
          { label: 'Late', value: String(lateCount) },
          { label: 'Early exit', value: String(beforeCount) },
          { label: 'Missed', value: String(missedCount) },
        ]}
        onRefresh={loadPageData}
        refreshing={loading}
      />

      <div className="tp-page" style={{ maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', border: '1px solid #e5e7eb', borderTop: 'none', margin: '-1rem 12px 0', padding: '0 8px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 2, padding: '8px 0 0', minWidth: 'min-content' }}>
            {tabs.map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                type="button"
                className={`tp-tab ${activeTab === key ? 'tp-tab-active' : ''}`}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '11px 18px',
                  borderRadius: '14px 14px 0 0',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === key ? '#fff' : '#f3f4f6',
                  color: activeTab === key ? NAVY : '#6b7280',
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: activeTab === key ? `0 -3px 0 ${AMBER} inset` : 'none',
                }}
              >
                <Icon size={15} />
                <span className="tp-tab-label">{label}</span>
                {badge > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 11, fontWeight: 900 }}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TAB CONTENT ══ */}
        <div style={{ padding:"20px" }}>

          {/* ── SCAN ── */}
          {activeTab==="scan"&&(
            <div className="tp-desktop-grid" style={{ display:"block" }}>

              {/* Scanner card */}
              <div style={{ background:"#fff",borderRadius:24,padding:"24px",boxShadow:"0 4px 24px rgba(0,4,53,0.07)",animation:"tpFadeUp 0.35s ease",marginBottom:20 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                  <div style={{ width:40,height:40,borderRadius:13,background:`${AMBER}14`,border:`1.5px solid ${AMBER}28`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ScanLine size={20} color={AMBER_DARK}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ fontSize:16,fontWeight:900,color:NAVY,margin:0 }}>Card Scanner</h2>
                    <p style={{ fontSize:12,color:"#9ca3af",margin:0 }}>Tap QR or RFID card to register</p>
                  </div>
                  <span style={{ display:"inline-flex",alignItems:"center",borderRadius:99,padding:"5px 11px",fontSize:10,fontWeight:800,border:`1.5px solid ${scanMode==="DEVICE"?"#c7d2fe":"#e5e7eb"}`,background:scanMode==="DEVICE"?"#eef2ff":"#f9fafb",color:scanMode==="DEVICE"?"#4338ca":"#6b7280",textTransform:"uppercase",letterSpacing:"0.07em" }}>
                    {scanMode==="DEVICE"?"DEVICE":"Manual"}
                  </span>
                </div>

                <div className="tp-scan-box" style={{ background:`${NAVY}03`,border:`2px dashed ${NAVY}14`,borderRadius:20,padding:"28px 20px",marginBottom:20,minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                  {scanning?(
                    <div style={{ textAlign:"center" }}>
                      <div style={{ width:64,height:64,borderRadius:"50%",border:`3px solid ${AMBER}`,borderTopColor:"transparent",animation:"tpSpin 0.75s linear infinite",margin:"0 auto 16px" }}/>
                      <p style={{ fontWeight:800,color:NAVY,margin:0 }}>Processing…</p>
                      <p style={{ fontSize:13,color:"#9ca3af",margin:"4px 0 0" }}>Checking timetable</p>
                    </div>
                  ):scanResult?(
                    <ScanPulse result={scanResult}/>
                  ):(
                    <div style={{ textAlign:"center" }}>
                      <div style={{ width:76,height:76,borderRadius:22,background:`${NAVY}07`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
                        <Radio size={34} color={`${NAVY}40`}/>
                      </div>
                      <p style={{ fontWeight:700,color:"#6b7280",margin:0 }}>Waiting for card tap…</p>
                      <p style={{ fontSize:12,color:"#9ca3af",margin:"6px 0 0" }}>QR code or RFID card</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleScanSubmit} style={{ display:"flex",gap:10 }}>
                  <input ref={scanRef} value={scanInput} onChange={(e)=>setScanInput(e.target.value)}
                    placeholder="Scan or type card UID…"
                    style={{ flex:1,padding:"12px 16px",border:"2px solid #e5e7eb",borderRadius:14,fontSize:14,fontWeight:600,fontFamily:"'DM Mono',monospace",color:NAVY,background:"#fafafa" }}
                    autoFocus/>
                  <button type="submit" className="tp-btn-primary" style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 22px" }}>
                    <Zap size={15}/> Tap
                  </button>
                </form>

                <div style={{ marginTop:14,padding:"14px 16px",background:"#f8f9fc",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
                  <div>
                    <p style={{ fontSize:12,fontWeight:700,color:NAVY,margin:0 }}>Late threshold</p>
                    <p style={{ fontSize:11,color:"#9ca3af",margin:"2px 0 0" }}>
                      Marked late if entry is more than {lateThreshold} min after period start
                    </p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <button type="button" onClick={()=>saveLateThreshold(lateThreshold - 1)} style={{ width:30,height:30,borderRadius:9,border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",fontWeight:900,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY }}>−</button>
                    <span style={{ fontWeight:900,fontSize:18,color:NAVY,minWidth:32,textAlign:"center",fontFamily:"'DM Mono',monospace" }}>{lateThreshold}</span>
                    <button type="button" onClick={()=>saveLateThreshold(lateThreshold + 1)} style={{ width:30,height:30,borderRadius:9,border:"1.5px solid #e5e7eb",background:"#fff",cursor:"pointer",fontWeight:900,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY }}>+</button>
                    <span style={{ fontSize:12,color:"#9ca3af",fontWeight:600 }}>min</span>
                  </div>
                </div>
              </div>

              {/* Quick-tap */}
              <div style={{ background:"#fff",borderRadius:24,padding:"24px",boxShadow:"0 4px 24px rgba(0,4,53,0.07)",animation:"tpFadeUp 0.42s ease" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:18 }}>
                  <div style={{ width:40,height:40,borderRadius:13,background:`${NAVY}09`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Users size={19} color={NAVY}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize:16,fontWeight:900,color:NAVY,margin:0 }}>Quick Tap</h2>
                    <p style={{ fontSize:12,color:"#9ca3af",margin:0 }}>Simulate a teacher card tap</p>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {teachers.map((t)=>{
                    const log = logs.find((l)=>l.teacher_id===t.id);
                    const tapId = t.card_uid||t.uid;
                    const borderColor = log?(log.status==="on_time"?"#6ee7b7":log.status==="late"?"#fde68a":log.status==="before"?"#c7d2fe":"#fecaca"):"#e5e7eb";
                    const bgColor = log?(log.status==="on_time"?"#f0fdf4":log.status==="late"?"#fffbeb":log.status==="before"?"#eef2ff":"#fff9f9"):"#fafafa";
                    return (
                      <button key={t.id} type="button" onClick={()=>tapId&&simulateTap(tapId)} className="tp-card-hover" style={{
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        padding:"13px 16px",borderRadius:16,border:`1.5px solid ${borderColor}`,
                        background:bgColor,cursor:tapId?"pointer":"not-allowed",textAlign:"left",opacity:tapId?1:0.65,
                      }}>
                        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                          <Avatar name={t.name} size={38}/>
                          <div>
                            <p style={{ fontWeight:800,color:NAVY,margin:0,fontSize:13 }}>{t.name}</p>
                            <p style={{ fontSize:11,color:"#9ca3af",margin:"2px 0 0",fontFamily:"'DM Mono',monospace" }}>{tapId||"No card linked"}</p>
                          </div>
                        </div>
                        {log?(
                          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end" }}>
                            {log.entry_time&&!log.exit_time&&<span style={{ fontSize:11,color:"#6b7280" }}>In {fmt12(log.entry_time)}</span>}
                            {log.exit_time&&<span style={{ fontSize:11,color:"#6b7280" }}>Out {fmt12(log.exit_time)}</span>}
                            <StatusBadge status={log.status}/>
                            {log.exit_status==="before"&&<StatusBadge status="before"/>}
                          </div>
                        ):(
                          <div style={{ display:"flex",alignItems:"center",gap:4,color:"#9ca3af" }}>
                            <span style={{ fontSize:12,fontWeight:600 }}>Tap</span>
                            <ChevronRight size={14}/>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── LIVE LOG ── */}
          {activeTab==="live"&&(
            <div style={{ animation:"tpFadeUp 0.35s ease" }}>
              <div style={{ background:"#fff",borderRadius:20,padding:"18px 20px",marginBottom:16,boxShadow:"0 2px 16px rgba(0,4,53,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <Filter size={14} color={NAVY}/>
                    <span style={{ fontWeight:800,fontSize:14,color:NAVY }}>Filters</span>
                  </div>
                  <button type="button" className="report-row-btn" onClick={()=>{setFilterTeacher("");setFilterStatus("");setFilterDate("");setFilterClass("");setSearchQ("");}} style={{ color:AMBER_DARK }}>Clear all</button>
                </div>
                <div style={{ position:"relative",marginBottom:12 }}>
                  <Search size={14} color="#9ca3af" style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)" }}/>
                  <input value={searchQ} onChange={(e)=>setSearchQ(e.target.value)} placeholder="Search teacher or subject…" style={{ width:"100%",padding:"10px 14px 10px 36px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:13,fontWeight:600,color:NAVY,background:"#fafafa",fontFamily:"'Sora',sans-serif" }}/>
                </div>
                <div className="tp-filter-grid-4" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
                  <FilterSelect label="Teacher" val={filterTeacher} set={setFilterTeacher} opts={teachers.map((t)=>({v:t.name,l:t.name}))} placeholder="All teachers"/>
                  <FilterSelect label="Status"  val={filterStatus}  set={setFilterStatus}  opts={[{v:"on_time",l:"On Time"},{v:"late",l:"Late"},{v:"before",l:"Early Exit"},{v:"missed",l:"Missed"}]} placeholder="All statuses"/>
                  <FilterSelect label="Class"   val={filterClass}   set={setFilterClass}   opts={[...new Set(timetable.map((t)=>t.class))].map((c)=>({v:c,l:c}))} placeholder="All classes"/>
                  <FilterSelect label="Date"    val={filterDate}    set={setFilterDate}    isDate/>
                </div>
              </div>

              <div style={{ background:"#fff",borderRadius:20,boxShadow:"0 2px 16px rgba(0,4,53,0.06)",overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f0f1f8",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <Activity size={16} color={NAVY}/>
                    <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Live Attendance Log</span>
                    <span style={{ background:"#f0f1f8",borderRadius:8,padding:"2px 9px",fontSize:12,color:"#6b7280",fontWeight:700 }}>{filteredLogs.length}</span>
                  </div>
                  <button type="button" className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 13px",fontSize:12 }}>
                    <Download size={13}/> Export
                  </button>
                </div>
                <div className="tp-table-wrap">
                  <table className="tp-table">
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th>Class</th>
                        <th className="tp-hide-mobile">Subject</th>
                        <th className="tp-hide-mobile">Scheduled</th>
                        <th>Entry</th>
                        <th>Exit</th>
                        <th>Status</th>
                        <th className="tp-hide-mobile">Late By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.length===0?(
                        <tr><td colSpan={8} style={{ textAlign:"center",padding:"48px 20px",color:"#9ca3af" }}>
                          <Activity size={32} style={{ margin:"0 auto 10px",display:"block",opacity:0.25 }}/>
                          <p style={{ fontWeight:800,margin:0 }}>No records yet</p>
                          <p style={{ fontSize:13,margin:"4px 0 0" }}>Tap a card to start logging</p>
                        </td></tr>
                      ):filteredLogs.map((l,i)=>(
                        <tr key={l.id} style={{ animation:`tpFadeUp 0.25s ease ${i*0.04}s both` }}>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                              <Avatar name={l.teacher_name} size={32}/>
                              <span style={{ fontWeight:700 }}>{l.teacher_name}</span>
                            </div>
                          </td>
                          <td><span style={{ background:"#f0f1f8",borderRadius:7,padding:"3px 9px",fontSize:12,fontWeight:700 }}>{l.class}</span></td>
                          <td className="tp-hide-mobile" style={{ fontWeight:600 }}>{l.subject}</td>
                          <td className="tp-hide-mobile" style={{ color:"#6b7280",fontFamily:"'DM Mono',monospace",fontSize:12 }}>{fmt12(l.start_time)}–{fmt12(l.end_time)}</td>
                          <td style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:l.entry_time?"#065f46":"#9ca3af",fontSize:12 }}>{fmt12(l.entry_time)}</td>
                          <td style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:l.exit_time?"#1d4ed8":"#9ca3af",fontSize:12 }}>{fmt12(l.exit_time)}</td>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
                              <StatusBadge status={l.status}/>
                              {l.exit_status==="before"&&<StatusBadge status="before"/>}
                            </div>
                          </td>
                          <td className="tp-hide-mobile" style={{ fontFamily:"'DM Mono',monospace",fontWeight:700,color:l.late_mins>0?"#dc2626":"#9ca3af",fontSize:12 }}>
                            {l.late_mins>0?`+${l.late_mins}m`:"—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab==="reports"&&(
            <div style={{ animation:"tpFadeUp 0.35s ease" }}>
              {/* Filters */}
              <div style={{ background:"#fff",borderRadius:20,padding:"18px 20px",marginBottom:16,boxShadow:"0 2px 16px rgba(0,4,53,0.06)" }}>
                <div className="tp-filter-grid-5" style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10 }}>
                  <FilterSelect label="Teacher" val={filterTeacher} set={setFilterTeacher} opts={teachers.map((t)=>({v:t.name,l:t.name}))} placeholder="All teachers"/>
                  <FilterSelect label="Status"  val={filterStatus}  set={setFilterStatus}  opts={[{v:"on_time",l:"On Time"},{v:"late",l:"Late"},{v:"before",l:"Early Exit"}]} placeholder="All statuses"/>
                  <FilterSelect label="Class"   val={filterClass}   set={setFilterClass}   opts={[...new Set(timetable.map((t)=>t.class))].map((c)=>({v:c,l:c}))} placeholder="All classes"/>
                  <FilterSelect label="Date"    val={filterDate}    set={setFilterDate}    isDate/>
                  <div style={{ display:"flex",alignItems:"flex-end",gap:8 }}>
                    <button type="button" className="tp-btn-primary" onClick={loadReports} style={{ flex:1 }}>Filter</button>
                    <button type="button" className="tp-btn-ghost" onClick={()=>{setFilterTeacher("");setFilterStatus("");setFilterClass("");setFilterDate("");}}>Reset</button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div style={{ background:"#fff",borderRadius:20,boxShadow:"0 2px 16px rgba(0,4,53,0.06)",overflow:"hidden" }}>
                <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f0f1f8",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <Eye size={16} color={NAVY}/>
                    <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Reports</span>
                    <span style={{ background:"#f0f1f8",borderRadius:8,padding:"2px 9px",fontSize:12,color:"#6b7280",fontWeight:700 }}>{reportRows.length}</span>
                  </div>
                  <button type="button" className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 13px",fontSize:12 }}>
                    <Download size={13}/> Export
                  </button>
                </div>

                <div className="tp-table-wrap">
                  <table className="tp-table">
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th className="tp-hide-mobile">Date</th>
                        <th className="tp-hide-mobile">Class</th>
                        <th>Status</th>
                        <th>Entry</th>
                        <th className="tp-hide-mobile">Exit</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingReports?(
                        <tr><td colSpan={7} style={{ textAlign:"center",padding:"36px",color:"#9ca3af" }}>
                          <div style={{ width:32,height:32,borderRadius:"50%",border:`3px solid ${AMBER}`,borderTopColor:"transparent",animation:"tpSpin 0.8s linear infinite",margin:"0 auto 10px" }}/>
                          <p style={{ margin:0,fontWeight:700 }}>Loading reports…</p>
                        </td></tr>
                      ):reportRows.length===0?(
                        <tr><td colSpan={7} style={{ textAlign:"center",padding:"48px",color:"#9ca3af" }}>
                          <Eye size={32} style={{ margin:"0 auto 10px",display:"block",opacity:0.25 }}/>
                          <p style={{ margin:0,fontWeight:800 }}>No reports found</p>
                          <p style={{ fontSize:13,margin:"4px 0 0" }}>Try adjusting the filters</p>
                        </td></tr>
                      ):reportRows.map((r,i)=>(
                        <tr key={r.id} style={{ animation:`tpFadeUp 0.25s ease ${i*0.04}s both` }}>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                              <Avatar name={r.teacher_name} size={32}/>
                              <div>
                                <p style={{ fontWeight:800,color:NAVY,margin:0,fontSize:13 }}>{r.teacher_name}</p>
                                <p style={{ fontSize:11,color:"#9ca3af",margin:"2px 0 0" }} className="tp-hide-mobile">{r.subject}</p>
                              </div>
                            </div>
                          </td>
                          <td className="tp-hide-mobile">
                            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,color:"#6b7280" }}>{r.date||"—"}</span>
                          </td>
                          <td className="tp-hide-mobile">
                            <span style={{ background:"#f0f1f8",borderRadius:7,padding:"3px 9px",fontSize:12,fontWeight:700 }}>{r.class}</span>
                          </td>
                          <td>
                            <div style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
                              <StatusBadge status={r.status}/>
                              {r.exit_status==="before"&&<StatusBadge status="before"/>}
                              <ModeBadge source={r.scan_source}/>
                            </div>
                          </td>
                          <td style={{ fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:r.entry_time?"#065f46":"#9ca3af" }}>{fmt12(r.entry_time)}</td>
                          <td className="tp-hide-mobile" style={{ fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:r.exit_time?"#1d4ed8":"#9ca3af" }}>{fmt12(r.exit_time)}</td>
                          <td>
                            <div style={{ display:"flex",gap:6 }}>
                              {/* VIEW — opens right-side drawer */}
                              <button type="button" onClick={()=>setSelectedReport(r)} style={{
                                display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:10,
                                border:"1.5px solid #dbeafe",background:"#eff6ff",color:"#1d4ed8",
                                fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",
                                transition:"all 0.15s",
                              }}>
                                <Eye size={13}/> View
                              </button>
                              <button
                                type="button"
                                onClick={async()=>{
                                  if(!window.confirm("Delete this report?"))return;
                                  try{
                                    await api.delete(`/dos/teacher-period/logs/${r.id}`);
                                    pushAlert({type:"late",title:"Deleted",message:"Report deleted"});
                                    loadReports();
                                    setLogs((prev)=>prev.filter((x)=>x.id!==r.id));
                                  }catch(err){
                                    pushAlert({type:"missed",title:"Delete Failed",message:err?.response?.data?.message||"Could not delete"});
                                  }
                                }}
                                style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:10,border:"1.5px solid #fecaca",background:"#fff1f2",color:"#b91c1c",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif",transition:"all 0.15s" }}
                              >
                                <X size={13}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab==="analytics"&&(
            <div style={{ display:"flex",flexDirection:"column",gap:20,animation:"tpFadeUp 0.35s ease" }}>
              <div className="tp-stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16 }}>
                <StatCard icon={Activity}     label="Total Periods"  value={totalPeriods} sub="Today's logged"           accent={NAVY}    animate idx={0}/>
                <StatCard icon={CheckCircle2} label="On Time"        value={onTimeCount}  sub={`${attendancePct}% rate`} accent="#10b981" animate idx={1}/>
                <StatCard icon={Clock}        label="Late Entries"   value={lateCount}    sub={`After ${lateThreshold} min grace`} accent={AMBER}   animate idx={2}/>
                <StatCard icon={XCircle}      label="Missed Periods" value={missedCount}  sub="No entry recorded"        accent="#ef4444" animate idx={3}/>
              </div>

              <div style={{ background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(0,4,53,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <TrendingUp size={17} color={NAVY}/>
                    <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Overall Attendance Rate</span>
                  </div>
                  <span style={{ fontSize:32,fontWeight:900,color:attendancePct>=80?"#10b981":attendancePct>=60?AMBER_DARK:"#dc2626",fontFamily:"'DM Mono',monospace" }}>{attendancePct}%</span>
                </div>
                <div style={{ height:12,borderRadius:99,background:"#f0f1f8",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${attendancePct}%`,background:attendancePct>=80?"linear-gradient(90deg,#10b981,#059669)":attendancePct>=60?`linear-gradient(90deg,${AMBER},${AMBER_DARK})`:"linear-gradient(90deg,#ef4444,#dc2626)",borderRadius:99,transition:"width 1s cubic-bezier(0.34,1.2,0.64,1)" }}/>
                </div>
              </div>

              <div style={{ background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(0,4,53,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                  <Users size={17} color={NAVY}/>
                  <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Per-Teacher Breakdown</span>
                </div>
                {teacherStats.length===0?(
                  <div style={{ textAlign:"center",padding:"32px 0",color:"#9ca3af" }}>
                    <BarChart2 size={32} style={{ margin:"0 auto 10px",display:"block",opacity:0.25 }}/>
                    <p style={{ fontWeight:800,margin:0 }}>No data yet</p>
                  </div>
                ):(
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {teacherStats.map((t,i)=>{
                      const pct = t.total>0?Math.round(((t.on_time+t.late)/t.total)*100):0;
                      return (
                        <div key={t.id} style={{ background:"#fafbff",borderRadius:16,padding:"16px 18px",border:"1.5px solid #f0f1f8",animation:`tpFadeUp 0.3s ease ${i*0.06}s both` }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                              <Avatar name={t.name} size={38}/>
                              <div>
                                <p style={{ fontWeight:800,color:NAVY,margin:0,fontSize:14 }}>{t.name}</p>
                                <div style={{ display:"flex",gap:10,marginTop:3 }}>
                                  <span style={{ fontSize:11,color:"#10b981",fontWeight:700 }}>✓ {t.on_time}</span>
                                  <span style={{ fontSize:11,color:AMBER_DARK,fontWeight:700 }}>⚠ {t.late}</span>
                                  <span style={{ fontSize:11,color:"#dc2626",fontWeight:700 }}>✕ {t.missed}</span>
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize:22,fontWeight:900,color:pct>=80?"#10b981":pct>=60?AMBER_DARK:"#dc2626",fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
                          </div>
                          <div style={{ height:7,borderRadius:99,background:"#e9eaf0",overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:pct>=80?"#10b981":pct>=60?AMBER:"#ef4444",borderRadius:99,transition:"width 0.8s ease" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(0,4,53,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                  <Calendar size={17} color={NAVY}/>
                  <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Today's Timetable Coverage</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {timetable.map((slot,i)=>{
                    const log = logs.find((l)=>l.teacher_id===slot.teacher_id&&l.period===slot.period);
                    const status = log?.status||"pending";
                    const colors = { on_time:"#10b981",late:AMBER,before:"#6366f1",missed:"#ef4444",pending:"#d1d5db" };
                    return (
                      <div key={slot.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:14,background:"#fafbff",border:"1.5px solid #f0f1f8",animation:`tpFadeUp 0.25s ease ${i*0.05}s both` }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:colors[status],flexShrink:0,boxShadow:`0 0 0 4px ${colors[status]}22` }}/>
                        <div style={{ flex:1,minWidth:0 }}>
                          <span style={{ fontWeight:800,fontSize:13,color:NAVY }}>{slot.teacher_name}</span>
                          <span style={{ color:"#9ca3af",fontSize:12,margin:"0 8px" }}>·</span>
                          <span style={{ fontSize:12,color:"#6b7280" }}>{slot.subject} ({slot.class})</span>
                        </div>
                        <span style={{ fontSize:11,color:"#9ca3af",fontFamily:"'DM Mono',monospace",flexShrink:0 }}>{fmt12(slot.start_time)}–{fmt12(slot.end_time)}</span>
                        {log?<StatusBadge status={log.status}/>:<span style={{ fontSize:11,color:"#9ca3af",fontWeight:700 }}>Pending</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {activeTab==="alerts"&&(
            <div style={{ animation:"tpFadeUp 0.35s ease" }}>
              {/* Toolbar */}
              <div style={{ background:"#fff",borderRadius:20,padding:"16px 20px",boxShadow:"0 2px 16px rgba(0,4,53,0.06)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:38,height:38,borderRadius:12,background:"#fff1f2",border:"1.5px solid #fecaca",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Bell size={18} color="#dc2626"/>
                  </div>
                  <div>
                    <h2 style={{ fontSize:16,fontWeight:900,color:NAVY,margin:0 }}>Alert Center</h2>
                    <p style={{ fontSize:12,color:"#9ca3af",margin:0 }}>{dbAlerts.length} alerts · {unreadCount} unread</p>
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                  <button type="button" onClick={toggleSelectAll} className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",fontSize:11 }}>
                    {selectedAlertIds.size===dbAlerts.length&&dbAlerts.length>0?<CheckSquare size={13}/>:<Square size={13}/>}
                    {selectedAlertIds.size>0?`${selectedAlertIds.size} selected`:"Select all"}
                  </button>
                  {unreadCount>0&&(
                    <button type="button" onClick={markAllRead} className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",fontSize:11,color:"#1d4ed8",borderColor:"#dbeafe" }}>
                      <Eye size={13}/> Mark all read
                    </button>
                  )}
                  {selectedAlertIds.size>0&&(
                    <button type="button" onClick={deleteSelectedAlerts} className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",fontSize:11,color:"#dc2626",borderColor:"#fecaca" }}>
                      <Trash2 size={13}/> Delete selected
                    </button>
                  )}
                  {dbAlerts.length>0&&(
                    <button type="button" onClick={()=>{if(window.confirm("Delete ALL alerts?"))deleteAllAlerts();}} className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",fontSize:11,color:"#dc2626",borderColor:"#fecaca" }}>
                      <Trash2 size={13}/> Clear all
                    </button>
                  )}
                  <button type="button" onClick={loadDbAlerts} className="tp-btn-ghost" style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 12px",fontSize:11 }}>
                    <RefreshCw size={13}/> Refresh
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div style={{ background:"#fff",borderRadius:20,padding:"22px 24px",boxShadow:"0 4px 24px rgba(0,4,53,0.06)" }}>
                {dbAlertsLoading?(
                  <div style={{ textAlign:"center",padding:"36px 0",color:"#9ca3af" }}>
                    <div style={{ width:32,height:32,borderRadius:"50%",border:`3px solid ${AMBER}`,borderTopColor:"transparent",animation:"tpSpin 0.8s linear infinite",margin:"0 auto 10px" }}/>
                    <p style={{ margin:0,fontWeight:700 }}>Loading alerts…</p>
                  </div>
                ):dbAlerts.length===0?(
                  <div style={{ textAlign:"center",padding:"44px 0",color:"#9ca3af" }}>
                    <CheckCircle2 size={40} style={{ margin:"0 auto 12px",display:"block",color:"#10b981",opacity:0.5 }}/>
                    <p style={{ fontWeight:800,color:"#065f46",margin:0,fontSize:15 }}>All Clear</p>
                    <p style={{ fontSize:13,color:"#9ca3af",margin:"6px 0 0" }}>No alerts recorded yet</p>
                  </div>
                ):(
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {dbAlerts.map((a,i)=>{
                      const isLate = a.alert_type==="late";
                      const isBefore = a.alert_type==="before";
                      const bg = isLate?"#fffbeb":isBefore?"#eef2ff":"#fff1f2";
                      const border = isLate?"#fde68a":isBefore?"#c7d2fe":"#fecaca";
                      const iconBg = isLate?"#fef3c7":isBefore?"#e0e7ff":"#fee2e2";
                      const iconColor = isLate?AMBER_DARK:isBefore?"#4338ca":"#dc2626";
                      const IconEl = isLate?Clock:isBefore?TrendingDown:AlertTriangle;
                      const isSelected = selectedAlertIds.has(a.id);
                      const isUnread = !a.is_read;
                      return (
                        <div key={a.id} style={{
                          display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:16,
                          background:isUnread?bg:`${bg}88`,border:`1.5px solid ${isUnread?border:`${border}66`}`,
                          opacity:isUnread?1:0.75,animation:`tpFadeUp 0.25s ease ${i*0.03}s both`,
                          position:"relative",
                        }}>
                          <button type="button" onClick={()=>toggleAlertSelect(a.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",flexShrink:0,marginTop:2 }}>
                            {isSelected?<CheckSquare size={18} color={AMBER_DARK}/>:<Square size={18} color="#9ca3af"/>}
                          </button>
                          {isUnread&&<div style={{ position:"absolute",top:8,left:8,width:7,height:7,borderRadius:"50%",background:"#3b82f6",boxShadow:"0 0 0 3px #3b82f622" }}/>}
                          <div style={{ width:38,height:38,borderRadius:11,background:iconBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            <IconEl size={17} color={iconColor}/>
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                              <p style={{ fontWeight:800,fontSize:14,color:NAVY,margin:0 }}>{a.title}</p>
                              {isUnread&&<span style={{ fontSize:9,fontWeight:800,background:"#3b82f6",color:"#fff",borderRadius:99,padding:"1px 7px",textTransform:"uppercase" }}>New</span>}
                            </div>
                            <p style={{ fontSize:13,color:"#6b7280",margin:"0 0 4px",lineHeight:1.4 }}>{a.message}</p>
                            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                              {a.teacher_name&&<span style={{ fontSize:11,color:"#6b7280",fontWeight:600 }}>{a.teacher_name}</span>}
                              {a.class_name&&<span style={{ fontSize:10,background:"#f0f1f8",borderRadius:6,padding:"2px 7px",fontWeight:700,color:NAVY }}>{a.class_name}</span>}
                              {a.subject_name&&<span style={{ fontSize:10,color:"#9ca3af",fontWeight:600 }}>{a.subject_name}</span>}
                              <span style={{ fontSize:10,color:"#9ca3af",fontFamily:"'DM Mono',monospace" }}>{new Date(a.created_at).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",gap:4,flexShrink:0 }}>
                            <button type="button" title={isUnread?"Mark read":"Mark unread"} onClick={()=>markAlertRead(a.id,isUnread)} style={{ width:30,height:30,borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                              <Eye size={13} color={isUnread?"#3b82f6":"#9ca3af"}/>
                            </button>
                            <button type="button" title="Share" onClick={()=>shareAlert(a)} style={{ width:30,height:30,borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                              <Share2 size={13} color="#6b7280"/>
                            </button>
                            <button type="button" title="Delete" onClick={()=>deleteAlert(a.id)} style={{ width:30,height:30,borderRadius:8,border:"1px solid #fecaca",background:"#fff1f2",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
                              <Trash2 size={13} color="#dc2626"/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab==="settings"&&(
            <div style={{ animation:"tpFadeUp 0.35s ease" }}>
              <div style={{ background:"#fff",borderRadius:20,padding:"24px",boxShadow:"0 4px 24px rgba(0,4,53,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                  <div style={{ width:40,height:40,borderRadius:13,background:`${NAVY}09`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Shield size={19} color={NAVY}/>
                  </div>
                  <div>
                    <h2 style={{ fontSize:16,fontWeight:900,color:NAVY,margin:0 }}>Period Settings</h2>
                    <p style={{ fontSize:12,color:"#9ca3af",margin:0 }}>Academic year, term, and thresholds</p>
                  </div>
                </div>

                <div className="tp-filter-grid-4" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20 }}>
                  <div>
                    <label style={{ display:"block",fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6 }}>Academic Year</label>
                    <input value={academicYear} onChange={(e)=>setAcademicYear(e.target.value)} placeholder="2025-2026" style={{ width:"100%",padding:"11px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:13,fontWeight:600,color:NAVY,background:"#fafafa",fontFamily:"'Sora',sans-serif" }}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6 }}>Term</label>
                    <div style={{ position:"relative" }}>
                      <select value={term} onChange={(e)=>setTerm(e.target.value)} style={{ width:"100%",padding:"11px 36px 11px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:13,fontWeight:600,color:term?NAVY:"#9ca3af",background:"#fafafa",appearance:"none",fontFamily:"'Sora',sans-serif" }}>
                        <option value="">Select term</option>
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                      <ChevronDown size={14} color="#9ca3af" style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}/>
                    </div>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6 }}>Late Threshold (min)</label>
                    <input type="number" min="0" max="120" value={lateThreshold} onChange={(e)=>setLateThreshold(Number(e.target.value||0))} style={{ width:"100%",padding:"11px 14px",border:"2px solid #e5e7eb",borderRadius:12,fontSize:13,fontWeight:600,color:NAVY,background:"#fafafa",fontFamily:"'DM Mono',monospace" }}/>
                    <p style={{ fontSize:11,color:"#9ca3af",margin:"8px 0 0",lineHeight:1.45 }}>
                      Teachers are marked <strong style={{ color:NAVY }}>Late</strong> when they scan in more than this many minutes after the lesson start time.
                      Example: threshold <strong style={{ color:NAVY }}>5</strong> means a scan at 6 minutes late counts as late; 5 minutes or less is on time.
                    </p>
                  </div>
                </div>

                <button type="button" disabled={savingSettings} className="tp-btn-primary" style={{ padding:"12px 24px",fontSize:14 }}
                  onClick={async()=>{
                    try{
                      setSavingSettings(true);
                      await api.put("/dos/teacher-period/settings",{ academic_year:academicYear, term, late_threshold_minutes:Number(lateThreshold||0) });
                      pushAlert({type:"late",title:"Settings Saved",message:"Updated successfully"});
                      await loadPageData();
                    }catch(err){
                      pushAlert({type:"missed",title:"Save Failed",message:err?.response?.data?.message||"Could not save"});
                    }finally{ setSavingSettings(false); }
                  }}
                >
                  {savingSettings?"Saving…":"Save Settings"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}