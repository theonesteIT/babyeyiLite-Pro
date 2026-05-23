import { useState, useRef, useEffect, useCallback, useMemo, createElement } from "react";
import ReminderHeroShell from "../../components/ReminderHeroShell";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  BellRing,
  MessageSquare,
  Zap,
  AlertTriangle,
  FileText,
  Handshake,
  Bus,
  Mail,
  Bell,
  Smartphone,
  Search,
  Users,
  XCircle,
  AlertCircle,
  CheckCircle,
  Send,
  Bot,
  GraduationCap,
  Lightbulb,
  Clock,
  Calendar,
  CircleDollarSign,
  X,
  Check,
  Rocket,
  Timer,
  Banknote,
  Trash2,
  Pencil,
  RotateCcw,
  File,
  Pause,
  Radio,
  Trophy,
  CreditCard,
  MailOpen,
  TrendingUp,
  Plus,
  Circle,
  Loader2,
  Download,
} from "lucide-react";
import {
  fetchFeeReminderOptions,
  fetchFeeReminderStudents,
  fetchFeeReminderCampaigns,
  fetchFeeReminderCampaignDetail,
  createFeeReminderCampaign,
  fetchFeeReminderRules,
  createFeeReminderRule,
  updateFeeReminderRule,
  deleteFeeReminderRule,
  runFeeReminderRuleNow,
  previewFeeReminderRuleMatch,
  mapStudentForUi,
  filterCampaignRecipients,
  computeCampaignChannelStats,
  computeBucketCounts,
  formatBalanceRwf,
} from "../../services/feeReminderApi";

// ─── GLOBAL CONSTANTS ───────────────────────────────────────────────
const C = {
  navy: "#000435", navyD: "#00022a", navyL: "#000b6e",
  amber: "#F59E0B", amberL: "#FCD34D", amberD: "#D97706", amberPale: "#FEF3C7",
  white: "#FFFFFF", bg: "#F0F2FF",
  border: "rgba(0,4,53,0.1)", borderAmber: "rgba(245,158,11,0.3)",
  muted: "#6B7280", light: "#9CA3AF",
  success: "#10B981", successL: "#ECFDF5", successD: "#065F46",
  danger: "#EF4444", dangerL: "#FEF2F2", dangerD: "#991B1B",
  info: "#3B82F6", infoL: "#EFF6FF", infoD: "#1E40AF",
  warn: "#F59E0B", warnL: "#FFFBEB", warnD: "#92400E",
};

const FONT_URL = "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap";

/** Preset IF conditions — must match backend feeReminderRuleScheduler parser */
const CONDITION_PRESETS = [
  { condition: "Balance < 400000", meaning: "Owes less than 400,000 RWF" },
  { condition: "Balance >= 50000", meaning: "Owes at least 50,000 RWF" },
  { condition: "Balance > 0", meaning: "Any outstanding balance" },
  { condition: "Status = unpaid", meaning: "Not paid" },
  { condition: "Status = partial", meaning: "Partially paid" },
  { condition: "Overdue > 7 days", meaning: "No payment for 7+ days" },
  { condition: "Overdue >= 15 days", meaning: "Seriously overdue (15+ days)" },
  { condition: "Small balance", meaning: "Balance between 1 and 49,999 RWF" },
];

const AND_CONDITION_PRESETS = [
  { condition: "", meaning: "No extra filter" },
  { condition: "Overdue > 7 days", meaning: "No payment for 7+ days" },
  { condition: "Overdue >= 15 days", meaning: "Seriously overdue (15+ days)" },
  { condition: "Status = unpaid", meaning: "Only unpaid students" },
  { condition: "Balance > 0", meaning: "Only with balance owed" },
  { condition: "Small balance", meaning: "Balance under 50,000 RWF" },
];

const CUSTOM_COND = "__custom__";

function ConditionField({ label, value, onChange, presets, required, optional }) {
  const trimmed = String(value ?? "").trim();
  const matched = presets.find((p) => p.condition === trimmed);
  const selectValue = matched ? matched.condition : optional && !trimmed ? "" : CUSTOM_COND;

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === CUSTOM_COND) return;
    onChange(v);
  };

  return (
    <div>
      <span className="lbl">
        {label}
        {required ? " *" : ""}
      </span>
      <select className="sel" style={{ width: "100%", marginBottom: 8 }} value={selectValue} onChange={handleSelect}>
        {optional ? (
          <option value="">— None (no AND filter) —</option>
        ) : (
          <option value="" disabled>
            Choose a condition…
          </option>
        )}
        <option value={CUSTOM_COND}>Custom — type or edit below</option>
        {presets
          .filter((p) => p.condition)
          .map((p) => (
            <option key={p.condition} value={p.condition}>
              {p.condition} — {p.meaning}
            </option>
          ))}
      </select>
      <input
        className="inp"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          optional
            ? "Optional — select above or type e.g. Overdue > 7 days"
            : "Select above or type e.g. Balance < 400000"
        }
      />
      {matched ? (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{matched.meaning}</div>
      ) : trimmed ? (
        <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>
          Custom text — use Balance, Status, Overdue, or Small balance format.
        </div>
      ) : null}
    </div>
  );
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "Reminder History", icon: ClipboardList },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "autorules", label: "Auto Rules", icon: Settings },
];

const TEMPLATES = [
  { id:"gentle", name:"Gentle Reminder", Icon: MessageSquare, desc:"Kind tone for first notice", bg:"#EFF6FF", accent:C.info, subject:"Friendly Reminder – School Fees Term 2", body:"Dear {ParentName},\n\nWe hope this message finds you well.\n\nThis is a gentle reminder that {StudentName} has an outstanding balance of {Balance} RWF for Term 2.\n\nKindly visit the school office or use our payment portal at your earliest convenience.\n\nThank you for your continued support.\n\nWarm regards,\n{SchoolName}" },
  { id:"urgent", name:"Urgent Reminder", Icon: Zap, desc:"Firm tone for overdue balances", bg:"#FEF3C7", accent:C.amberD, subject:"URGENT: Outstanding Fees – Action Required", body:"Dear {ParentName},\n\nThis is an urgent notice regarding {StudentName}'s outstanding balance of {Balance} RWF for Term 2.\n\nPayment is overdue. Please settle this balance before {Deadline} to avoid disruption to your child's studies.\n\nContact us immediately at the school office.\n\nRegards,\n{SchoolName}" },
  { id:"final", name:"Final Warning", Icon: AlertTriangle, desc:"Last notice before action taken", bg:"#FEF2F2", accent:C.danger, subject:"FINAL NOTICE – Immediate Payment Required", body:"Dear {ParentName},\n\nThis is our FINAL NOTICE regarding {StudentName}'s unpaid balance of {Balance} RWF.\n\nFailure to pay before {Deadline} will result in suspension from classes and denial of exam access.\n\nThis matter requires your IMMEDIATE attention.\n\n{SchoolName} Administration" },
  { id:"exam", name:"Exam Access", Icon: FileText, desc:"Linked to exam clearance", bg:"#F0FDF4", accent:C.success, subject:"Exam Access – Fee Clearance Required", body:"Dear {ParentName},\n\nExaminations are approaching for {StudentName} in {Class}.\n\nTo guarantee exam access, the outstanding balance of {Balance} RWF must be cleared before {Deadline}.\n\nPlease visit the bursar's office immediately.\n\n{SchoolName}" },
  { id:"pta", name:"PTA Contribution", Icon: Handshake, desc:"For PTA meeting fees", bg:"#FAF5FF", accent:"#7C3AED", subject:"PTA Meeting Contribution Reminder", body:"Dear {ParentName},\n\nThe Parent-Teacher Association meeting is scheduled soon.\n\nWe kindly request your contribution of {Balance} RWF before {Deadline}.\n\nYour participation strengthens our school community.\n\nThank you,\n{SchoolName} PTA" },
  { id:"transport", name:"Transport Fees", Icon: Bus, desc:"For bus/transport balance", bg:"#FFF7ED", accent:"#EA580C", subject:"School Transport Fees – Balance Remaining", body:"Dear {ParentName},\n\nThis is a reminder that {StudentName} has an unpaid transport fee balance of {Balance} RWF for Term 2.\n\nPlease ensure payment is made before {Deadline} to continue using the school bus service.\n\nThank you,\n{SchoolName}" },
];

// ─── SCOPED STYLES (must not leak to portal Sidebar / TopNav) ───────
const GS = `
@import url('${FONT_URL}');
.reminder-root,
.reminder-root *,
.reminder-root *::before,
.reminder-root *::after { box-sizing: border-box; }
.reminder-root {
  font-family: 'Montserrat', sans-serif;
  min-height: 100%;
  width: 100%;
  background: #F5F7FA;
  color: ${C.navy};
}
.reminder-root .page { padding: 0 0 32px; flex: 1; width: 100%; }
.reminder-root .card { background: white; border-radius: 20px; border: 1px solid rgba(0,4,53,0.08); padding: 22px; box-shadow: 0 1px 2px rgba(0,4,53,0.04); }
.reminder-root .card-sm { background: white; border-radius: 12px; border: 1px solid ${C.border}; padding: 16px; }
.reminder-root .btn { font-family: 'Montserrat', sans-serif; cursor: pointer; transition: all .18s; border: none; font-weight: 600; }
.reminder-root .btn-amber { background: ${C.amber}; color: ${C.navy}; padding: 11px 22px; border-radius: 11px; font-size: 13px; }
.reminder-root .btn-amber:hover { background: ${C.amberD}; transform: translateY(-1px); }
.reminder-root .btn-navy { background: ${C.navy}; color: white; padding: 11px 22px; border-radius: 11px; font-size: 13px; }
.reminder-root .btn-navy:hover { background: ${C.navyL}; }
.reminder-root .btn-ghost { background: transparent; border: 1.5px solid ${C.border}; color: ${C.navy}; padding: 9px 18px; border-radius: 10px; font-size: 12px; }
.reminder-root .btn-ghost:hover { border-color: ${C.amber}; background: ${C.amberPale}; }
.reminder-root .btn-danger { background: ${C.dangerL}; color: ${C.dangerD}; border: 1px solid #FCA5A5; padding: 7px 14px; border-radius: 8px; font-size: 12px; }
.reminder-root .btn-success { background: ${C.successL}; color: ${C.successD}; border: 1px solid #6EE7B7; padding: 7px 14px; border-radius: 8px; font-size: 12px; }
.reminder-root .btn-sm { padding: 7px 14px; border-radius: 8px; font-size: 12px; }
.reminder-root .inp { font-family: 'Montserrat', sans-serif; border: 1.5px solid ${C.border}; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: ${C.navy}; width: 100%; outline: none; transition: border .2s; }
.reminder-root .inp:focus { border-color: ${C.amber}; }
.reminder-root .sel { font-family: 'Montserrat', sans-serif; border: 1.5px solid ${C.border}; border-radius: 10px; padding: 9px 14px; font-size: 13px; color: ${C.navy}; background: white; appearance: none; cursor: pointer; outline: none; }
.reminder-root .sel:focus { border-color: ${C.amber}; }
.reminder-root .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; letter-spacing: .04em; }
.reminder-root .stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px;
  border: 1.5px solid ${C.navy};
}
.reminder-root .stat-card.accent { border-color: ${C.amber}; }
.reminder-root .stat-card .stat-val { font-size: 22px; font-weight: 600; color: ${C.navy}; line-height: 1.2; }
.reminder-root .stat-card .stat-lbl { font-size: 11px; font-weight: 500; color: ${C.navy}; margin-top: 4px; }
.reminder-root .stat-card .stat-sub { font-size: 10px; font-weight: 400; color: ${C.muted}; margin-top: 3px; }
.reminder-root .page-title { font-size: 20px; font-weight: 700; color: ${C.navy}; letter-spacing: -0.02em; }
.reminder-root .page-sub { font-size: 12px; font-weight: 400; color: ${C.muted}; margin-top: 2px; }
.reminder-root .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.reminder-root .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.reminder-root .g4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.reminder-root .g6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.reminder-root .overlay { position: fixed; inset: 0; background: rgba(0,4,53,.65); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(3px); }
.reminder-root .modal { background: white; border-radius: 20px; width: 100%; max-width: 820px; max-height: 92vh; overflow-y: auto; position: relative; }
.reminder-root .tog { position: relative; display: inline-block; width: 42px; height: 23px; cursor: pointer; flex-shrink: 0; }
.reminder-root .tog input { opacity: 0; width: 0; height: 0; }
.reminder-root .tog-sl { position: absolute; inset: 0; background: #E5E7EB; border-radius: 23px; transition: .3s; }
.reminder-root .tog-sl::before { content: ''; position: absolute; width: 17px; height: 17px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: .3s; }
.reminder-root .tog input:checked + .tog-sl { background: ${C.amber}; }
.reminder-root .tog input:checked + .tog-sl::before { transform: translateX(19px); }
.reminder-root .chk { width: 18px; height: 18px; border-radius: 5px; border: 2px solid ${C.border}; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.reminder-root .chk.on { background: ${C.amber}; border-color: ${C.amber}; }
.reminder-root .step-bar { display: flex; align-items: center; padding: 0 24px 0; }
.reminder-root .step-dot { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; transition: all .3s; flex-shrink: 0; }
.reminder-root .step-line { flex: 1; height: 2px; transition: background .3s; }
.reminder-root .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.reminder-root .tbl th { text-align: left; padding: 10px 14px; font-size: 10px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: .07em; border-bottom: 2px solid ${C.border}; }
.reminder-root .tbl td { padding: 13px 14px; border-bottom: 1px solid ${C.border}; vertical-align: middle; }
.reminder-root .tbl tr:hover td { background: #FAFBFF; }
.reminder-root .tbl tr:last-child td { border-bottom: none; }
.reminder-root .pb { height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; }
.reminder-root .pb-fill { height: 100%; border-radius: 3px; background: ${C.amber}; transition: width .5s; }
@keyframes reminderFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.reminder-root .fade { animation: reminderFadeUp .3s ease; }
.reminder-root .lbl { font-size: 10px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: .08em; display: block; margin-bottom: 5px; }
.reminder-root ::-webkit-scrollbar { width: 5px; height: 5px; }
.reminder-root ::-webkit-scrollbar-track { background: transparent; }
.reminder-root ::-webkit-scrollbar-thumb { background: rgba(0,4,53,.15); border-radius: 10px; }
@media (max-width: 900px) {
  .reminder-root .g6 { grid-template-columns: repeat(3, 1fr); }
  .reminder-root .g4 { grid-template-columns: repeat(2, 1fr); }
}
.reminder-root .reminder-fab {
  position: fixed;
  right: 1.25rem;
  bottom: calc(5.75rem + 1rem);
  border-radius: 50px;
  padding: 14px 24px;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(245,158,11,.4);
  z-index: 25;
  display: flex;
  align-items: center;
  gap: 8px;
}
.reminder-root .reminder-toast {
  position: fixed;
  right: 1.25rem;
  bottom: calc(5.75rem + 5.5rem);
  z-index: 300;
  max-width: 340px;
}
@media (min-width: 1024px) {
  .reminder-root .reminder-fab { bottom: 1.75rem; }
  .reminder-root .reminder-toast { bottom: 6.5rem; }
}
@media (max-width: 640px) {
  .reminder-root .g6, .reminder-root .g4, .reminder-root .g3, .reminder-root .g2 { grid-template-columns: 1fr 1fr; }
  .reminder-root .page { padding: 16px 16px 96px; }
  .reminder-root .tab-nav { padding: 10px 12px; }
}
`;

