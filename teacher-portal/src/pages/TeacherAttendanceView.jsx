import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, XCircle, AlertTriangle, Bell, Calendar,
  ChevronRight, TrendingUp, Zap, BookOpen, ArrowRight,
  BarChart2, User, Radio, Activity, ChevronDown, ChevronLeft,
  Layers, Timer, Target, Flame, Star, Award, X, Info,
  DoorOpen, Hourglass,
} from "lucide-react";
import api from "../services/api";

/* ─── BRAND TOKENS ─── */
const NAVY   = "#000435";
const AMBER  = "#f59e0b";
const AMBERD = "#d97706";
const WHITE  = "#ffffff";

/* ─── HELPERS ─── */
function getNow()   { const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function getToday() { return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]; }
function pad(n)     { return String(n).padStart(2,"0"); }
function fmt12(t) {
  if (!t) return "—";
  const [h,m] = t.split(":").map(Number);
  return `${(h%12)||12}:${pad(m)} ${h>=12?"PM":"AM"}`;
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function weekStart() {
  const d = new Date(); d.setDate(d.getDate()-d.getDay());
  return d.toISOString().slice(0,10);
}
function diffMins(a,b) {
  const [ah,am]=a.split(":").map(Number), [bh,bm]=b.split(":").map(Number);
  return (bh*60+bm)-(ah*60+am);
}
function isUpcoming(start) {
  const now = getNow();
  return diffMins(now, start) > 0;
}
function isInProgress(start,end) {
  const now = getNow();
  return diffMins(start,now)>=0 && diffMins(now,end)>=0;
}
function minsUntil(start) {
  const now=getNow(); const d=diffMins(now,start);
  return d>0?d:null;
}

/* ─── STATUS CONFIG ─── */
const STATUS = {
  on_time:  { color:"#059669", bg:"#ecfdf5", border:"#6ee7b7", label:"On Time",    dot:"#10b981", Icon:CheckCircle2 },
  late:     { color:"#d97706", bg:"#fffbeb", border:"#fde68a", label:"Late",       dot:AMBER,     Icon:Clock        },
  missed:   { color:"#dc2626", bg:"#fff1f2", border:"#fecaca", label:"Missed",     dot:"#ef4444", Icon:XCircle      },
  upcoming: { color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", label:"Upcoming",   dot:"#60a5fa", Icon:Timer        },
  progress: { color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe", label:"In Progress",dot:"#8b5cf6", Icon:Activity     },
};

/* ─── NOTIFICATION BANNER ─── */
function NotifBanner({ notifs, onDismiss }) {
  if (!notifs.length) return null;
  const n = notifs[0];
  const colors = {
    warning: { bg:"#fffbeb", border:"#fde68a", color:"#92400e", Icon:Clock },
    danger:  { bg:"#fff1f2", border:"#fecaca", color:"#be123c", Icon:AlertTriangle },
    info:    { bg:"#eff6ff", border:"#bfdbfe", color:"#1e40af", Icon:Info },
    success: { bg:"#ecfdf5", border:"#6ee7b7", color:"#065f46", Icon:CheckCircle2 },
  };
  const c = colors[n.type] || colors.info;
  const Icon = c.Icon;
  return (
    <div style={{ position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,width:"calc(100% - 32px)",maxWidth:480,
      background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:16,padding:"13px 16px",
      boxShadow:"0 12px 40px rgba(0,4,53,0.18)",display:"flex",alignItems:"center",gap:12,
      animation:"tvSlideDown 0.4s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <div style={{ width:36,height:36,borderRadius:11,background:`${c.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <Icon size={17} color={c.color}/>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <p style={{ fontWeight:800,fontSize:13,color:NAVY,margin:0 }}>{n.title}</p>
        <p style={{ fontSize:12,color:"#6b7280",margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{n.message}</p>
      </div>
      <button onClick={()=>onDismiss(n.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexShrink:0 }}>
        <X size={15} color="#9ca3af"/>
      </button>
    </div>
  );
}

/* ─── STATUS PILL ─── */
function StatusPill({ status, size="sm" }) {
  const s = STATUS[status] || STATUS.missed;
  const Icon = s.Icon;
  const p = size==="lg"?"7px 16px":"3px 10px", fs=size==="lg"?13:11;
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.color,border:`1.5px solid ${s.border}`,borderRadius:99,padding:p,fontSize:fs,fontWeight:700,whiteSpace:"nowrap" }}>
      <Icon size={size==="lg"?15:11}/>{s.label}
    </span>
  );
}

/* ─── DOT INDICATOR ─── */
function Dot({ status, pulse }) {
  const s = STATUS[status]||STATUS.missed;
  return (
    <span style={{ display:"inline-block",width:10,height:10,borderRadius:"50%",background:s.dot,flexShrink:0,
      boxShadow:pulse?`0 0 0 4px ${s.dot}30`:"none",
      animation:pulse?"tvPulse 2s ease infinite":"none",
    }}/>
  );
}

/* ─── MINI STAT CHIP ─── */
function MiniStat({ icon:Icon, label, value, accent }) {
  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"14px 16px",border:`1.5px solid ${accent}18`,boxShadow:`0 2px 12px ${accent}0a`,textAlign:"center" }}>
      <div style={{ width:34,height:34,borderRadius:11,background:`${accent}12`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px" }}>
        <Icon size={16} color={accent}/>
      </div>
      <p style={{ fontSize:24,fontWeight:900,color:NAVY,margin:0,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:11,color:"#9ca3af",margin:"5px 0 0",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em" }}>{label}</p>
    </div>
  );
}

/* ─── PROGRESS BAR ─── */
function PeriodProgressBar({ start, end }) {
  const nowMins = (() => { const d=new Date(); return d.getHours()*60+d.getMinutes(); })();
  const startMins = (() => { const [h,m]=start.split(":").map(Number); return h*60+m; })();
  const endMins   = (() => { const [h,m]=end.split(":").map(Number);   return h*60+m; })();
  const total  = endMins-startMins;
  const elapsed= Math.min(Math.max(nowMins-startMins,0),total);
  const pct    = total>0?Math.round((elapsed/total)*100):0;
  return (
    <div style={{ height:6,borderRadius:99,background:"#e5e7eb",overflow:"hidden",marginTop:8 }}>
      <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${NAVY},#1e3a8a)`,borderRadius:99,transition:"width 1s ease" }}/>
    </div>
  );
}

/* ════════════════════════════════════════════
   PERIOD CARD (Class Period Tab)
════════════════════════════════════════════ */
function PeriodCard({ period, idx }) {
  const s = STATUS[period.status]||STATUS.upcoming;
  const inProg = period.status==="progress";
  const mins   = minsUntil(period.start_time);

  return (
    <div style={{
      background:"#fff",borderRadius:20,padding:"18px 20px",
      border:`1.5px solid ${s.border}`,
      boxShadow:inProg?`0 8px 32px ${s.dot}22`:`0 2px 14px rgba(0,4,53,0.06)`,
      animation:`tvFadeUp 0.35s ease ${idx*0.07}s both`,
      position:"relative",overflow:"hidden",
      transform:inProg?"scale(1.01)":"scale(1)",
      transition:"transform 0.2s ease",
    }}>
      {/* Active glow */}
      {inProg&&<div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${NAVY},${AMBER})`,borderRadius:"99px 99px 0 0" }}/>}

      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12 }}>
        {/* Left */}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
            <div style={{ width:28,height:28,borderRadius:9,background:`${NAVY}0e`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <BookOpen size={13} color={NAVY}/>
            </div>
            <span style={{ fontSize:12,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em" }}>P{period.period_number||idx+1}</span>
            {inProg&&<span style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:800,color:"#7c3aed",background:"#f5f3ff",border:"1.5px solid #ddd6fe",borderRadius:99,padding:"2px 8px" }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:"#8b5cf6",animation:"tvPulse 1.5s infinite" }}/>LIVE
            </span>}
          </div>

          <h3 style={{ fontSize:16,fontWeight:900,color:NAVY,margin:"0 0 3px",lineHeight:1.2 }}>{period.subject_name}</h3>
          <p style={{ fontSize:13,color:"#6b7280",margin:"0 0 10px",fontWeight:600 }}>
            {period.class_name}
            <span style={{ margin:"0 6px",color:"#d1d5db" }}>·</span>
            <span style={{ fontFamily:"'DM Mono',monospace",fontSize:12 }}>{fmt12(period.start_time)} – {fmt12(period.end_time)}</span>
          </p>

          {/* Stats row */}
          <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
            {period.entry_time&&(
              <div>
                <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Entered</p>
                <p style={{ fontSize:15,fontWeight:900,color:"#059669",margin:0,fontFamily:"'DM Mono',monospace" }}>{fmt12(period.entry_time)}</p>
              </div>
            )}
            {period.exit_time&&(
              <div>
                <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Exited</p>
                <p style={{ fontSize:15,fontWeight:900,color:"#2563eb",margin:0,fontFamily:"'DM Mono',monospace" }}>{fmt12(period.exit_time)}</p>
              </div>
            )}
            {period.late_mins>0&&(
              <div>
                <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Late By</p>
                <p style={{ fontSize:15,fontWeight:900,color:AMBERD,margin:0,fontFamily:"'DM Mono',monospace" }}>+{period.late_mins}m</p>
              </div>
            )}
            {!period.entry_time&&period.status==="upcoming"&&mins&&(
              <div>
                <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Starts In</p>
                <p style={{ fontSize:15,fontWeight:900,color:"#2563eb",margin:0,fontFamily:"'DM Mono',monospace" }}>{mins}m</p>
              </div>
            )}
          </div>

          {inProg&&<PeriodProgressBar start={period.start_time} end={period.end_time}/>}
        </div>

        {/* Right badge */}
        <div style={{ flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
          <StatusPill status={period.status}/>
        </div>
      </div>
    </div>
  );
}

/* ─── GATE TIMELINE ITEM ─── */
function GateTimelineItem({ log, idx }) {
  const statusKey = log.status==="on_time"?"on_time":log.status==="late"?"late":"missed";
  const s = STATUS[statusKey];
  return (
    <div style={{ display:"flex",gap:14,animation:`tvFadeUp 0.3s ease ${idx*0.06}s both` }}>
      {/* spine */}
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:0 }}>
        <div style={{ width:36,height:36,borderRadius:12,background:s.bg,border:`1.5px solid ${s.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          <s.Icon size={16} color={s.color}/>
        </div>
        {<div style={{ width:2,flex:1,minHeight:20,background:"#f0f1f8",borderRadius:1,margin:"4px 0" }}/>}
      </div>

      {/* card */}
      <div style={{ flex:1,background:"#fff",borderRadius:16,padding:"14px 16px",border:"1.5px solid #f0f1f8",boxShadow:"0 2px 10px rgba(0,4,53,0.05)",marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
          <p style={{ fontWeight:800,color:NAVY,fontSize:14,margin:0 }}>{log.date}</p>
          <StatusPill status={statusKey}/>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div>
            <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Entry</p>
            <p style={{ fontFamily:"'DM Mono',monospace",fontWeight:900,fontSize:15,color:"#059669",margin:0 }}>{fmt12(log.entry_time)}</p>
          </div>
          <div>
            <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 2px" }}>Exit</p>
            <p style={{ fontFamily:"'DM Mono',monospace",fontWeight:900,fontSize:15,color:log.exit_time?"#2563eb":"#9ca3af",margin:0 }}>{fmt12(log.exit_time)}</p>
          </div>
          {log.late_mins>0&&(
            <div style={{ gridColumn:"1/-1",background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:10,padding:"7px 10px",display:"flex",alignItems:"center",gap:7 }}>
              <Clock size={12} color={AMBERD}/>
              <span style={{ fontSize:12,fontWeight:700,color:"#92400e" }}>Late by {log.late_mins} minutes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function TeacherViewAttendance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState("gate");
  const [viewMode,  setViewMode]        = useState("today");   // today | week
  const [liveClock, setLiveClock]       = useState(getNow());
  const [notifs,    setNotifs]          = useState([]);
  const [notifId,   setNotifId]         = useState(0);
  const [loading,   setLoading]         = useState(true);

  /* data */
  const [todayGate,    setTodayGate]    = useState(null);
  const [gateLogs,     setGateLogs]     = useState([]);
  const [periods,      setPeriods]      = useState([]);
  const [weekPeriods,  setWeekPeriods]  = useState([]);
  const [teacher,      setTeacher]      = useState(null);
  const [monthlySummary, setMonthlySummary] = useState({ present:0, late:0, missed:0 });
  const [weekSummary,    setWeekSummary]    = useState({ total:0, late:0, missed:0, on_time:0 });
  const [consistency,    setConsistency]    = useState(null); // pct

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setLiveClock(getNow()), 30000);
    return () => clearInterval(t);
  }, []);

  const pushNotif = useCallback((n) => {
    setNotifId(prev => {
      const id = prev+1;
      setNotifs(list => [...list.slice(-3),{...n,id}]);
      setTimeout(()=>setNotifs(list=>list.filter(x=>x.id!==id)),6000);
      return id;
    });
  },[]);

  /* classify period status */
  function classifyPeriod(p) {
    if (p.entry_time && p.exit_time) {
      const statusLow = String(p.status||"").toLowerCase();
      if (statusLow==="late") return "late";
      return "on_time";
    }
    if (p.entry_time && !p.exit_time) return "progress";
    if (isUpcoming(p.start_time))     return "upcoming";
    return "missed";
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayStr();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const meRes = await api.get("/session/me");
      const me = meRes?.data?.data || meRes?.data?.user || null;
      const myTeacherId = Number(me?.id || 0);
      setTeacher(me || null);

      const [gateTodayRes, monthlyGridRes, timetableRes, todayClassRes] = await Promise.all([
        api.get("/teacher-portal/attendance-module/teacher", { params: { date: today } }),
        api.get("/teacher-portal/attendance-module/teacher/monthly-grid", { params: { month, year } }),
        api.get("/teacher-portal/timetable"),
        api.get("/teacher-portal/attendance-module/teacher-class-checkin", { params: { date: today } }),
      ]);

      const teacherRowsToday = gateTodayRes?.data?.data || [];
      const myGateToday = teacherRowsToday.find((r) => Number(r.teacher_id) === myTeacherId) || null;
      const normalizedTodayStatus = String(myGateToday?.status_in || "").toLowerCase();
      setTodayGate({
        date: today,
        entry_time: myGateToday?.check_in ? String(myGateToday.check_in).slice(11, 16) : null,
        exit_time: myGateToday?.check_out ? String(myGateToday.check_out).slice(11, 16) : null,
        status: normalizedTodayStatus === "present" ? "on_time" : normalizedTodayStatus === "late" ? "late" : "missed",
        late_mins: normalizedTodayStatus === "late" ? 1 : 0,
      });

      const gridRows = monthlyGridRes?.data?.data?.grid || [];
      const myGrid = gridRows.find((r) => Number(r.teacher_id) === myTeacherId) || null;
      if (myGrid) {
        setMonthlySummary({
          present: Number(myGrid.present_days || 0),
          late: Number(myGrid.late_days || 0),
          missed: Number(myGrid.absent_days || 0),
        });
      } else {
        setMonthlySummary({ present: 0, late: 0, missed: 0 });
      }

      // Gate timeline: fetch recent 7 days from same teacher gate endpoint.
      const recentDates = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().slice(0, 10);
      });
      const gateDayResults = await Promise.all(
        recentDates.map((d) =>
          api.get("/teacher-portal/attendance-module/teacher", { params: { date: d } })
            .then((res) => ({ date: d, rows: res?.data?.data || [] }))
            .catch(() => ({ date: d, rows: [] }))
        )
      );
      const gl = gateDayResults.map(({ date, rows }) => {
        const mine = rows.find((r) => Number(r.teacher_id) === myTeacherId) || null;
        const st = String(mine?.status_in || "").toLowerCase();
        return {
          id: `${date}-${myTeacherId}`,
          date,
          entry_time: mine?.check_in ? String(mine.check_in).slice(11, 16) : null,
          exit_time: mine?.check_out ? String(mine.check_out).slice(11, 16) : null,
          status: st === "present" ? "on_time" : st === "late" ? "late" : "missed",
          late_mins: st === "late" ? 1 : 0,
        };
      });
      setGateLogs(gl);

      // Build today's timetable periods and merge with class check-in tap logs.
      const dayName = getToday();
      const ttRows = (timetableRes?.data?.data || [])
        .filter((r) => String(r.day_of_week || "") === dayName)
        .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));

      const todayRows = (todayClassRes?.data?.data?.rows || [])
        .filter((r) => Number(r.teacher_id) === myTeacherId);

      const periodMap = new Map(todayRows.map((r) => [`${r.class_id}__${r.period}`, r]));
      const tp = ttRows.map((row, i) => {
        const start = String(row.start_time || "").slice(0, 5);
        const end = String(row.end_time || "").slice(0, 5);
        const periodKey = `P${i + 1}`;
        const check = periodMap.get(`${row.group}__${periodKey}`) || null;
        const st = String(check?.status || "").toLowerCase();
        const status = st === "present" ? "on_time" : st === "late" ? "late" : classifyPeriod({ start_time: start, end_time: end });
        return {
          id: `${today}-${periodKey}-${row.group}`,
          period_number: i + 1,
          class_name: row.group || row.roster_class_name || "",
          subject_name: row.subject || "",
          start_time: start,
          end_time: end,
          entry_time: check?.check_time ? String(check.check_time).slice(11, 16) : null,
          exit_time: null,
          late_mins: st === "late" ? 1 : 0,
          status,
          day_of_week: dayName,
        };
      });
      setPeriods(tp);

      // Weekly merge: last 5 weekdays.
      const weekdayDates = [];
      for (let i = 0; i < 7; i += 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const wd = d.getDay();
        if (wd >= 1 && wd <= 5) weekdayDates.push(d.toISOString().slice(0, 10));
        if (weekdayDates.length >= 5) break;
      }
      const weeklyClassResults = await Promise.all(
        weekdayDates.map((d) =>
          api.get("/teacher-portal/attendance-module/teacher-class-checkin", { params: { date: d } })
            .then((res) => ({ date: d, rows: res?.data?.data?.rows || [] }))
            .catch(() => ({ date: d, rows: [] }))
        )
      );
      const wp = [];
      for (const { date, rows } of weeklyClassResults) {
        const d = new Date(`${date}T12:00:00`);
        const dn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
        const dayTt = (timetableRes?.data?.data || [])
          .filter((r) => String(r.day_of_week || "") === dn)
          .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));
        const mineRows = rows.filter((r) => Number(r.teacher_id) === myTeacherId);
        const dayMap = new Map(mineRows.map((r) => [`${r.class_id}__${r.period}`, r]));
        dayTt.forEach((row, i) => {
          const periodKey = `P${i + 1}`;
          const check = dayMap.get(`${row.group}__${periodKey}`) || null;
          const st = String(check?.status || "").toLowerCase();
          wp.push({
            id: `${date}-${periodKey}-${row.group}`,
            period_number: i + 1,
            class_name: row.group || row.roster_class_name || "",
            subject_name: row.subject || "",
            start_time: String(row.start_time || "").slice(0, 5),
            end_time: String(row.end_time || "").slice(0, 5),
            entry_time: check?.check_time ? String(check.check_time).slice(11, 16) : null,
            exit_time: null,
            late_mins: st === "late" ? 1 : 0,
            status: st === "present" ? "on_time" : st === "late" ? "late" : "missed",
            day_of_week: dn,
          });
        });
      }
      setWeekPeriods(wp);

      const ws = {
        total: wp.length,
        late: wp.filter((p) => p.status === "late").length,
        missed: wp.filter((p) => p.status === "missed").length,
        on_time: wp.filter((p) => p.status === "on_time").length,
      };
      setWeekSummary(ws);
      const pct = ws.total > 0 ? Math.round((ws.on_time / ws.total) * 100) : null;
      setConsistency(pct);

      const nextPeriod = tp.find((p) => p.status === "upcoming");
      if (nextPeriod) {
        const mins = minsUntil(nextPeriod.start_time);
        if (mins && mins <= 10) pushNotif({ type: "warning", title: `P${nextPeriod.period_number} starts in ${mins} min`, message: `${nextPeriod.subject_name} — ${nextPeriod.class_name}` });
      }
      const latePeriod = tp.find((p) => p.status === "late");
      if (latePeriod && latePeriod.entry_time) pushNotif({ type: "warning", title: "Late Entry Recorded", message: `You were late for ${latePeriod.subject_name}` });
      const missedToday = tp.filter((p) => p.status === "missed");
      if (missedToday.length > 0) pushNotif({ type: "danger", title: `${missedToday.length} Missed ${missedToday.length === 1 ? "Period" : "Periods"} Today`, message: `${missedToday.map((p) => p.subject_name).join(", ")}` });
    } catch (err) {
      pushNotif({ type: "danger", title: "Load Error", message: err?.response?.data?.message || "Failed to load attendance" });
    } finally {
      setLoading(false);
    }
  }, [pushNotif]);

  useEffect(()=>{ loadData(); },[loadData]);

  /* derived */
  const todayPeriodsDisplay = viewMode==="week" ? weekPeriods : periods;
  const periodsDone      = periods.filter(p=>["on_time","late"].includes(p.status)).length;
  const periodsLate      = periods.filter(p=>p.status==="late").length;
  const periodsUpcoming  = periods.filter(p=>["upcoming","progress"].includes(p.status)).length;
  const nextClass        = periods.find(p=>p.status==="upcoming"||p.status==="progress");
  const todayGateStatus  = todayGate?.status ? String(todayGate.status).toLowerCase() : null;
  const dayName          = getToday();

  /* late alert string */
  const lateThisWeek = weekPeriods.filter(p=>p.status==="late").length;
  const lateGateWeek = gateLogs.filter(l=>l.status==="late").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Mono:ital,wght@0,400;0,500;0,700;1,400&display=swap');

        @keyframes tvFadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes tvSlideDown { from{opacity:0;transform:translateX(-50%) translateY(-20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes tvPop       { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        @keyframes tvPulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.92)} }
        @keyframes tvSpin      { to{transform:rotate(360deg)} }
        @keyframes tvShimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes tvBeat      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes tvSlideRight{ from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }

        .tv-page {
          font-family:'Sora',sans-serif;
          min-height:calc(100vh - 80px);
          background:radial-gradient(1200px 500px at 50% -180px, #e4ebff 0%, #f0f2f9 52%, #eef1f9 100%);
          max-width:100%;
          margin:0 auto;
          padding:8px 0 32px;
        }

        .tv-shell {
          margin: 10px auto 0;
          max-width: 920px;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,4,53,0.08);
          backdrop-filter: blur(10px);
          overflow: hidden;
        }

        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:#e2e5ef; border-radius:99px; }

        input:focus,select:focus { border-color:${AMBER}!important; box-shadow:0 0 0 3px ${AMBER}22!important; outline:none!important; }

        .tv-tab { transition:all 0.22s ease; cursor:pointer; font-family:'Sora',sans-serif; position:relative; }
        .tv-tab.active { background:${WHITE}!important; color:${NAVY}!important; box-shadow:0 10px 24px rgba(0,4,53,0.16); }
        .tv-tab.active::after {
          content:"";
          position:absolute;
          left:18%;
          right:18%;
          bottom:0;
          height:2.5px;
          border-radius:99px;
          background:linear-gradient(90deg, ${AMBER}, #ffd089);
        }
        .tv-tab:not(.active):hover { background:rgba(255,255,255,0.16)!important; color:#fff!important; }

        .tv-card { transition:transform 0.18s ease,box-shadow 0.18s ease; }
        .tv-card:hover { transform:translateY(-2px); }

        .tv-skeleton {
          background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%);
          background-size:200% 100%;
          animation:tvShimmer 1.4s infinite;
          border-radius:16px;
        }

        /* Toggle switch */
        .tv-toggle { display:flex; background:rgba(255,255,255,0.1); border-radius:12px; padding:3px; gap:2px; }
        .tv-toggle-btn { padding:7px 16px; border-radius:10px; border:none; cursor:pointer; font-size:12px; font-weight:700; font-family:'Sora',sans-serif; transition:all 0.18s ease; color:rgba(255,255,255,0.6); background:transparent; }
        .tv-toggle-btn.active { background:${WHITE}; color:${NAVY}; box-shadow:0 2px 8px rgba(0,4,53,0.14); }

        /* View mode toggle */
        .tv-view-toggle { display:flex; background:#f0f2f9; border-radius:12px; padding:3px; gap:2px; }
        .tv-view-btn { padding:8px 18px; border-radius:10px; border:none; cursor:pointer; font-size:12px; font-weight:700; font-family:'Sora',sans-serif; transition:all 0.18s ease; color:#9ca3af; background:transparent; }
        .tv-view-btn.active { background:${WHITE}; color:${NAVY}; box-shadow:0 2px 8px rgba(0,4,53,0.10); }

        @media(max-width:640px) {
          .tv-shell { margin: 0; max-width: 100%; border-radius: 0; border-left: none; border-right: none; }
          .tv-page { padding-top: 0; }
        }

        @media(max-width:480px) {
          .tv-stats-grid { grid-template-columns:1fr 1fr!important; }
          .tv-today-grid { grid-template-columns:1fr!important; }
          .tv-header-info { font-size:15px!important; }
        }
      `}</style>

      <NotifBanner notifs={notifs} onDismiss={id=>setNotifs(l=>l.filter(x=>x.id!==id))}/>

      <div className="tv-page">
        {/* Navigation Toggle identical to Attendance.jsx */}
        <div className="mb-4 bg-white border border-black/5 rounded-2xl p-2 flex flex-wrap gap-2 w-full md:w-fit shadow-sm">
            <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted hover:bg-black/5 transition-all"
            >
                Period attendance
            </button>
            <button
                type="button"
                onClick={() => navigate('/round-roll-call')}
                className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-bg text-re-text-muted hover:bg-black/5 transition-all"
            >
                Round roll call
            </button>
            <button
                type="button"
                className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest bg-re-grad-orange text-white"
            >
                Teacher attendance
            </button>
        </div>

        <div className="tv-shell">

        {/* ══════════ HEADER ══════════ */}
        <div style={{ background:`linear-gradient(145deg, ${NAVY} 0%, #000b55 55%, #001380 100%)`, position:"relative", overflow:"hidden", paddingBottom:0, borderRadius:"20px 20px 0 0" }}>
          {/* Decorative rings */}
          <div style={{ position:"absolute",top:-60,right:-60,width:220,height:220,borderRadius:"50%",border:`1.5px solid ${AMBER}14`,pointerEvents:"none" }}/>
          <div style={{ position:"absolute",top:-20,right:-20,width:130,height:130,borderRadius:"50%",border:`1.5px solid ${AMBER}1f`,pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:0,left:-40,width:180,height:180,borderRadius:"50%",background:`${AMBER}06`,pointerEvents:"none" }}/>

          <div style={{ position:"relative",zIndex:1,padding:"20px 20px 0" }}>
            {/* Top bar */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:42,height:42,borderRadius:14,background:`${AMBER}1c`,border:`1.5px solid ${AMBER}33`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <User size={20} color={AMBER}/>
                </div>
                <div>
                  <p style={{ color:"rgba(255,255,255,0.45)",fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2 }}>My Attendance</p>
                  <p className="tv-header-info" style={{ color:"#fff",fontSize:17,fontWeight:900,letterSpacing:"-0.3px" }}>
                    {loading?"Loading…":teacher?.teacher_name||"Teacher"}
                  </p>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2 }}>Current Time</p>
                <p style={{ color:"#fff",fontSize:22,fontWeight:900,fontFamily:"'DM Mono',monospace",letterSpacing:2 }}>{liveClock}</p>
              </div>
            </div>

            {/* TODAY STATUS HERO */}
            {!loading&&(
              <div style={{
                background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:22,padding:"18px 20px",marginBottom:0,backdropFilter:"blur(12px)",
                animation:"tvFadeUp 0.4s ease",
              }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                  <div>
                    <p style={{ color:"rgba(255,255,255,0.45)",fontSize:10,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:3 }}>Today — {dayName}</p>
                    <p style={{ color:"#fff",fontSize:16,fontWeight:800,margin:0 }}>
                      {todayGate?"Gate Attendance Overview":"No gate attendance yet"}
                    </p>
                  </div>
                  {todayGateStatus&&(
                    <div style={{ background:STATUS[todayGateStatus]?.bg||"rgba(255,255,255,0.1)",borderRadius:12,padding:"7px 13px",border:`1.5px solid ${STATUS[todayGateStatus]?.border||"rgba(255,255,255,0.2)"}` }}>
                      <span style={{ fontSize:12,fontWeight:800,color:STATUS[todayGateStatus]?.color||"#fff" }}>
                        {STATUS[todayGateStatus]?.label||"—"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Entry / Exit times row */}
                <div className="tv-today-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12 }}>
                  <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ color:"rgba(255,255,255,0.4)",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4,display:"flex",alignItems:"center",gap:5 }}>
                      <Clock size={11} color="rgba(255,255,255,0.45)" strokeWidth={2.25} aria-hidden /> Entry
                    </p>
                    <p style={{ color:todayGate?.entry_time?"#6ee7b7":"rgba(255,255,255,0.3)",fontSize:17,fontWeight:900,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>
                      {fmt12(todayGate?.entry_time)}
                    </p>
                    {todayGate?.late_mins>0&&(
                      <p style={{ color:AMBER,fontSize:10,fontWeight:700,marginTop:3 }}>+{todayGate.late_mins}m late</p>
                    )}
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ color:"rgba(255,255,255,0.4)",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4,display:"flex",alignItems:"center",gap:5 }}>
                      <DoorOpen size={11} color="rgba(255,255,255,0.45)" strokeWidth={2.25} aria-hidden /> Exit
                    </p>
                    <p style={{ color:todayGate?.exit_time?"#93c5fd":"rgba(255,255,255,0.3)",fontSize:17,fontWeight:900,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>
                      {fmt12(todayGate?.exit_time)}
                    </p>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.1)" }}>
                    <p style={{ color:"rgba(255,255,255,0.4)",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4,display:"flex",alignItems:"center",gap:5 }}>
                      <BookOpen size={11} color="rgba(255,255,255,0.45)" strokeWidth={2.25} aria-hidden /> Periods
                    </p>
                    <p style={{ color:"#fff",fontSize:17,fontWeight:900,fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{periodsDone}/{periods.length}</p>
                    <p style={{ color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,marginTop:3 }}>done</p>
                  </div>
                </div>

                {/* Period mini chips */}
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {[
                    { key:"done", Icon: CheckCircle2, text:`${periodsDone} Done`,    color:"#6ee7b7",  bg:"rgba(16,185,129,0.15)",  border:"rgba(16,185,129,0.3)"  },
                    { key:"late", Icon: Clock,         text:`${periodsLate} Late`,    color:AMBER,      bg:`rgba(245,158,11,0.14)`,  border:`rgba(245,158,11,0.3)`  },
                    { key:"up",   Icon: Hourglass,    text:`${periodsUpcoming} Upcoming`, color:"#93c5fd",  bg:"rgba(96,165,250,0.14)", border:"rgba(96,165,250,0.3)" },
                  ].map(({ key, Icon, text, ...c })=>(
                    <span key={key} style={{ fontSize:11,fontWeight:800,color:c.color,background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:99,padding:"4px 10px",display:"inline-flex",alignItems:"center",gap:5 }}>
                      <Icon size={12} strokeWidth={2.5} aria-hidden />{text}
                    </span>
                  ))}
                </div>

                {/* Next class teaser */}
                {nextClass&&(
                  <div style={{ marginTop:12,background:"rgba(245,158,11,0.12)",border:"1.5px solid rgba(245,158,11,0.25)",borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
                    <Zap size={14} color={AMBER}/>
                    <p style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)",margin:0 }}>
                      <span style={{ color:AMBER,fontWeight:900 }}>Next: </span>
                      {nextClass.subject_name} (P{nextClass.period_number})
                      {minsUntil(nextClass.start_time)&&<span style={{ color:"rgba(255,255,255,0.5)" }}> · in {minsUntil(nextClass.start_time)}m</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {loading&&(
              <div style={{ height:160,borderRadius:22,marginBottom:0 }} className="tv-skeleton"/>
            )}

            {/* Weekly consistency strip */}
            {consistency!==null&&!loading&&(
              <div style={{ display:"flex",alignItems:"center",gap:10,margin:"14px 0 0",padding:"10px 16px",background:"rgba(255,255,255,0.06)",borderRadius:14,border:"1px solid rgba(255,255,255,0.1)" }}>
                <Target size={13} color={AMBER}/>
                <p style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.7)",margin:0 }}>
                  This week: <span style={{ color:consistency>=80?"#6ee7b7":consistency>=60?AMBER:"#f87171",fontWeight:900 }}>{consistency}% on time</span>
                </p>
                {lateThisWeek>0&&(
                  <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:4 }}>
                    <AlertTriangle size={12} color="rgba(255,255,255,0.45)" strokeWidth={2.25} aria-hidden />
                    {lateThisWeek} late period{lateThisWeek>1?"s":""}
                  </span>
                )}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:"flex",gap:4,marginTop:16,borderBottom:"none",paddingBottom:2 }}>
              {[
                { key:"gate",   label:"Gate Attendance", icon:User   },
                { key:"period", label:"Class Periods",   icon:BookOpen },
              ].map(({key,label,icon:Icon})=>(
                <button key={key} type="button" className={`tv-tab ${activeTab===key?"active":""}`} onClick={()=>setActiveTab(key)} style={{
                  flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                  padding:"12px 14px",borderRadius:"14px 14px 0 0",border:"none",
                  background:activeTab===key?"#fff":"rgba(255,255,255,0.07)",
                  color:activeTab===key?NAVY:"rgba(255,255,255,0.55)",
                  fontWeight:700,fontSize:13,
                }}>
                  <Icon size={14}/>{label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ CONTENT ══════════ */}
        <div style={{ padding:"22px 16px 20px", background:"linear-gradient(180deg,#f8faff 0%, #f3f6fc 100%)" }}>

          {/* ── GATE TAB ── */}
          {activeTab==="gate"&&(
            <div style={{ animation:"tvFadeUp 0.35s ease" }}>

              {/* Monthly summary cards */}
              <div className="tv-stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
                <MiniStat icon={CheckCircle2} label="Present"   value={monthlySummary.present} accent="#10b981"/>
                <MiniStat icon={Clock}        label="Late Days" value={monthlySummary.late}    accent={AMBER}/>
                <MiniStat icon={XCircle}      label="Missed"    value={monthlySummary.missed}  accent="#ef4444"/>
              </div>

              {/* Self-awareness banner */}
              {lateGateWeek>0&&(
                <div style={{ background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:16,padding:"13px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12,animation:"tvSlideRight 0.35s ease" }}>
                  <div style={{ width:36,height:36,borderRadius:11,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Flame size={17} color={AMBERD}/>
                  </div>
                  <div>
                    <p style={{ fontWeight:800,fontSize:13,color:NAVY,margin:0 }}>Heads up!</p>
                    <p style={{ fontSize:12,color:"#92400e",margin:"2px 0 0" }}>You were late {lateGateWeek} time{lateGateWeek>1?"s":""} this week</p>
                  </div>
                </div>
              )}

              {/* Section header */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <Activity size={15} color={NAVY}/>
                  <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>Attendance History</span>
                </div>
                <span style={{ fontSize:12,color:"#9ca3af",fontWeight:700 }}>This Month</span>
              </div>

              {/* Timeline */}
              {loading?(
                [...Array(4)].map((_,i)=>(
                  <div key={i} style={{ height:100,borderRadius:16,marginBottom:12 }} className="tv-skeleton"/>
                ))
              ):gateLogs.length===0?(
                <div style={{ textAlign:"center",padding:"48px 20px",color:"#9ca3af",background:"#fff",borderRadius:18,border:"1px solid #edf1fb" }}>
                  <Calendar size={36} style={{ margin:"0 auto 12px",display:"block",opacity:0.25 }}/>
                  <p style={{ fontWeight:800,fontSize:14,margin:0 }}>No records found</p>
                  <p style={{ fontSize:13,margin:"4px 0 0" }}>Your gate attendance will appear here</p>
                </div>
              ):(
                <div style={{ position:"relative" }}>
                  {/* vertical spine bg */}
                  <div style={{ position:"absolute",left:17,top:36,bottom:12,width:2,background:"#f0f1f8",borderRadius:1,zIndex:0 }}/>
                  {gateLogs.map((log,i)=>(
                    <GateTimelineItem key={log.id||i} log={log} idx={i}/>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PERIOD TAB ── */}
          {activeTab==="period"&&(
            <div style={{ animation:"tvFadeUp 0.35s ease" }}>

              {/* View toggle */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <BookOpen size={15} color={NAVY}/>
                  <span style={{ fontWeight:800,fontSize:15,color:NAVY }}>
                    {viewMode==="today"?"Today's Schedule":"This Week"}
                  </span>
                </div>
                <div className="tv-view-toggle">
                  {[{k:"today",l:"Today"},{k:"week",l:"Week"}].map(({k,l})=>(
                    <button key={k} type="button" className={`tv-view-btn ${viewMode===k?"active":""}`} onClick={()=>setViewMode(k)}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Week performance summary */}
              {viewMode==="week"&&(
                <div className="tv-stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20 }}>
                  <MiniStat icon={CheckCircle2} label="Done"   value={weekSummary.on_time} accent="#10b981"/>
                  <MiniStat icon={Clock}        label="Late"   value={weekSummary.late}    accent={AMBER}/>
                  <MiniStat icon={XCircle}      label="Missed" value={weekSummary.missed}  accent="#ef4444"/>
                </div>
              )}

              {/* Missed warning */}
              {viewMode==="today"&&periods.filter(p=>p.status==="missed").length>0&&(
                <div style={{ background:"#fff1f2",border:"1.5px solid #fecaca",borderRadius:16,padding:"13px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12,animation:"tvSlideRight 0.3s ease" }}>
                  <div style={{ width:36,height:36,borderRadius:11,background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <AlertTriangle size={17} color="#dc2626"/>
                  </div>
                  <div>
                    <p style={{ fontWeight:800,fontSize:13,color:NAVY,margin:0 }}>Missed Period{periods.filter(p=>p.status==="missed").length>1?"s":""}</p>
                    <p style={{ fontSize:12,color:"#be123c",margin:"2px 0 0" }}>
                      You missed {periods.filter(p=>p.status==="missed").length} class{periods.filter(p=>p.status==="missed").length>1?"es":""} today
                    </p>
                  </div>
                </div>
              )}

              {/* Consistency badge */}
              {viewMode==="week"&&consistency!==null&&(
                <div style={{ background:consistency>=80?"#ecfdf5":consistency>=60?"#fffbeb":"#fff1f2", border:`1.5px solid ${consistency>=80?"#6ee7b7":consistency>=60?"#fde68a":"#fecaca"}`, borderRadius:16, padding:"13px 16px", marginBottom:16, display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:11,background:consistency>=80?"#d1fae5":consistency>=60?"#fef3c7":"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <Award size={17} color={consistency>=80?"#059669":consistency>=60?AMBERD:"#dc2626"}/>
                  </div>
                  <div>
                    <p style={{ fontWeight:800,fontSize:13,color:NAVY,margin:0 }}>
                      {consistency>=80?"Great consistency!":consistency>=60?"Room to improve":"Needs attention"}
                    </p>
                    <p style={{ fontSize:12,color:"#6b7280",margin:"2px 0 0" }}>
                      {consistency}% of periods on time this week
                    </p>
                  </div>
                  <div style={{ marginLeft:"auto",display:"flex",flexDirection:"column",alignItems:"flex-end" }}>
                    <span style={{ fontSize:26,fontWeight:900,color:consistency>=80?"#059669":consistency>=60?AMBERD:"#dc2626",fontFamily:"'DM Mono',monospace",lineHeight:1 }}>{consistency}%</span>
                  </div>
                </div>
              )}

              {/* Period cards */}
              {loading?(
                [...Array(3)].map((_,i)=>(
                  <div key={i} style={{ height:130,borderRadius:20,marginBottom:12 }} className="tv-skeleton"/>
                ))
              ):todayPeriodsDisplay.length===0?(
                <div style={{ textAlign:"center",padding:"52px 20px",color:"#9ca3af",background:"#fff",borderRadius:18,border:"1px solid #edf1fb" }}>
                  <BookOpen size={36} style={{ margin:"0 auto 12px",display:"block",opacity:0.25 }}/>
                  <p style={{ fontWeight:800,fontSize:14,margin:0 }}>No periods {viewMode==="today"?"today":"this week"}</p>
                  <p style={{ fontSize:13,margin:"4px 0 0" }}>Your class schedule will appear here</p>
                </div>
              ):(
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {todayPeriodsDisplay.map((p,i)=><PeriodCard key={p.id||i} period={p} idx={i}/>)}
                </div>
              )}

              {/* Week date grouping labels for week view */}
              {viewMode==="week"&&weekPeriods.length>0&&(
                <div style={{ marginTop:20,padding:"14px 16px",background:"#fff",borderRadius:16,border:"1.5px solid #f0f1f8",boxShadow:"0 2px 10px rgba(0,4,53,0.05)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                    <BarChart2 size={15} color={NAVY}/>
                    <span style={{ fontWeight:800,fontSize:13,color:NAVY }}>Weekly Breakdown</span>
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    {["Monday","Tuesday","Wednesday","Thursday","Friday"].map(day=>{
                      const dayPeriods = weekPeriods.filter(p=>p.day_of_week===day||p.day===day);
                      if (!dayPeriods.length) return null;
                      const done = dayPeriods.filter(p=>["on_time","late"].includes(p.status)).length;
                      const pct  = dayPeriods.length>0?Math.round((done/dayPeriods.length)*100):0;
                      return (
                        <div key={day} style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <span style={{ width:80,fontSize:12,fontWeight:700,color:"#6b7280",flexShrink:0 }}>{day.slice(0,3)}</span>
                          <div style={{ flex:1,height:7,borderRadius:99,background:"#f0f1f8",overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:pct>=80?"#10b981":pct>=60?AMBER:"#ef4444",borderRadius:99,transition:"width 1s ease" }}/>
                          </div>
                          <span style={{ width:36,fontSize:11,fontWeight:800,color:pct>=80?"#059669":pct>=60?AMBERD:"#dc2626",fontFamily:"'DM Mono',monospace",textAlign:"right",flexShrink:0 }}>{pct}%</span>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        </div>
      </div>
    </>
  );
}