const Li = ({ icon: Icon, size = 20, color, style, className, strokeWidth = 1.75 }) =>
  Icon ? createElement(Icon, { size, color, style, className, strokeWidth }) : null;

const SectionTitle = ({ icon, children, style }) => (
  <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, display: "flex", alignItems: "center", gap: 8, ...style }}>
    {icon && <Li icon={icon} size={18} color={C.navy} />}
    {children}
  </div>
);

const CloseBtn = ({ onClick, light }) => (
  <button
    type="button"
    onClick={onClick}
    className="btn"
    style={{
      background: light ? "rgba(255,255,255,.1)" : "#F0F2FF",
      color: light ? "white" : C.navy,
      width: 32,
      height: 32,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
    }}
    aria-label="Close"
  >
    <Li icon={X} size={18} />
  </button>
);

// ─── HELPERS ────────────────────────────────────────────────────────
const fmt = (n) => n.toLocaleString("en-RW") + " RWF";
const STATUS_SORT_ORDER = { unpaid: 0, partial: 1, paid: 2, no_fee: 3 };

const statusBadge = (s) => {
  const m = {
    paid: { bg: C.successL, color: C.successD, label: "Paid" },
    unpaid: { bg: C.dangerL, color: C.dangerD, label: "Unpaid" },
    partial: { bg: C.amberPale, color: C.warnD, label: "Partial" },
    no_fee: { bg: "#F3F4F6", color: C.muted, label: "No fee card" },
  };
  const x = m[s] || m.unpaid;
  return <span className="badge" style={{ background: x.bg, color: x.color }}>{x.label}</span>;
};

const balanceCell = (balance, status) => {
  if (status === "no_fee" || balance == null) {
    return <span style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>No fee card</span>;
  }
  if (Number(balance) > 0) {
    return <span style={{ fontWeight: 700, color: C.danger }}>{fmt(balance)}</span>;
  }
  return <span style={{ fontWeight: 700, color: C.successD }}>Cleared</span>;
};

const sortStudentsByFeeStatus = (list) =>
  [...list].sort((a, b) => {
    const sa = STATUS_SORT_ORDER[a.status] ?? 9;
    const sb = STATUS_SORT_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
const chanBadge = (c) => (
  <span
    key={c}
    className="badge"
    style={{
      background: "#fff",
      color: C.navy,
      border: `1px solid ${C.amber}`,
      marginRight: 4,
    }}
  >
    {c}
  </span>
);

function openCampaignDownload(campaign, detailPayload = null) {
  const camp = detailPayload?.campaign || campaign;
  const logs = detailPayload?.logs || [];
  const subject = camp.subject || camp.subject_line || camp.type || "Fee Reminder";
  const body = (camp.message_body || "").replace(/\n/g, "<br/>") || "<p>Edit your message here before printing.</p>";
  const delivered = Number(camp.recipients || 0) - Number(camp.failed || 0);
  const logRows = logs
    .map(
      (l) =>
        `<tr><td>${l.channel || ""}</td><td>${l.delivery_status || ""}</td><td>${l.parent_name || "—"}</td><td>${l.error_message || "—"}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
body{font-family:Montserrat,sans-serif;color:#000435;padding:32px;max-width:720px;margin:0 auto}
h1{font-size:20px;font-weight:600;margin:0 0 8px}
.meta{font-size:12px;color:#6B7280;margin-bottom:24px}
.editable{border:1px solid rgba(0,4,53,.15);border-radius:12px;padding:20px;min-height:120px;line-height:1.6;font-size:14px;font-weight:400}
.editable:focus{outline:2px solid #F59E0B}
table{width:100%;border-collapse:collapse;font-size:12px;margin-top:24px}
th,td{border:1px solid rgba(0,4,53,.1);padding:8px;text-align:left}
th{background:#fff;font-weight:600;color:#000435}
.toolbar{position:fixed;top:16px;right:16px;display:flex;gap:8px}
button{font-family:Montserrat,sans-serif;font-weight:600;border-radius:10px;padding:10px 18px;cursor:pointer}
.print{background:#F59E0B;color:#000435;border:none}
.close{background:#fff;color:#000435;border:1.5px solid #000435}
@media print{.toolbar{display:none}}
</style></head><body>
<div class="toolbar"><button class="print" onclick="window.print()">Print</button><button class="close" onclick="window.close()">Close</button></div>
<h1 contenteditable="true">${subject}</h1>
<div class="meta">Campaign ${camp.id || ""} · ${camp.date || ""} · ${camp.recipients || 0} recipients · ${camp.channels?.join(", ") || ""} · Status: ${camp.status || ""}<br/>
Delivered: ~${delivered >= 0 ? delivered : camp.recipients} · Failed channels: ${camp.failed || 0}</div>
<div class="editable" contenteditable="true">${body}</div>
${logRows ? `<h2 style="font-size:14px;font-weight:600;margin-top:28px">Delivery log</h2><table><thead><tr><th>Channel</th><th>Status</th><th>Parent</th><th>Note</th></tr></thead><tbody>${logRows}</tbody></table>` : ""}
<p style="font-size:11px;color:#6B7280;margin-top:32px">Edit text above, then use Print to save as PDF or paper copy.</p>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("Allow pop-ups to open the downloadable reminder document.");
    return;
  }
  win.document.write(html);
  win.document.close();
}

async function downloadCampaignById(campaign, setBusyId) {
  let payload = null;
  if (campaign?.db_id) {
    setBusyId?.(campaign.id);
    try {
      payload = await fetchFeeReminderCampaignDetail(campaign.db_id);
    } catch {
      /* use summary row only */
    } finally {
      setBusyId?.(null);
    }
  }
  openCampaignDownload(campaign, payload);
}
const Chk = ({checked,onChange}) => (
  <div className={`chk${checked?" on":""}`} onClick={onChange} aria-checked={checked} role="checkbox">
    {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke={C.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  </div>
);

// ─── MODAL WIZARD ───────────────────────────────────────────────────
const STEPS = ["Recipients","Template","Message","Channels","Schedule","Preview"];
const AUTO_TEMPLATE_VARS = ["StudentName", "ParentName", "Balance", "Class", "SchoolName"];

function defaultDeadlineLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function CampaignModal({
  onClose,
  onSend,
  students = [],
  schoolName = "School",
  academicYear: initialYear = "",
  term: initialTerm = "",
  yearOptions = [],
  termsByYear = {},
  classOptions = ["All"],
  bucketCounts = {},
  loadingStudents = false,
  onReloadStudents,
  onNotify,
}) {
  const [step, setStep] = useState(0);
  const [modalError, setModalError] = useState("");
  const [modalYear, setModalYear] = useState(initialYear);
  const [modalTerm, setModalTerm] = useState(initialTerm);
  const [modalClass, setModalClass] = useState("All");
  const [recipients, setRecipients] = useState({
    notPaid: true,
    partial: true,
    overdue: false,
    smallBalance: false,
    search: "",
    className: "All",
    selectedIds: [],
  });
  const [tpl, setTpl] = useState(null);
  const [msg, setMsg] = useState({ subject:"", body:"" });
  const [deadline, setDeadline] = useState(defaultDeadlineLabel());
  const [channels, setChannels] = useState({ push:true, email:true, inSystem:true, sms:false });
  const [schedule, setSchedule] = useState({ mode:"now", date:"2026-05-25", time:"18:00" });
  const textRef = useRef(null);

  const didMountRef = useRef(false);
  const fetchContextRef = useRef({ year: "", term: "", className: "All", q: "" });

  useEffect(() => {
    if (tpl) { const t=TEMPLATES.find(x=>x.id===tpl); if(t){setMsg({subject:t.subject,body:t.body});} }
  }, [tpl]);

  const modalTermOptions =
    (termsByYear[modalYear] && termsByYear[modalYear].length
      ? termsByYear[modalYear]
      : ["Term 1", "Term 2", "Term 3"]);

  useEffect(() => {
    if (!modalTermOptions.includes(modalTerm)) {
      setModalTerm(modalTermOptions[0] || "");
    }
  }, [modalYear, modalTermOptions.join("|")]);

  useEffect(() => {
    if (!onReloadStudents || !modalYear || !modalTerm) return undefined;
    const q = recipients.search?.trim() || "";
    const ctx = {
      year: modalYear,
      term: modalTerm,
      className: modalClass,
      q,
    };
    const prev = fetchContextRef.current;
    const contextChanged =
      prev.year !== ctx.year ||
      prev.term !== ctx.term ||
      prev.className !== ctx.className;
    const searchChanged = prev.q !== ctx.q;

    if (!didMountRef.current) {
      didMountRef.current = true;
      fetchContextRef.current = ctx;
      onReloadStudents({
        year: ctx.year,
        term: ctx.term,
        className: ctx.className,
        q: ctx.q || undefined,
      });
      return undefined;
    }

    if (!contextChanged && !searchChanged) return undefined;

    fetchContextRef.current = ctx;
    const delay = searchChanged && !contextChanged ? 400 : 0;
    const t = setTimeout(() => {
      onReloadStudents({
        year: ctx.year,
        term: ctx.term,
        className: ctx.className,
        q: ctx.q || undefined,
      });
    }, delay);
    return () => clearTimeout(t);
  }, [modalYear, modalTerm, modalClass, recipients.search, onReloadStudents]);

  const recipientsWithClass = { ...recipients, className: modalClass };
  const matchingStudents = filterCampaignRecipients(students, recipientsWithClass);
  const liveBuckets = computeBucketCounts(students, modalClass);
  const recipientCount = matchingStudents.length;
  const channelStats = computeCampaignChannelStats(matchingStudents);
  const sampleStudent = matchingStudents[0] || null;

  const insertVar = (v) => {
    const el = textRef.current; if (!el) return;
    const s=el.selectionStart, e=el.selectionEnd;
    const next = msg.body.slice(0,s)+`{${v}}`+msg.body.slice(e);
    setMsg(m=>({...m,body:next}));
    setTimeout(()=>{ el.selectionStart=el.selectionEnd=s+v.length+2; el.focus(); },0);
  };

  const preview = (text) => {
    const vars = {
      ParentName: sampleStudent?.parent || "Parent",
      StudentName: sampleStudent?.name || "Student",
      Balance: formatBalanceRwf(sampleStudent?.balance ?? 0),
      Class: sampleStudent?.class || "—",
      Deadline: deadline || defaultDeadlineLabel(),
      SchoolName: schoolName,
    };
    let out = String(text || "");
    for (const [key, val] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${key}\\}`, "g"), val);
    }
    return out;
  };

  const activeChannels = Object.entries(channels).filter(([,v])=>v).map(([k])=>({push:"Web Push",email:"Email",inSystem:"In-System",sms:"SMS"}[k]));

  const validateStep = (currentStep) => {
    if (currentStep === 0) {
      const hasBucket =
        recipients.notPaid || recipients.partial || recipients.overdue || recipients.smallBalance;
      if (!hasBucket) return "Select at least one payment status (Not Paid, Partial, etc.).";
      if (recipientCount === 0) return "No students match your filters. Adjust year, term, class, or search.";
    }
    if (currentStep === 1 && !tpl) return "Choose a reminder template before continuing.";
    if (currentStep === 2) {
      if (!trimStr(msg.subject)) return "Enter an email subject line.";
      if (!trimStr(msg.body)) return "Enter a message body.";
    }
    if (currentStep === 3 && activeChannels.length === 0) return "Select at least one delivery channel.";
    return "";
  };

  const validateBeforeSend = () => {
    if (!tpl && !(trimStr(msg.subject) && trimStr(msg.body))) {
      return "Choose a template on step 2 (Template), or use a template before editing the message.";
    }
    const templateKey = tpl || "gentle";
    if (!TEMPLATES.some((t) => t.id === templateKey)) return "Invalid template. Go back to step 2 and select a template.";
    if (recipientCount === 0) return "No recipients selected.";
    if (!trimStr(msg.subject)) return "Email subject is required.";
    if (!trimStr(msg.body)) return "Message body is required.";
    if (activeChannels.length === 0) return "Select at least one delivery channel.";
    if (!modalYear || !modalTerm) return "Academic year and term are required.";
    return "";
  };

  const handleContinueOrSend = () => {
    setModalError("");
    if (step < STEPS.length - 1) {
      const err = validateStep(step);
      if (err) {
        setModalError(err);
        onNotify?.(err);
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    const err = validateBeforeSend();
    if (err) {
      setModalError(err);
      onNotify?.(err);
      return;
    }
    onSend({
      recipientCount,
      academicYear: modalYear,
      term: modalTerm,
      className: modalClass,
      recipientFilters: { ...recipients, className: modalClass },
      channels: activeChannels,
      schedule,
      tpl: tpl || "gentle",
      msg,
      deadline,
      matchingStudentIds: matchingStudents.map((s) => s.student_id),
    });
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal fade">
        {/* Header */}
        <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:"22px 24px 18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{color:"white",fontSize:16,fontWeight:800}}>Create Reminder Campaign</div>
              <div style={{color:"rgba(255,255,255,.5)",fontSize:11,marginTop:2}}>Step {step+1} of {STEPS.length} — {STEPS[step]}</div>
            </div>
            <CloseBtn onClick={onClose} light />
          </div>
          <div className="step-bar">
            {STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div className="step-dot" style={{background:i<step?C.amber:i===step?C.amber:"rgba(255,255,255,.15)",color:i<=step?C.navy:"rgba(255,255,255,.4)"}}>
                    {i<step ? <Li icon={Check} size={14} color={C.navy} /> : i + 1}
                  </div>
                  <div style={{fontSize:8,color:i===step?C.amberL:"rgba(255,255,255,.3)",fontWeight:700,whiteSpace:"nowrap"}}>{s.toUpperCase()}</div>
                </div>
                {i<STEPS.length-1&&<div className="step-line" style={{background:i<step?C.amber:"rgba(255,255,255,.15)",marginBottom:14}}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{padding:"24px",minHeight:380}}>
          {step===0 && (
            <ModalStep1
              recipients={recipients}
              setRecipients={setRecipients}
              count={recipientCount}
              bucketCounts={liveBuckets}
              channelStats={channelStats}
              loading={loadingStudents}
              academicYear={modalYear}
              term={modalTerm}
              yearOptions={yearOptions}
              termOptions={modalTermOptions}
              classOptions={classOptions}
              onYearChange={setModalYear}
              onTermChange={setModalTerm}
              className={modalClass}
              onClassChange={setModalClass}
            />
          )}
          {step===1 && <ModalStep2 tpl={tpl} setTpl={setTpl} />}
          {step===2 && (
            <ModalStep3
              msg={msg}
              setMsg={setMsg}
              insertVar={insertVar}
              textRef={textRef}
              preview={preview}
              deadline={deadline}
              setDeadline={setDeadline}
              sampleStudent={sampleStudent}
              schoolName={schoolName}
            />
          )}
          {step===3 && <ModalStep4 channels={channels} setChannels={setChannels} stats={channelStats} />}
          {step===4 && <ModalStep5 schedule={schedule} setSchedule={setSchedule} />}
          {step===5 && <ModalStep6 count={recipientCount} channels={activeChannels} schedule={schedule} tpl={tpl} msg={msg} />}
        </div>

        {/* Footer */}
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`}}>
          {modalError ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: C.dangerL,
                border: `1px solid ${C.danger}`,
                color: C.dangerD,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {modalError}
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button className="btn btn-ghost" onClick={()=>step>0?setStep(s=>s-1):onClose()}>{step===0?"Cancel":"← Back"}</button>
          <button
            type="button"
            className="btn btn-amber"
            onClick={handleContinueOrSend}
          >
            {step===STEPS.length-1 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Li icon={Rocket} size={16} color={C.navy} /> Send Campaign
              </span>
            ) : (
              "Continue →"
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function trimStr(v) {
  return String(v ?? "").trim();
}

function ModalStep1({
  recipients,
  setRecipients,
  count,
  bucketCounts = {},
  channelStats = {},
  loading,
  academicYear,
  term,
  yearOptions = [],
  termOptions = [],
  classOptions = ["All"],
  onYearChange,
  onTermChange,
  className = "All",
  onClassChange,
}) {
  const opts=[
    { k:"notPaid", bucketKey:"not_paid", l:"Not Paid", Icon: XCircle, n: bucketCounts.not_paid ?? 0 },
    { k:"partial", bucketKey:"partial", l:"Partial Paid", Icon: AlertCircle, n: bucketCounts.partial ?? 0 },
    { k:"overdue", bucketKey:"overdue", l:"Overdue (>7 days)", Icon: Clock, n: bucketCounts.overdue ?? 0 },
    { k:"smallBalance", bucketKey:"small_balance", l:"Small Balance (<50k)", Icon: CircleDollarSign, n: bucketCounts.small_balance ?? 0 },
  ];

  const previewRows = [
    { l: "Emails ready", Icon: Mail, v: channelStats.emails_ready ?? 0 },
    { l: "Push enabled", Icon: Bell, v: channelStats.push_ready ?? 0 },
    { l: "In-system", Icon: MessageSquare, v: channelStats.in_system_ready ?? 0 },
  ];

  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:16}}>Select Recipients</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:16}}>
        <div>
          <span className="lbl">Academic Year</span>
          <select className="sel" style={{width:"100%"}} value={academicYear} onChange={(e)=>onYearChange?.(e.target.value)}>
            {yearOptions.map((y)=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <span className="lbl">Term</span>
          <select className="sel" style={{width:"100%"}} value={term} onChange={(e)=>onTermChange?.(e.target.value)}>
            {termOptions.map((t)=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <span className="lbl">Class</span>
          <select className="sel" style={{width:"100%"}} value={className} onChange={(e)=>onClassChange?.(e.target.value)}>
            {classOptions.map((c)=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div>
          <div className="lbl" style={{marginBottom:10}}>By Payment Status (not paid / partial)</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {opts.map(o=>(
              <label key={o.k} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${recipients[o.k]?C.amber:C.border}`,background:recipients[o.k]?C.amberPale:"white",cursor:"pointer",transition:"all .2s"}}>
                <Chk checked={recipients[o.k]} onChange={()=>setRecipients(p=>({...p,[o.k]:!p[o.k]}))}/>
                <Li icon={o.Icon} size={18} color={C.navy} />
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{o.l}</div>
                  <div style={{fontSize:11,color:C.muted}}>{loading ? "…" : `${o.n} students`}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{marginTop:14}}>
            <span className="lbl">Search Individual Student</span>
            <input
              className="inp"
              placeholder="Name or student code..."
              value={recipients.search}
              onChange={e=>setRecipients(p=>({...p,search:e.target.value}))}
            />
            {loading && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={12} className="animate-spin" /> Updating recipients…
              </div>
            )}
          </div>
        </div>
        <div style={{background:C.navy,borderRadius:16,padding:20,color:"white",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{fontSize:12,fontWeight:700,color:C.amberL,display:"flex",alignItems:"center",gap:6}}><Li icon={BarChart3} size={14} color={C.amberL} /> LIVE PREVIEW</div>
          <div><div style={{fontSize:42,fontWeight:900}}>{count}</div><div style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>Parents selected</div></div>
          {previewRows.map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,.65)",display:"flex",alignItems:"center",gap:6}}><Li icon={d.Icon} size={13} color="rgba(255,255,255,.65)" />{d.l}</span>
              <span style={{fontSize:14,fontWeight:800,color:C.amber}}>{d.v}</span>
            </div>
          ))}
          <div style={{padding:10,background:"rgba(245,158,11,.15)",borderRadius:8,border:"1px solid rgba(245,158,11,.3)",fontSize:11,color:C.amberL,lineHeight:1.5,marginTop:4}}>
            <span style={{ display: "inline-flex", alignItems: "flex-start", gap: 6 }}>
              <Li icon={Lightbulb} size={14} color={C.amberL} style={{ flexShrink: 0, marginTop: 2 }} />
              Overdue students have 62% payment recovery rate after reminders.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalStep2({tpl,setTpl}){
  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:8}}>Choose Reminder Template</div>
      {!tpl ? (
        <p style={{ fontSize: 12, color: C.warnD, marginBottom: 12, fontWeight: 600 }}>
          Select one template below — required before sending.
        </p>
      ) : null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {TEMPLATES.map(t=>(
          <div key={t.id} onClick={()=>setTpl(t.id)} style={{background:t.bg,borderRadius:12,padding:16,cursor:"pointer",border:`2px solid ${tpl===t.id?t.accent:"transparent"}`,transition:"all .2s",transform:tpl===t.id?"translateY(-2px)":"none"}}>
            <div style={{marginBottom:8}}><Li icon={t.Icon} size={28} color={t.accent} /></div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:4}}>{t.name}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{t.desc}</div>
            {tpl===t.id&&<div style={{fontSize:10,fontWeight:700,color:t.accent,display:"flex",alignItems:"center",gap:4}}><Li icon={Check} size={12} color={t.accent} /> SELECTED</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalStep3({ msg, setMsg, insertVar, textRef, preview, deadline, setDeadline, sampleStudent, schoolName }) {
  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:16}}>Compose Message</div>
      <div style={{marginBottom:14}}>
        <span className="lbl">Email Subject</span>
        <input className="inp" value={msg.subject} onChange={e=>setMsg(m=>({...m,subject:e.target.value}))} placeholder="Enter subject line..."/>
      </div>
      <div style={{marginBottom:12}}>
        <span className="lbl">Payment deadline (only manual variable)</span>
        <input
          className="inp"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          placeholder="e.g. 25 May 2026"
        />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
          Use {"{Deadline}"} in the message body — filled from this field when sending.
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <span className="lbl">Smart variables — auto-filled from student registration</span>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:8}}>
          {AUTO_TEMPLATE_VARS.map(v=>(
            <button key={v} type="button" onClick={()=>insertVar(v)} className="btn" style={{background:"#F4F6FF",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,color:C.navy}}>
              {`{${v}}`}
            </button>
          ))}
          <button type="button" onClick={()=>insertVar("Deadline")} className="btn" style={{background:C.amberPale,border:`1px solid ${C.borderAmber}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:700,color:C.amberD}}>
            {"{Deadline}"}
          </button>
        </div>
        {sampleStudent ? (
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
            Preview sample: {sampleStudent.parent} · {sampleStudent.name} · {formatBalanceRwf(sampleStudent.balance)} RWF · {sampleStudent.class} · {schoolName}
          </div>
        ) : (
          <div style={{ fontSize: 10, color: C.warnD, marginBottom: 8 }}>Select recipients in step 1 to preview real student data.</div>
        )}
        <textarea ref={textRef} className="inp" value={msg.body} onChange={e=>setMsg(m=>({...m,body:e.target.value}))} rows={7} style={{resize:"vertical",fontFamily:"Montserrat",lineHeight:1.7}}/>
      </div>
      {msg.body&&(
        <div style={{padding:14,background:C.amberPale,borderRadius:12,border:`1px solid ${C.borderAmber}`}}>
          <div style={{fontSize:10,fontWeight:700,color:C.amberD,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><Li icon={Search} size={12} color={C.amberD} /> LIVE PREVIEW</div>
          <div style={{fontSize:12,color:C.navy,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{preview(msg.body)}</div>
        </div>
      )}
    </div>
  );
}

function ModalStep4({channels,setChannels,stats={}}){
  const CH=[
    {k:"push", Icon:Bell, label:"Web Push Notification", desc:"Device/browser push when parent has subscribed", n: stats.push_ready ?? 0, future:false},
    {k:"email", Icon:Mail, label:"Email", desc:"Sent to father/mother email from student registration", n: stats.emails_ready ?? 0, future:false},
    {k:"inSystem", Icon:MessageSquare, label:"In-System Notification", desc:"Parent portal inbox (requires parent phone)", n: stats.in_system_ready ?? 0, future:false},
    {k:"sms", Icon:Smartphone, label:"SMS", desc:"Text to registered phone number", n: 0, future:true},
  ];
  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:16}}>Delivery Channels</div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {CH.map(c=>(
          <div key={c.k} onClick={()=>!c.future&&setChannels(p=>({...p,[c.k]:!p[c.k]}))} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 18px",borderRadius:12,border:`2px solid ${channels[c.k]&&!c.future?C.amber:C.border}`,background:channels[c.k]&&!c.future?C.amberPale:"white",cursor:c.future?"default":"pointer",opacity:c.future?.55:1,transition:"all .2s"}}>
            <Li icon={c.Icon} size={26} color={C.navy} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{c.label} {c.future&&<span className="badge" style={{background:"#F3F4F6",color:C.muted,marginLeft:6}}>COMING SOON</span>}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{c.desc}</div>
            </div>
            <span className="badge" style={{background:C.infoL,color:C.infoD}}>{c.n} recipients</span>
            {!c.future&&<Chk checked={!!channels[c.k]} onChange={()=>setChannels(p=>({...p,[c.k]:!p[c.k]}))}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalStep5({schedule,setSchedule}){
  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:18}}>Schedule Delivery</div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
        {[{id:"now",Icon:Zap,l:"Send Now",d:"Deliver immediately to all recipients"},{id:"schedule",Icon:Timer,l:"Schedule for Later",d:"Pick a specific date and time"}].map(o=>(
          <div key={o.id} onClick={()=>setSchedule(s=>({...s,mode:o.id}))} style={{display:"flex",alignItems:"center",gap:16,padding:18,borderRadius:12,border:`2px solid ${schedule.mode===o.id?C.amber:C.border}`,background:schedule.mode===o.id?C.amberPale:"white",cursor:"pointer",transition:"all .2s"}}>
            <Li icon={o.Icon} size={26} color={C.navy} />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{o.l}</div>
              <div style={{fontSize:11,color:C.muted}}>{o.d}</div>
            </div>
            <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${schedule.mode===o.id?C.amber:C.border}`,background:schedule.mode===o.id?C.amber:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.navy,flexShrink:0}}>
              {schedule.mode===o.id ? <Li icon={Check} size={12} color={C.navy} /> : ""}
            </div>
          </div>
        ))}
      </div>
      {schedule.mode==="schedule"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,animation:"fadeUp .3s ease"}}>
          <div><span className="lbl">Date</span><input type="date" className="inp" value={schedule.date} onChange={e=>setSchedule(s=>({...s,date:e.target.value}))}/></div>
          <div><span className="lbl">Time</span><input type="time" className="inp" value={schedule.time} onChange={e=>setSchedule(s=>({...s,time:e.target.value}))}/></div>
        </div>
      )}
    </div>
  );
}

function ModalStep6({count,channels,schedule,tpl,msg}){
  const t = TEMPLATES.find(x=>x.id===tpl);
  return(
    <div className="fade">
      <div style={{fontWeight:800,fontSize:15,color:C.navy,marginBottom:16}}>Final Preview & Confirm</div>
      <div style={{background:C.navy,borderRadius:16,padding:22,color:"white",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.amberL,marginBottom:14,display:"flex",alignItems:"center",gap:6}}><Li icon={ClipboardList} size={14} color={C.amberL} /> CAMPAIGN SUMMARY</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[
            {l:"Recipients",v:`${count} Parents`},
            {l:"Template",v:t?t.name:"None selected"},
            {l:"Channels",v:channels.length?channels.join(" + "):"None selected"},
            {l:"Schedule",v:schedule.mode==="now"?"Send Immediately":`${schedule.date} at ${schedule.time}`},
            {l:"Subject",v:msg.subject||"—"},
            {l:"Est. Success",v:"94%"},
          ].map((d,i)=>(
            <div key={i}><div style={{fontSize:10,color:"rgba(255,255,255,.45)",fontWeight:700,marginBottom:3}}>{d.l.toUpperCase()}</div><div style={{fontSize:13,fontWeight:700,color:d.l==="Est. Success"?C.amber:"white"}}>{d.v}</div></div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[{l:"Emails",n:Math.round(count*.88),Icon:Mail},{l:"Push Notifs",n:Math.round(count*.67),Icon:Bell},{l:"In-System",n:count,Icon:MessageSquare}].map((d,i)=>(
          <div key={i} style={{background:C.amberPale,borderRadius:12,padding:16,textAlign:"center",border:`1px solid ${C.borderAmber}`}}>
            <div style={{marginBottom:4,display:"flex",justifyContent:"center"}}><Li icon={d.Icon} size={24} color={C.navy} /></div>
            <div style={{fontSize:20,fontWeight:800,color:C.navy}}>{d.n}</div>
            <div style={{fontSize:11,color:C.muted,fontWeight:600}}>{d.l}</div>
          </div>
        ))}
      </div>
      <div style={{padding:14,background:C.successL,borderRadius:12,border:"1px solid #6EE7B7",display:"flex",gap:10,alignItems:"center"}}>
        <Li icon={CheckCircle} size={20} color={C.successD} />
        <div><div style={{fontSize:13,fontWeight:700,color:C.successD}}>Ready to Send</div><div style={{fontSize:11,color:"#047857"}}>All systems verified. Estimated delivery under 3 minutes.</div></div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ─────────────────────────────────────────────────
function Dashboard({
  onCreateCampaign,
  students = [],
  summary = {},
  classOptions = [],
  yearOptions = [],
  termOptions = [],
  academicYear,
  term,
  onYearChange,
  onTermChange,
  filterStatus,
  onStatusChange,
  filterClass,
  onClassChange,
  search,
  onSearchChange,
  loading,
  error,
  recentCampaigns = [],
}) {
  const [aiDismissed, setAiDismissed] = useState(false);

  const filtered = sortStudentsByFeeStatus(
    students.filter((s) => {
      if (filterStatus !== "All" && s.status !== filterStatus.toLowerCase()) return false;
      if (filterClass !== "All" && s.class !== filterClass) return false;
      if (
        search &&
        !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !String(s.id).toLowerCase().includes(search.toLowerCase()) &&
        !String(s.student_code || "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
  );

  return(
    <div className="page fade">
      {/* AI Banner */}
      {error && (
        <div className="card" style={{ marginBottom: 16, borderColor: C.danger, background: C.dangerL, color: C.dangerD, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading && students.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.muted, fontSize: 13 }}>
          <Loader2 size={18} className="animate-spin" /> Loading school fee data…
        </div>
      )}
      {loading && students.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: C.muted, fontSize: 12 }}>
          <Loader2 size={14} className="animate-spin" /> Updating table for {term} · {academicYear}…
        </div>
      )}

      {!aiDismissed && (summary.overdue_15_plus || 0) > 0 && (
        <div style={{background:C.navy,borderRadius:16,padding:20,marginBottom:24,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,background:C.amber,borderRadius:"50%",opacity:.08}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <Li icon={Bot} size={18} color={C.amberL} />
                <span className="badge" style={{background:"rgba(245,158,11,.25)",color:C.amberL}}>AI SUGGESTION</span>
              </div>
              <div style={{fontSize:15,fontWeight:700,color:"white",marginBottom:4}}>
                {(summary.overdue_15_plus || 0)} students are overdue more than 15 days
              </div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.6}}>
                Combined outstanding: {fmt(Number(summary.total_balance || 0))}. Recommended: send an urgent reminder to parents with balances.
              </div>
            </div>
            <CloseBtn onClick={()=>setAiDismissed(true)} light />
          </div>
          <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
            <button className="btn btn-amber btn-sm" onClick={onCreateCampaign}>Send Urgent Reminder →</button>
            <button className="btn" style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",color:"white",padding:"7px 16px",borderRadius:9,fontSize:12,fontWeight:600,fontFamily:"Montserrat"}}>View These Students</button>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <SectionTitle icon={Search}>Smart Filters</SectionTitle>
          <button type="button" className="btn btn-ghost btn-sm" onClick={()=>{onStatusChange("All");onClassChange("All");onSearchChange("");}}>Clear All</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
          {[
            {l:"Academic Year",el:<select className="sel" style={{width:"100%"}} value={academicYear} onChange={e=>onYearChange(e.target.value)}>{yearOptions.map(y=><option key={y} value={y}>{y}</option>)}</select>},
            {l:"Term",el:<select className="sel" style={{width:"100%"}} value={term} onChange={e=>onTermChange(e.target.value)}>{termOptions.map(t=><option key={t} value={t}>{t}</option>)}</select>},
            {l:"Class",el:<select className="sel" style={{width:"100%"}} value={filterClass} onChange={e=>onClassChange(e.target.value)}>{classOptions.map(c=><option key={c} value={c}>{c}</option>)}</select>},
            {l:"Payment Status",el:<select className="sel" style={{width:"100%"}} value={filterStatus} onChange={e=>onStatusChange(e.target.value)}><option>All</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="no_fee">No fee card</option></select>},
          ].map((f,i)=>(
            <div key={i}><span className="lbl">{f.l}</span>{f.el}</div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <input className="inp" placeholder="Search name or student code..." value={search} onChange={e=>onSearchChange(e.target.value)} style={{width:220}}/>
          {[
            { label: "Not Paid", Icon: XCircle },
            { label: "Partial", Icon: AlertCircle },
            { label: "Overdue", Icon: Clock },
            { label: "Has Email", Icon: Mail },
            { label: "Push Enabled", Icon: Bell },
          ].map((f) => (
            <button key={f.label} type="button" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Li icon={f.Icon} size={14} color={C.navy} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student Table */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <SectionTitle icon={GraduationCap}>Students ({filtered.length})</SectionTitle>
          <button className="btn btn-amber btn-sm" onClick={onCreateCampaign}>+ Send Reminder</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>ID</th><th>Student</th><th>Class</th><th>Balance</th><th>Status</th><th>Overdue</th><th>Parent</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id}>
                  <td style={{color:C.muted,fontSize:11}}>{s.id}</td>
                  <td style={{fontWeight:600,color:C.navy}}>{s.name}</td>
                  <td><span className="badge" style={{background:C.infoL,color:C.infoD}}>{s.class}</span></td>
                  <td>{balanceCell(s.balance, s.status)}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td>
                    {s.overdue>0?(
                      <span style={{fontSize:12,fontWeight:700,color:s.overdue>14?C.danger:s.overdue>7?C.amberD:C.muted}}>{s.overdue} days</span>
                    ):<span style={{color:C.light,fontSize:12}}>—</span>}
                  </td>
                  <td style={{fontSize:12}}>
                    <div style={{fontWeight:600,color:C.navy}}>{s.parent}</div>
                    <div style={{color:s.email?C.info:C.light,fontSize:11}}>{s.email||"No email"}</div>
                  </td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={onCreateCampaign} style={{fontSize:11,padding:"5px 10px",display:"inline-flex",alignItems:"center",gap:6}}><Li icon={Send} size={14} /> Remind</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <SectionTitle icon={Send}>Recent Campaigns</SectionTitle>
          <button className="btn btn-ghost btn-sm">View All</button>
        </div>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Recipients</th><th>Channels</th><th>Open Rate</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {recentCampaigns.slice(0,5).map(c=>(
                <tr key={c.id}>
                  <td style={{color:C.muted,fontSize:12}}>{c.date}</td>
                  <td style={{fontWeight:600,color:C.navy}}>{c.type}</td>
                  <td>{c.recipients} parents</td>
                  <td>{c.channels.map(chanBadge)}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div className="pb" style={{width:60}}><div className="pb-fill" style={{width:`${c.rate}%`}}/></div>
                      <span style={{fontSize:12,fontWeight:700}}>{c.rate}%</span>
                    </div>
                  </td>
                  <td><span className="badge" style={{background:c.status==="Delivered"?C.successL:C.amberPale,color:c.status==="Delivered"?C.successD:C.warnD}}>{c.status}</span></td>
                  <td><button className="btn btn-ghost btn-sm" style={{fontSize:11}}>Resend</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── REMINDER HISTORY PAGE ───────────────────────────────────────────
function ReminderHistory({ onCreateCampaign, campaigns = [], loading }) {
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All");
  const [typeF, setTypeF] = useState("All");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExtra, setDetailExtra] = useState(null);
  const [downloadBusy, setDownloadBusy] = useState(null);

  const openDetail = async (c) => {
    setDetail(c);
    setDetailExtra(null);
    if (!c?.db_id) return;
    setDetailLoading(true);
    try {
      const data = await fetchFeeReminderCampaignDetail(c.db_id);
      setDetailExtra(data);
    } catch {
      /* keep basic detail */
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = campaigns.filter(c=>{
    if(statusF!=="All"&&c.status!==statusF)return false;
    if(typeF!=="All"&&c.type!==typeF)return false;
    if(search&&!c.type.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  return(
    <div className="page fade">
      {/* Filters */}
      <div className="card" style={{marginBottom:20}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:180}}><span className="lbl">Search</span><input className="inp" placeholder="Search campaigns..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div><span className="lbl">Status</span><select className="sel" value={statusF} onChange={e=>setStatusF(e.target.value)}><option>All</option><option>Delivered</option><option>Partial</option><option>Failed</option></select></div>
          <div><span className="lbl">Type</span><select className="sel" value={typeF} onChange={e=>setTypeF(e.target.value)}><option>All</option>{[...new Set(campaigns.map(c=>c.type))].map(t=><option key={t}>{t}</option>)}</select></div>
          <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setStatusF("All");setTypeF("All");}}>Clear</button>
        </div>
      </div>

      {/* Timeline */}
      <div className="card" style={{marginBottom:20}}>
        <SectionTitle icon={ClipboardList} style={{ marginBottom: 20 }}>Campaign Timeline</SectionTitle>
        <div>
          {filtered.map((c,i)=>(
            <div key={c.id} style={{borderLeft:`2px solid ${C.border}`,paddingLeft:20,paddingBottom:i<filtered.length-1?24:0,position:"relative"}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:c.status==="Delivered"?C.amber:c.status==="Partial"?C.warn:C.danger,position:"absolute",left:-7,top:4,border:"2px solid white"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{c.type}</div>
                    <span className="badge" style={{background:c.status==="Delivered"?C.successL:C.amberPale,color:c.status==="Delivered"?C.successD:C.warnD}}>{c.status}</span>
                  </div>
                  <div style={{fontSize:12,color:C.muted}}>{c.date} · {c.recipients} parents · {c.channels.join(", ")}</div>
                  <div style={{fontSize:12,color:C.navy,marginTop:4,fontWeight:600,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={Banknote} size={13} color={C.successD} /> {c.paid_after} paid after</span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={XCircle} size={13} color={C.danger} /> {c.failed} channel failed{c.failed !== 1 ? "s" : ""}{c.status === "Partial" ? " (others may have worked)" : ""}</span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={BarChart3} size={13} color={C.navy} /> {c.rate}% open rate</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openDetail(c)}>View Details</button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{display:"inline-flex",alignItems:"center",gap:5}}
                    disabled={downloadBusy === c.id}
                    onClick={() => downloadCampaignById(c, setDownloadBusy)}
                  >
                    <Li icon={Download} size={14} color={C.navy} /> Download
                  </button>
                  <button className="btn btn-amber btn-sm" onClick={onCreateCampaign} style={{fontSize:11}}>Resend</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table View */}
      <div className="card">
        <SectionTitle icon={BarChart3} style={{ marginBottom: 16 }}>Table View</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>Campaign ID</th><th>Date</th><th>Type</th><th>Recipients</th><th>Channels</th><th>Open Rate</th><th>Paid After</th><th>Failed</th><th>Status</th><th>Actions</th><th>Download</th></tr></thead>
            <tbody>
              {filtered.map(c=>(
                <tr key={c.id}>
                  <td style={{fontFamily:"monospace",fontSize:11,color:C.muted}}>{c.id}</td>
                  <td style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{c.date}</td>
                  <td style={{fontWeight:600,color:C.navy}}>{c.type}</td>
                  <td>{c.recipients}</td>
                  <td>{c.channels.map(chanBadge)}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div className="pb" style={{width:50}}><div className="pb-fill" style={{width:`${c.rate}%`}}/></div>
                      <span style={{fontSize:12,fontWeight:700}}>{c.rate}%</span>
                    </div>
                  </td>
                  <td><span style={{fontWeight:700,color:C.successD}}>{c.paid_after}</span></td>
                  <td><span style={{fontWeight:700,color:c.failed>10?C.danger:C.muted}}>{c.failed}</span></td>
                  <td><span className="badge" style={{background:c.status==="Delivered"?C.successL:C.amberPale,color:c.status==="Delivered"?C.successD:C.warnD}}>{c.status}</span></td>
                  <td>
                    <div style={{display:"flex",gap:6}}>
                      <button type="button" className="btn btn-ghost btn-sm" style={{padding:"5px 10px",fontSize:11}} onClick={()=>openDetail(c)} aria-label="View details"><Li icon={File} size={14} /></button>
                      <button type="button" className="btn btn-ghost btn-sm" style={{padding:"5px 10px",fontSize:11}} onClick={onCreateCampaign} aria-label="Resend"><Li icon={RotateCcw} size={14} /></button>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{padding:"5px 10px",fontSize:11,display:"inline-flex",alignItems:"center",gap:4}}
                      disabled={downloadBusy === c.id}
                      onClick={() => downloadCampaignById(c, setDownloadBusy)}
                    >
                      <Li icon={Download} size={14} color={C.navy} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detail&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
          <div className="modal fade" style={{maxWidth:560}}>
            <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{color:"white",fontSize:16,fontWeight:800}}>{detail.type}</div>
                <CloseBtn onClick={()=>setDetail(null)} light />
              </div>
              <div style={{color:"rgba(255,255,255,.55)",fontSize:12,marginTop:4}}>{detail.date} · Campaign {detail.id}</div>
            </div>
            <div style={{padding:24}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
                {[
                  {l:"Recipients",v:`${detail.recipients} parents`},
                  {l:"Channels",v:detail.channels.join(", ")},
                  {l:"Open Rate",v:`${detail.rate}%`},
                  {l:"Paid After",v:`${detail.paid_after} students`},
                  {l:"Failed",v:`${detail.failed} deliveries`},
                  {l:"Status",v:detail.status},
                ].map((d,i)=>(
                  <div key={i} style={{background:"#F8F9FF",borderRadius:10,padding:14}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4}}>{d.l.toUpperCase()}</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.navy}}>{d.v}</div>
                  </div>
                ))}
              </div>
              {detailLoading && (
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Loading delivery details…</div>
              )}
              {detailExtra?.delivery_notes?.length > 0 && (
                <div style={{background:C.amberPale,borderRadius:10,padding:14,marginBottom:16,border:`1px solid ${C.borderAmber}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.warnD,marginBottom:8}}>WHY SOME DELIVERIES FAILED</div>
                  <ul style={{margin:0,paddingLeft:18,fontSize:12,color:C.navy,lineHeight:1.5}}>
                    {detailExtra.delivery_notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detailExtra?.delivery_summary && (
                <div style={{fontSize:11,color:C.muted,marginBottom:16}}>
                  Delivery:{" "}
                  {Object.entries(detailExtra.delivery_summary)
                    .map(([ch, st]) => `${ch}: ${st.sent || 0} sent, ${st.failed || 0} failed, ${st.skipped || 0} skipped`)
                    .join(" · ")}
                </div>
              )}
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{display:"inline-flex",alignItems:"center",gap:6}}
                  onClick={() => openCampaignDownload(detail, detailExtra)}
                >
                  <Li icon={Download} size={16} color={C.navy} /> Download / Print
                </button>
                <button type="button" className="btn btn-amber" style={{flex:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,minWidth:140}} onClick={()=>{setDetail(null);setDetailExtra(null);onCreateCampaign();}}><Li icon={RotateCcw} size={16} color={C.navy} /> Resend</button>
                <button className="btn btn-ghost" onClick={()=>{setDetail(null);setDetailExtra(null);}}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────
function Analytics({ campaigns = [], summary = {} }) {
  const [period, setPeriod] = useState("This Term");
  const totalRecipients = campaigns.reduce((a,c)=>a+c.recipients,0);
  const avgRate = campaigns.length ? Math.round(campaigns.reduce((a,c)=>a+c.rate,0)/campaigns.length) : 0;
  const totalPaid = campaigns.reduce((a,c)=>a+c.paid_after,0);
  const totalFailed = campaigns.reduce((a,c)=>a+c.failed,0);
  const recoveryRate = Math.round((totalPaid/totalRecipients)*100);

  const barMax = Math.max(1, ...campaigns.map(c=>c.recipients));

  return(
    <div className="page fade">
      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginBottom:16}}>
        <select className="sel" value={period} onChange={e=>setPeriod(e.target.value)}>
          <option>This Term</option><option>Last Term</option><option>This Year</option>
        </select>
      </div>

      <div className="g2" style={{marginBottom:20}}>
        {/* Channel Performance */}
        <div className="card">
          <SectionTitle icon={Radio} style={{ marginBottom: 18 }}>Channel Performance</SectionTitle>
          {[
            {l:"Email Open Rate",v:78,accent:true},
            {l:"Push Click Rate",v:58,accent:false},
            {l:"In-System View Rate",v:85,accent:true},
            {l:"Paid After Reminder",v:recoveryRate,accent:false},
            {l:"Failed Delivery",v:Math.round((totalFailed/totalRecipients)*100)||0,accent:true},
          ].map((b,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:500,color:C.navy}}>{b.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:b.accent?C.amber:C.navy}}>{b.v}%</span>
              </div>
              <div className="pb" style={{height:8}}><div className="pb-fill" style={{width:`${Math.min(100,b.v)}%`,background:b.accent?C.amber:C.navy}}/></div>
            </div>
          ))}
        </div>

        {/* Campaign Bar Chart */}
        <div className="card">
          <SectionTitle icon={BarChart3} style={{ marginBottom: 18 }}>Recipients per Campaign</SectionTitle>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {campaigns.map(c=>(
              <div key={c.id}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.navy,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.type}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.muted,marginLeft:8}}>{c.recipients}</span>
                </div>
                <div style={{display:"flex",gap:4,height:10}}>
                  <div style={{background:C.amber,borderRadius:3,transition:"width .5s",width:`${(c.recipients/barMax)*100}%`}}/>
                  <div style={{background:C.successL,borderRadius:3,width:`${(c.paid_after/barMax)*100}%`}}/>
                </div>
              </div>
            ))}
            <div style={{display:"flex",gap:16,marginTop:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:6,borderRadius:2,background:C.amber}}/><span style={{fontSize:11,color:C.muted}}>Recipients</span></div>
              <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:12,height:6,borderRadius:2,background:C.successL}}/><span style={{fontSize:11,color:C.muted}}>Paid After</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="g2" style={{marginBottom:20}}>
        {/* Payment Status Breakdown */}
        <div className="card">
          <SectionTitle icon={CreditCard} style={{ marginBottom: 16 }}>Payment Status Breakdown</SectionTitle>
          {[
            {l:"Fully Paid",n:summary.paid||0,total:summary.total_students||1,accent:false},
            {l:"Partial Paid",n:summary.partial||0,total:summary.total_students||1,accent:true},
            {l:"Unpaid",n:summary.unpaid||0,total:summary.total_students||1,accent:true},
          ].map((d,i)=>(
            <div key={i} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:500,color:C.navy}}>{d.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:d.accent?C.amber:C.navy}}>{d.n} <span style={{fontSize:11,color:C.muted,fontWeight:400}}>({Math.round(d.n/d.total*100)}%)</span></span>
              </div>
              <div className="pb" style={{height:10}}><div className="pb-fill" style={{width:`${d.n/d.total*100}%`,background:d.accent?C.amber:C.navy}}/></div>
            </div>
          ))}
        </div>

        {/* Top Performing */}
        <div className="card">
          <SectionTitle icon={Trophy} style={{ marginBottom: 16 }}>Top Performing Campaigns</SectionTitle>
          {[...campaigns].sort((a,b)=>b.rate-a.rate).slice(0,5).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<4?`1px solid ${C.border}`:"none"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:i===0?C.amber:i===1?C.amberPale:C.bg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:i===0?C.navy:C.muted,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.navy}}>{c.type}</div>
                <div style={{fontSize:11,color:C.muted}}>{c.date}</div>
              </div>
              <span style={{fontSize:14,fontWeight:800,color:C.amber}}>{c.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Campaign Stats */}
      <div className="card">
        <SectionTitle icon={ClipboardList} style={{ marginBottom: 16 }}>Detailed Campaign Performance</SectionTitle>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr><th>Campaign</th><th>Date</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Paid After</th><th>Failed</th><th>ROI Score</th></tr></thead>
            <tbody>
              {campaigns.map(c=>{
                const delivered = Math.round(c.recipients*(1-c.failed/c.recipients));
                const opened = Math.round(c.recipients*c.rate/100);
                const roi = Math.round((c.paid_after/c.recipients)*100);
                return(
                  <tr key={c.id}>
                    <td style={{fontWeight:600,color:C.navy}}>{c.type}</td>
                    <td style={{color:C.muted,fontSize:12}}>{c.date}</td>
                    <td>{c.recipients}</td>
                    <td><span style={{color:C.successD,fontWeight:600}}>{delivered}</span></td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div className="pb" style={{width:50}}><div className="pb-fill" style={{width:`${c.rate}%`}}/></div>
                        <span style={{fontSize:12,fontWeight:600}}>{c.rate}%</span>
                      </div>
                    </td>
                    <td><span style={{fontWeight:700,color:C.successD}}>{c.paid_after}</span></td>
                    <td><span style={{fontWeight:700,color:c.failed>15?C.danger:C.muted}}>{c.failed}</span></td>
                    <td>
                      <span className="badge" style={{background:roi>30?C.successL:roi>15?C.amberPale:C.dangerL,color:roi>30?C.successD:roi>15?C.warnD:C.dangerD}}>{roi}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AUTO RULES PAGE ─────────────────────────────────────────────────
function AutoRules({
  rules = [],
  onReload,
  onError,
  academicYear = "",
  term = "",
  yearOptions = [],
  termOptions = [],
  termsByYear = {},
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [ruleClassOptions, setRuleClassOptions] = useState(["All"]);
  const [matchPreview, setMatchPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    condition: "",
    extra: "",
    action: "",
    channel: "Email",
    frequency: "Once",
    send_time: "08:00",
    active: true,
    academic_year: "",
    term: "",
    class_name: "All",
    require_fee_card: true,
  });

  const ruleTermOptions = useMemo(() => {
    if (form.academic_year && termsByYear[form.academic_year]?.length) {
      return termsByYear[form.academic_year];
    }
    return termOptions;
  }, [form.academic_year, termsByYear, termOptions]);

  useEffect(() => {
    if (!showAdd || !form.academic_year || !form.term) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchFeeReminderStudents({
          academic_year: form.academic_year,
          term: form.term,
        });
        const names = ["All", ...(data.class_names || [])];
        if (!cancelled) setRuleClassOptions(names);
      } catch (_) {
        if (!cancelled) setRuleClassOptions(["All"]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAdd, form.academic_year, form.term]);

  useEffect(() => {
    if (!showAdd || !form.academic_year || !form.term || !form.condition) {
      setMatchPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await previewFeeReminderRuleMatch({
          academic_year: form.academic_year,
          term: form.term,
          class_name: form.class_name || "All",
          condition: form.condition,
          extra: form.extra,
          require_fee_card: form.require_fee_card !== false,
        });
        setMatchPreview(data);
      } catch (e) {
        setMatchPreview({ error: e.message });
      } finally {
        setPreviewLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [
    showAdd,
    form.academic_year,
    form.term,
    form.class_name,
    form.condition,
    form.extra,
    form.require_fee_card,
  ]);

  const toggleRule = async (id, active) => {
    try {
      await updateFeeReminderRule(id, { active: !active });
      onReload?.();
    } catch (e) {
      onError?.(e.message);
    }
  };
  const deleteRule = async (id) => {
    try {
      await deleteFeeReminderRule(id);
      setDeleteConfirm(null);
      onReload?.();
    } catch (e) {
      onError?.(e.message);
    }
  };

  const channelLabelFromRule = (r) => {
    const ch = String(r.channel || "");
    if (
      ch.includes("Email") &&
      ch.includes("Push") &&
      (ch.includes("In-System") || ch.toLowerCase().includes("in_system"))
    ) {
      return "All Channels";
    }
    return ch || "Email";
  };

  const openEdit = (r) => {
    setForm({
      ...r,
      channel: channelLabelFromRule(r),
      send_time: r.send_time || "08:00",
      academic_year: r.academic_year || academicYear,
      term: r.term || term,
      class_name: r.class_name || "All",
      require_fee_card: r.require_fee_card !== false,
    });
    setEditRule(r.id);
    setShowAdd(true);
  };
  const openAdd = () => {
    setForm({
      name: "",
      condition: "Status = unpaid",
      extra: "",
      action: "",
      channel: "All Channels",
      frequency: "Daily",
      send_time: "08:00",
      active: true,
      academic_year: academicYear,
      term: term,
      class_name: "All",
      require_fee_card: true,
    });
    setEditRule(null);
    setShowAdd(true);
  };

  const onRuleYearChange = (y) => {
    const terms = termsByYear[y] || termOptions;
    setForm((f) => ({
      ...f,
      academic_year: y,
      term: terms[0] || f.term,
      class_name: "All",
    }));
  };

  const mapRuleChannels = (channelLabel) => {
    const s = String(channelLabel || "").toLowerCase();
    if (s.includes("all")) {
      return { email: true, push: true, inSystem: true, sms: false };
    }
    return {
      email: s.includes("email"),
      push: s.includes("push"),
      sms: s.includes("sms"),
      inSystem: s.includes("in-system") || s.includes("in system"),
    };
  };

  const runNow = async (id) => {
    setRunningId(id);
    try {
      const res = await runFeeReminderRuleNow(id);
      onError?.(res.message || "Rule executed");
      onReload?.();
    } catch (e) {
      onError?.(e.message);
    } finally {
      setRunningId(null);
    }
  };

  const saveRule = async () => {
    if (
      !form.name ||
      !form.condition ||
      !form.action ||
      !form.send_time ||
      !form.academic_year ||
      !form.term
    ) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        channels: mapRuleChannels(form.channel),
        send_time: form.send_time,
        academic_year: form.academic_year,
        term: form.term,
        class_name: form.class_name || "All",
        require_fee_card: form.require_fee_card !== false,
      };
      if (editRule) {
        await updateFeeReminderRule(editRule, payload);
      } else {
        await createFeeReminderRule(payload);
      }
      setShowAdd(false);
      onReload?.();
    } catch (e) {
      onError?.(e.message);
    } finally {
      setSaving(false);
    }
  };

  const ACTIONS=["Send Gentle Reminder","Send Urgent Reminder","Send Final Warning","Send Exam Access Notice","Send PTA Reminder","Send Transport Reminder"];
  const CHANNELS=["Email","Push","SMS","Email + Push","Email + SMS","Push + In-System","All Channels"];
  const FREQS=["Once","Daily","Weekly","Twice per week","Monthly","3 days before"];

  return(
    <div className="page fade">
      <div
        className="card"
        style={{ marginBottom: 16, fontSize: 12, color: C.navy, lineHeight: 1.55, borderColor: C.amber }}
      >
        <strong>Auto-send is active</strong> — the server checks every minute. At your <strong>Exact send time</strong>, matching
        students receive reminders on the channels you chose. Use <strong>Run now</strong> to test immediately.
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
        <button className="btn btn-amber" onClick={openAdd}>+ Add New Rule</button>
      </div>

      {/* Rules List */}
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
        {rules.map(r=>(
          <div key={r.id} style={{background:"white",borderRadius:16,padding:20,border:`1.5px solid ${r.active?C.amber:C.navy}`,transition:"border .3s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:240}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:600,color:C.navy}}>{r.name}</span>
                  <span className="badge" style={{background:"#fff",color:C.navy,border:`1px solid ${r.active?C.amber:C.navy}`}}>{r.active?"● ACTIVE":"○ INACTIVE"}</span>
                  <span className="badge" style={{background:"#fff",color:C.navy,border:`1px solid ${C.amber}`}}>{r.channel}</span>
                </div>
                <div style={{fontSize:13,color:C.navy,marginBottom:3}}>
                  <span style={{fontWeight:700}}>IF:</span> {r.condition} {r.extra&&<><br/><span style={{fontWeight:700}}>AND:</span> {r.extra}</>}
                </div>
                <div style={{fontSize:13,color:C.navy,marginBottom:8}}>
                  <span style={{fontWeight:700}}>THEN:</span> <span style={{color:C.amberD,fontWeight:700}}>{r.action}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Li icon={GraduationCap} size={12} color={C.amber} />
                  <span>
                    {r.scope_display ||
                      [r.academic_year, r.term, r.class_name || "All"].filter(Boolean).join(" · ") ||
                      "School default year/term"}
                    {r.require_fee_card !== false ? " · Babyeyi fee card only" : ""}
                  </span>
                </div>
                <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,flexWrap:"wrap",marginTop:4}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,color:C.navy}}><Li icon={Clock} size={12} color={C.amber} /> Send at: <strong style={{fontWeight:600}}>{r.send_time_display || "—"}</strong></span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={Send} size={12} color={C.navy} /> Last sent: {r.last_sent_display || "Not sent yet"}</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={Users} size={12} color={C.amber} /> Reached: <strong style={{fontWeight:600,color:C.navy}}>{r.last_reached_count ?? 0}</strong> parents</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Li icon={RotateCcw} size={12} color={C.muted} /> {r.frequency}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
                <label className="tog"><input type="checkbox" checked={r.active} onChange={()=>toggleRule(r.id, r.active)}/><span className="tog-sl"/></label>
                <button
                  type="button"
                  className="btn btn-amber btn-sm"
                  disabled={runningId === r.id}
                  onClick={() => runNow(r.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Li icon={runningId === r.id ? Loader2 : Zap} size={14} className={runningId === r.id ? "animate-spin" : ""} />
                  {runningId === r.id ? "Sending…" : "Run now"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)} style={{display:"inline-flex",alignItems:"center",gap:6}}><Li icon={Pencil} size={14} /> Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={()=>setDeleteConfirm(r.id)} aria-label="Delete rule"><Li icon={Trash2} size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trigger Log */}
      <div className="card">
        <SectionTitle icon={ClipboardList} style={{ marginBottom: 14 }}>Recent Auto-Trigger Log</SectionTitle>
        <table className="tbl">
          <thead><tr><th>Rule</th><th>Scheduled time</th><th>Last sent</th><th>Reached</th><th>Status</th></tr></thead>
          <tbody>
            {rules.filter((r) => r.last_sent_at || r.send_time).length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: C.muted, fontSize: 12 }}>
                  No runs recorded yet. Active rules will log time sent and parents reached after the scheduler runs.
                </td>
              </tr>
            ) : (
              rules.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: C.navy }}>{r.name}</td>
                  <td style={{ color: C.muted, fontSize: 12 }}>{r.send_time_display || "—"}</td>
                  <td style={{ color: C.muted, fontSize: 12 }}>{r.last_sent_display}</td>
                  <td>{r.last_reached_count ?? 0} parents</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: "#fff",
                        color: C.navy,
                        border: `1px solid ${r.last_sent_at ? C.amber : C.navy}`,
                      }}
                    >
                      {r.last_sent_at ? "Sent" : r.active ? "Scheduled" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAdd&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="modal fade" style={{maxWidth:580}}>
            <div style={{background:C.navy,borderRadius:"20px 20px 0 0",padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{color:"white",fontSize:16,fontWeight:800}}>{editRule?"Edit Rule":"New Auto Rule"}</div>
                <CloseBtn onClick={()=>setShowAdd(false)} light />
              </div>
            </div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div><span className="lbl">Rule Name *</span><input className="inp" placeholder="e.g. Overdue Alert" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <div>
                  <span className="lbl">Academic Year *</span>
                  <select
                    className="sel"
                    style={{ width: "100%" }}
                    value={form.academic_year}
                    onChange={(e) => onRuleYearChange(e.target.value)}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="lbl">Term *</span>
                  <select
                    className="sel"
                    style={{ width: "100%" }}
                    value={form.term}
                    onChange={(e) => setForm((f) => ({ ...f, term: e.target.value, class_name: "All" }))}
                  >
                    {ruleTermOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="lbl">Class</span>
                  <select
                    className="sel"
                    style={{ width: "100%" }}
                    value={form.class_name || "All"}
                    onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                  >
                    {ruleClassOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label className="tog">
                  <input
                    type="checkbox"
                    checked={form.require_fee_card !== false}
                    onChange={() =>
                      setForm((f) => ({ ...f, require_fee_card: !f.require_fee_card }))
                    }
                  />
                  <span className="tog-sl" />
                </label>
                <span style={{ fontSize: 12, color: C.navy }}>
                  Only students with a Babyeyi fee card for this year/term
                </span>
              </div>
              {(matchPreview || previewLoading) && (
                <div
                  style={{
                    fontSize: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${C.amber}`,
                    color: C.navy,
                    background: "#fff",
                  }}
                >
                  {previewLoading ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.muted }}>
                      <Li icon={Loader2} size={14} className="animate-spin" /> Checking matches…
                    </span>
                  ) : matchPreview?.error ? (
                    <span style={{ color: C.danger }}>{matchPreview.error}</span>
                  ) : (
                    <>
                      <strong>{matchPreview.matched}</strong> student(s) match this rule ·{" "}
                      {matchPreview.in_scope} in scope ({matchPreview.with_fee_card} with fee card) ·{" "}
                      {matchPreview.class_name === "All" ? "all classes" : matchPreview.class_name}
                    </>
                  )}
                </div>
              )}
              <ConditionField
                label="Condition (IF)"
                required
                value={form.condition}
                onChange={(condition) => setForm((f) => ({ ...f, condition }))}
                presets={CONDITION_PRESETS}
              />
              <ConditionField
                label="Extra condition (AND)"
                optional
                value={form.extra}
                onChange={(extra) => setForm((f) => ({ ...f, extra }))}
                presets={AND_CONDITION_PRESETS}
              />
              <div><span className="lbl">Action (THEN) *</span>
                <select className="sel" style={{width:"100%"}} value={form.action} onChange={e=>setForm(f=>({...f,action:e.target.value}))}>
                  <option value="">Select action...</option>
                  {ACTIONS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="g2">
                <div><span className="lbl">Channel</span>
                  <select className="sel" style={{width:"100%"}} value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}>
                    {CHANNELS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><span className="lbl">Frequency</span>
                  <select className="sel" style={{width:"100%"}} value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                    {FREQS.map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span className="lbl">Exact send time (daily) *</span>
                <input
                  type="time"
                  className="inp"
                  value={form.send_time || "08:00"}
                  onChange={(e) => setForm((f) => ({ ...f, send_time: e.target.value }))}
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  Reminders for this rule will be sent at this time when the auto-scheduler runs.
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <label className="tog"><input type="checkbox" checked={form.active} onChange={()=>setForm(f=>({...f,active:!f.active}))}/><span className="tog-sl"/></label>
                <span style={{fontSize:13,fontWeight:600,color:C.navy}}>Activate rule immediately</span>
              </div>
              {(!form.name||!form.condition||!form.action||!form.send_time||!form.academic_year||!form.term)&&<div style={{fontSize:11,color:C.danger}}>* Required: name, year, term, conditions, action, and send time.</div>}
            </div>
            <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:12,justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button type="button" className="btn btn-amber" onClick={saveRule} disabled={saving} style={{opacity:(!form.name||!form.condition||!form.action||!form.send_time||!form.academic_year||!form.term||saving)?.5:1}}>
                {saving ? "Saving…" : editRule ? "Save Changes" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm&&(
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setDeleteConfirm(null)}>
          <div className="modal fade" style={{maxWidth:420}}>
            <div style={{padding:32,textAlign:"center"}}>
              <div style={{marginBottom:16,display:"flex",justifyContent:"center"}}><Li icon={Trash2} size={40} color={C.danger} /></div>
              <div style={{fontSize:16,fontWeight:800,color:C.navy,marginBottom:8}}>Delete this rule?</div>
              <div style={{fontSize:13,color:C.muted,marginBottom:24}}>This action cannot be undone. The rule will stop running immediately.</div>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                <button className="btn btn-ghost" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
                <button className="btn" style={{background:C.danger,color:"white",padding:"10px 24px",borderRadius:10,fontSize:13,fontWeight:700,fontFamily:"Montserrat",cursor:"pointer"}} onClick={()=>deleteRule(deleteConfirm)}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT PAGE (accountant portal layout provides sidebar) ─────────────
export default function AutoReminder() {
  const [tab, setTab] = useState("dashboard");
  const [showCampaign, setShowCampaign] = useState(false);
  const [campaignStudents, setCampaignStudents] = useState([]);
  const [campaignBuckets, setCampaignBuckets] = useState({
    not_paid: 0,
    partial: 0,
    overdue: 0,
    small_balance: 0,
  });
  const [loadingCampaignStudents, setLoadingCampaignStudents] = useState(false);
  const [toast, setToast] = useState(null);

  const [schoolName, setSchoolName] = useState("School");
  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
  const [yearOptions, setYearOptions] = useState([]);
  const [termOptions, setTermOptions] = useState([]);
  const [termsByYear, setTermsByYear] = useState({});
  const [classOptions, setClassOptions] = useState(["All"]);
  const [campaignClassOptions, setCampaignClassOptions] = useState(["All"]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [rules, setRules] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [error, setError] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadCampaigns = async () => {
    try {
      const rows = await fetchFeeReminderCampaigns();
      setCampaigns(rows);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadRules = async () => {
    try {
      const rows = await fetchFeeReminderRules();
      setRules(rows);
    } catch (e) {
      setError(e.message);
    }
  };

  const studentsRequestRef = useRef(0);
  const lastStudentQueryRef = useRef({ year: "", term: "", filterClass: "All", filterStatus: "All" });

  const loadStudents = useCallback(
    async (year, termValue, { clearTable = false } = {}) => {
      if (!year || !termValue) return;
      const reqId = ++studentsRequestRef.current;
      if (clearTable) {
        setStudents([]);
        setSummary({});
      }
      setLoadingStudents(true);
      setError("");
      try {
        const data = await fetchFeeReminderStudents({
          academic_year: year,
          term: termValue,
          class_name: filterClass !== "All" ? filterClass : undefined,
          status: filterStatus !== "All" ? filterStatus : undefined,
          q: search || undefined,
        });
        if (reqId !== studentsRequestRef.current) return;
        setStudents((data.students || []).map(mapStudentForUi));
        setSummary(data.summary || {});
        const classes = ["All", ...(data.class_names || [])];
        setClassOptions(classes);
      } catch (e) {
        if (reqId !== studentsRequestRef.current) return;
        setStudents([]);
        setSummary({});
        setError(e.message || "Failed to load students");
      } finally {
        if (reqId === studentsRequestRef.current) setLoadingStudents(false);
      }
    },
    [filterClass, filterStatus, search]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInit(true);
      try {
        const opts = await fetchFeeReminderOptions();
        if (cancelled) return;
        setSchoolName(opts.school_name || "School");
        const years = opts.academic_years?.length ? opts.academic_years : [opts.current_academic_year];
        const byYear = opts.terms_by_year && typeof opts.terms_by_year === "object" ? opts.terms_by_year : {};
        const currentYear = opts.current_academic_year || years[0] || "";
        const terms =
          (byYear[currentYear] && byYear[currentYear].length ? byYear[currentYear] : null) ||
          (opts.terms?.length ? opts.terms : ["Term 1", "Term 2", "Term 3"]);
        setYearOptions(years.filter(Boolean));
        setTermsByYear(byYear);
        setTermOptions(terms);
        setAcademicYear(currentYear);
        setTerm(opts.default_term || terms[0] || "");
        await Promise.all([loadCampaigns(), loadRules()]);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to initialize fee reminders");
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const campaignRequestRef = useRef(0);

  useEffect(() => {
    if (!academicYear || !term) return undefined;
    const prev = lastStudentQueryRef.current;
    const contextChanged =
      prev.year !== academicYear ||
      prev.term !== term ||
      prev.filterClass !== filterClass ||
      prev.filterStatus !== filterStatus;
    lastStudentQueryRef.current = {
      year: academicYear,
      term,
      filterClass,
      filterStatus,
    };
    const t = setTimeout(
      () => loadStudents(academicYear, term, { clearTable: contextChanged }),
      search?.trim() ? 400 : 0
    );
    return () => clearTimeout(t);
  }, [academicYear, term, filterClass, filterStatus, search, loadStudents]);

  const reloadCampaignStudents = useCallback(async ({ year, term: termValue, className, q }) => {
    if (!year || !termValue) return;
    const reqId = ++campaignRequestRef.current;
    setLoadingCampaignStudents(true);
    try {
      const data = await fetchFeeReminderStudents({
        academic_year: year,
        term: termValue,
        class_name: className && className !== "All" ? className : undefined,
        q: q || undefined,
      });
      if (reqId !== campaignRequestRef.current) return;
      const mapped = (data.students || []).map(mapStudentForUi);
      setCampaignStudents(mapped);
      setCampaignClassOptions(["All", ...(data.class_names || [])]);
      setCampaignBuckets(computeBucketCounts(mapped, className || "All"));
    } catch (e) {
      if (reqId !== campaignRequestRef.current) return;
      showToast(e.message || "Failed to load students");
    } finally {
      if (reqId === campaignRequestRef.current) setLoadingCampaignStudents(false);
    }
  }, []);

  const handleYearChange = (year) => {
    setAcademicYear(year);
    const terms =
      (termsByYear[year] && termsByYear[year].length ? termsByYear[year] : null) ||
      termOptions;
    if (terms.length) {
      setTermOptions(terms);
      if (!terms.includes(term)) setTerm(terms[0]);
    }
  };

  const handleSend = async (data) => {
    try {
      const templateKey = data.tpl || "gentle";
      const tplMeta = TEMPLATES.find((t) => t.id === templateKey);
      const rf = data.recipientFilters || {};

      if (!data.msg?.subject?.trim() || !data.msg?.body?.trim()) {
        showToast("Subject and message body are required.");
        return;
      }
      if (!data.recipientCount) {
        showToast("No recipients selected.");
        return;
      }

      const result = await createFeeReminderCampaign({
        academic_year: data.academicYear || academicYear,
        term: data.term || term,
        template_key: templateKey,
        title: tplMeta?.name || "Fee Reminder",
        subject: data.msg?.subject,
        body: data.msg?.body,
        channels: {
          email: data.channels?.includes("Email"),
          push: data.channels?.includes("Web Push"),
          inSystem: data.channels?.includes("In-System"),
          sms: data.channels?.includes("SMS"),
        },
        schedule_mode: data.schedule?.mode === "schedule" ? "schedule" : "now",
        scheduled_at:
          data.schedule?.mode === "schedule"
            ? `${data.schedule.date}T${data.schedule.time}:00`
            : undefined,
        deadline: data.deadline,
        filters: {
          not_paid: !!rf.notPaid,
          partial: !!rf.partial,
          overdue: !!rf.overdue,
          small_balance: !!rf.smallBalance,
          q: rf.search?.trim() || undefined,
          class_name:
            (data.className && data.className !== "All" ? data.className : null) ||
            (filterClass !== "All" ? filterClass : undefined),
          status: filterStatus !== "All" ? filterStatus : undefined,
        },
        student_ids: data.matchingStudentIds,
      });
      setShowCampaign(false);
      await loadCampaigns();
      const failed = Number(result?.failed || 0);
      const notes = result?.delivery_notes || [];
      if (failed > 0) {
        const hint = notes[0] || `${failed} channel(s) failed.`;
        showToast(
          `Reminder sent (Partial). ${hint} Push and in-app may still have reached parents.`
        );
      } else {
        showToast(
          `Campaign sent to ${data.recipientCount || 0} parents via ${(data.channels || []).join(", ")}!`
        );
      }
    } catch (e) {
      showToast(e.message || "Failed to send campaign");
    }
  };

  const reloadAll = useCallback(async () => {
    setLoadingInit(true);
    setError("");
    try {
      const opts = await fetchFeeReminderOptions();
      setSchoolName(opts.school_name || "School");
      const years = opts.academic_years?.length ? opts.academic_years : [opts.current_academic_year];
      const byYear = opts.terms_by_year && typeof opts.terms_by_year === "object" ? opts.terms_by_year : {};
      const currentYear = opts.current_academic_year || years[0] || "";
      const terms =
        (byYear[currentYear] && byYear[currentYear].length ? byYear[currentYear] : null) ||
        (opts.terms?.length ? opts.terms : ["Term 1", "Term 2", "Term 3"]);
      setYearOptions(years.filter(Boolean));
      setTermsByYear(byYear);
      setTermOptions(terms);
      if (!academicYear) setAcademicYear(currentYear);
      if (!term) setTerm(opts.default_term || terms[0] || "");
      await Promise.all([loadCampaigns(), loadRules()]);
      const y = academicYear || currentYear;
      const t = term || opts.default_term || terms[0] || "";
      if (y && t) await loadStudents(y, t);
    } catch (e) {
      setError(e.message || "Failed to refresh");
      showToast(e.message || "Failed to refresh");
    } finally {
      setLoadingInit(false);
    }
  }, [academicYear, term, loadStudents]);

  const heroShell = useMemo(() => {
    const totalStudents = Number(summary.total_students || students.length || 0);
    const unpaid = Number(summary.unpaid || 0);
    const outstanding = fmt(Number(summary.total_balance || 0));
    const campaignCount = campaigns.length;
    const totalRecipients = campaigns.reduce((a, c) => a + c.recipients, 0);
    const totalFailed = campaigns.reduce((a, c) => a + c.failed, 0);
    const totalPaid = campaigns.reduce((a, c) => a + c.paid_after, 0);
    const avgRate = campaigns.length
      ? Math.round(campaigns.reduce((a, c) => a + c.rate, 0) / campaigns.length)
      : 0;
    const recoveryRate =
      totalRecipients > 0 ? Math.round((totalPaid / totalRecipients) * 100) : 0;
    const activeRules = rules.filter((r) => r.active).length;
    const totalReached = rules.reduce((a, r) => a + Number(r.last_reached_count || 0), 0);
    const termLine = `${term || "—"} · ${academicYear || "—"}`;

    const quick = {
      newCampaign: {
        label: "New campaign",
        icon: Plus,
        variant: "navy",
        onClick: () => setShowCampaign(true),
      },
      history: {
        label: "Reminder history",
        icon: ClipboardList,
        variant: "cream",
        onClick: () => setTab("history"),
      },
      analytics: {
        label: "Analytics",
        icon: BarChart3,
        onClick: () => setTab("analytics"),
      },
      rules: {
        label: "Auto rules",
        icon: Settings,
        onClick: () => setTab("autorules"),
      },
      dashboard: {
        label: "Dashboard",
        icon: LayoutDashboard,
        onClick: () => setTab("dashboard"),
      },
    };

    const byTab = {
      dashboard: {
        eyebrow: "Fee reminders",
        titleLine: "Reminder",
        titleAccent: "Dashboard",
        subtitle: `${schoolName} · ${termLine} — student fees, filters & campaigns`,
        icon: LayoutDashboard,
        stats: [
          { label: "Total students", value: totalStudents.toLocaleString(), subValue: termLine, icon: Users },
          { label: "Unpaid", value: unpaid.toLocaleString(), subValue: "Needs reminder", icon: XCircle },
          { label: "Outstanding", value: outstanding, subValue: "Total balance", icon: Banknote },
          { label: "Campaigns sent", value: String(campaignCount), subValue: "This school", icon: Send },
        ],
        actions: [quick.newCampaign, quick.history, quick.rules],
      },
      history: {
        eyebrow: "Campaign archive",
        titleLine: "Reminder",
        titleAccent: "History",
        subtitle: `${campaignCount} campaigns · download, print & resend`,
        icon: ClipboardList,
        stats: [
          { label: "Total campaigns", value: String(campaignCount), icon: Send },
          { label: "Recipients", value: String(totalRecipients), icon: Users },
          { label: "Paid after", value: String(totalPaid), icon: Banknote },
          { label: "Failed channels", value: String(totalFailed), subValue: "Delivery attempts", icon: XCircle },
        ],
        actions: [quick.newCampaign, quick.analytics, quick.dashboard],
      },
      analytics: {
        eyebrow: "Performance",
        titleLine: "Reminder",
        titleAccent: "Analytics",
        subtitle: "Open rates, recovery & channel performance",
        icon: BarChart3,
        stats: [
          { label: "Campaigns", value: String(campaignCount), icon: Send },
          { label: "Avg open rate", value: `${avgRate}%`, icon: MailOpen },
          { label: "Payments triggered", value: String(totalPaid), icon: Banknote },
          { label: "Recovery rate", value: `${recoveryRate}%`, icon: TrendingUp },
        ],
        actions: [quick.newCampaign, quick.history, quick.rules],
      },
      autorules: {
        eyebrow: "Automation",
        titleLine: "Auto",
        titleAccent: "Rules",
        subtitle: "Schedule exact send times · track parents reached",
        icon: Settings,
        stats: [
          { label: "Total rules", value: String(rules.length), icon: Settings },
          { label: "Active rules", value: String(activeRules), icon: CheckCircle },
          { label: "Parents reached", value: String(totalReached), subValue: "Last runs combined", icon: Users },
          { label: "Campaigns", value: String(campaignCount), subValue: "Manual + auto", icon: Send },
        ],
        actions: [quick.newCampaign, quick.dashboard, quick.history],
      },
    };

    return byTab[tab] || byTab.dashboard;
  }, [tab, summary, students, campaigns, rules, schoolName, term, academicYear]);

  return (
    <>
      <style>{GS}</style>
      <div className="reminder-root animate-in fade-in duration-500">
        <ReminderHeroShell
          eyebrow={heroShell.eyebrow}
          titleLine={heroShell.titleLine}
          titleAccent={heroShell.titleAccent}
          subtitle={heroShell.subtitle}
          icon={heroShell.icon}
          stats={heroShell.stats}
          actions={heroShell.actions}
          tabs={NAV}
          activeTab={tab}
          onTabChange={setTab}
          liveLabel={error ? "Check connection" : "Live data"}
          onRefresh={reloadAll}
          refreshing={loadingInit || loadingStudents}
        />

        {loadingInit ? (
          <div className="acct-shell-standard pb-20">
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted }}>
              <Loader2 size={20} className="animate-spin" /> Loading fee reminders…
            </div>
          </div>
        ) : (
          <div className="acct-shell-standard pb-20">
            {tab === "dashboard" && (
              <Dashboard
                onCreateCampaign={() => setShowCampaign(true)}
                students={students}
                summary={summary}
                classOptions={classOptions}
                yearOptions={yearOptions}
                termOptions={termOptions}
                academicYear={academicYear}
                term={term}
                onYearChange={handleYearChange}
                onTermChange={setTerm}
                filterStatus={filterStatus}
                onStatusChange={setFilterStatus}
                filterClass={filterClass}
                onClassChange={setFilterClass}
                search={search}
                onSearchChange={setSearch}
                loading={loadingStudents}
                error={error}
                recentCampaigns={campaigns}
              />
            )}
            {tab === "history" && (
              <ReminderHistory onCreateCampaign={() => setShowCampaign(true)} campaigns={campaigns} loading={loadingInit} />
            )}
            {tab === "analytics" && <Analytics campaigns={campaigns} summary={summary} />}
            {tab === "autorules" && (
              <AutoRules
                rules={rules}
                onReload={loadRules}
                onError={showToast}
                academicYear={academicYear}
                term={term}
                yearOptions={yearOptions}
                termOptions={termOptions}
                termsByYear={termsByYear}
              />
            )}
          </div>
        )}

        {showCampaign && (
          <CampaignModal
            key={`${academicYear}-${term}`}
            onClose={() => setShowCampaign(false)}
            onSend={handleSend}
            students={campaignStudents}
            schoolName={schoolName}
            academicYear={academicYear}
            term={term}
            yearOptions={yearOptions}
            termsByYear={termsByYear}
            classOptions={campaignClassOptions}
            bucketCounts={campaignBuckets}
            loadingStudents={loadingCampaignStudents}
            onReloadStudents={reloadCampaignStudents}
            onNotify={showToast}
          />
        )}

        <button type="button" className="btn btn-amber reminder-fab" onClick={() => setShowCampaign(true)}>
          <Li icon={Plus} size={18} color={C.navy} />
          Create Reminder
        </button>

        {toast && (
          <div
            className="reminder-toast fade"
            style={{
              background: C.navy,
              color: "white",
              padding: "14px 20px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 8px 30px rgba(0,4,53,.35)",
              lineHeight: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Li icon={CheckCircle} size={18} color={C.amberL} style={{ flexShrink: 0, marginTop: 2 }} />
            {toast}
          </div>
        )}
      </div>
    </>
  );
}