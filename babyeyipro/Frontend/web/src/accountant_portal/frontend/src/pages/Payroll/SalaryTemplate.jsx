import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, RefreshCw, Save, CheckCircle2, Loader2, Power } from "lucide-react";
import AccountantOchreHero from "../../components/AccountantOchreHero";
import {
  getActivePayrollTemplate,
  savePayrollTemplate,
  getEmployeePayrollDeductions,
  createEmployeePayrollDeduction,
  updateEmployeePayrollDeduction,
  deleteEmployeePayrollDeduction,
  searchPayrollStaff,
} from "../../services/payrollTemplateService";
import {
  calcRwandaPayroll,
  calcProgressivePAYEBreakdown,
  DEFAULT_PAYE_BRACKETS,
  DEFAULT_SCHOOL_ALLOWANCE_RULES,
  normalizeStatutoryRates,
  shouldUseSchoolAutoAllowances,
} from "../../utils/rwandaPayrollEngine";
import PayrollRegisterTable from "../../components/PayrollRegisterTable";
import {
  buildPayrollRegisterRow,
  sumPayrollRegisterRows,
  downloadPayrollRegisterCsv,
  downloadPayrollRegisterExcel,
} from "../../utils/payrollRegister";

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
const T = {
  navy:       "#000435",
  navyDeep:   "#00022a",
  navyMid:    "#060c52",
  amber:      "#F59E0B",
  amberLight: "#FCD34D",
  amberPale:  "#FEF3C7",
  amberDark:  "#D97706",
  white:      "#FFFFFF",
  off:        "#F7F8FC",
  border:     "#E4E8F0",
  borderDark: "#CBD2E0",
  text:       "#111827",
  muted:      "#6B7280",
  faint:      "#9CA3AF",
  success:    "#059669",
  successBg:  "#D1FAE5",
  danger:     "#DC2626",
  dangerBg:   "#FEE2E2",
  info:       "#2563EB",
  infoBg:     "#DBEAFE",
  purple:     "#7C3AED",
  purpleBg:   "#EDE9FE",
};

/* ─────────────────────────────────────────────────────────────
   TINY SVG ICONS
───────────────────────────────────────────────────────────── */
const Ic = ({ p, s = 16, sw = 1.8, fill = "none", stroke = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={p} />
  </svg>
);
const IPlus    = () => <Ic p="M12 5v14M5 12h14" />;
const IEdit    = () => <Ic p="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z" />;
const ITrash   = () => <Ic p="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />;
const ICheck   = () => <Ic p="M20 6L9 17l-5-5" />;
const IClose   = () => <Ic p="M18 6L6 18M6 6l12 12" />;
const ISearch  = () => <Ic p="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />;
const IChevD   = () => <Ic p="M6 9l6 6 6-6" />;
const IInfo    = () => <Ic p="M12 16v-4M12 8h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z" />;
const IUser    = () => <Ic p="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const ICalc    = () => <Ic p="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3M9 7V5a2 2 0 014 0v2M9 7h6M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01" />;
const ISave    = () => <Ic p="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />;
const IEye     = () => <Ic p="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z" />;

/* ─────────────────────────────────────────────────────────────
   PAYROLL MATH  (Rwanda-accurate)
───────────────────────────────────────────────────────────── */

const fmt = n => Math.round(Number(n) || 0).toLocaleString();

const DEFAULT_STATUTORY_RATES = {
  rssbEmployee: 6,
  rssbEmployer: 6,
  occupationalHazard: 2,
  maternityEmployee: 0.3,
  maternityEmployer: 0.3,
  ramaEmployee: 7.5,
  ramaEmployer: 7.5,
  cbhi: 0.5,
};

function normalizeAllowanceAmtType(raw) {
  const s = String(raw || "").toLowerCase();
  if (s.includes("gross") || (s.includes("percent") && s.includes("gross"))) return "Percentage";
  if (s.includes("percent") || s.includes("basic")) return "Percentage";
  return "Fixed";
}

function allowanceAmtTypeLabel(amtType) {
  const t = normalizeAllowanceAmtType(amtType);
  if (t === "Percentage") {
    const s = String(amtType || "").toLowerCase();
    if (s.includes("gross")) return "Percentage of Gross";
    return "Percentage of Basic";
  }
  return "Fixed";
}

function isFixedAmountType(amtType) {
  return normalizeAllowanceAmtType(amtType) === "Fixed";
}

function mapAllowanceFromApi(a, i) {
  return {
    id: a.id || i + 1,
    category: a.category || a.name || "Allowance",
    customName: a.customName || "",
    amtType: normalizeAllowanceAmtType(a.amountType || a.type || a.amtType),
    value: Number(a.value || 0),
    taxTreatment: a.taxTreatment || (a.taxable === false ? "Non-Taxable" : "Taxable"),
    frequency: a.frequency || a.recurring || "Monthly",
    appliesTo: a.appliesTo || "All Employees",
    status: a.status || "Active",
  };
}

function mapAllowanceToApi(a) {
  const isPct = normalizeAllowanceAmtType(a.amtType) === "Percentage";
  const label = String(a.amtType || "").toLowerCase();
  const amountType = isPct
    ? (label.includes("gross") ? "Percentage of Gross Salary" : "Percentage of Basic Salary")
    : "Fixed Amount";
  return {
    id: a.id,
    category: a.category,
    name: a.category,
    customName: a.customName || "",
    amountType,
    value: Number(a.value || 0),
    taxTreatment: a.taxTreatment,
    frequency: a.frequency,
    appliesTo: a.appliesTo,
    status: a.status || "Active",
  };
}

function mapDeductionFromApi(d, i) {
  const amtTypeRaw = String(d.amountType || d.type || d.amtType || "Fixed");
  const isPct = amtTypeRaw.toLowerCase().includes("percent");
  return {
    id: d.id || i + 1,
    category: d.category || d.name || "Deduction",
    customName: d.customName || "",
    amtType: isPct ? "Percentage" : "Fixed",
    value: Number(d.value || 0),
    frequency: d.recurring || d.frequency || "Monthly",
    appliesTo: d.appliesTo || "All Employees",
    priority: d.priority || "Medium",
    status: d.status || "Active",
  };
}

function mapDeductionToApi(d) {
  const isPct = d.amtType === "Percentage";
  return {
    id: d.id,
    category: d.category,
    name: d.category,
    amountType: isPct ? "Percentage of Basic" : "Fixed Amount",
    value: Number(d.value || 0),
    recurring: d.frequency,
    appliesTo: d.appliesTo,
    priority: d.priority,
    status: d.status || "Active",
  };
}

function mapEmpDedFromApi(d) {
  const sm = d.startMonth;
  const sy = d.startYear;
  const startLabel = sm && sy ? `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][sm]} ${sy}` : "";
  const em = d.endMonth;
  const ey = d.endYear;
  const endLabel = em && ey ? `${["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][em]} ${ey}` : "";
  return {
    id: d.id,
    staffUserId: d.staffUserId,
    emp: d.staffName || "",
    dept: "",
    position: "",
    empCode: "",
    category: d.deductionType === "Other" ? d.customName || "Other" : d.deductionType,
    customName: d.customName || "",
    total: Number(d.totalAmount || 0),
    monthly: Number(d.monthlyInstallment || 0),
    remaining: Number(d.remainingBalance ?? d.totalAmount ?? 0),
    startMonth: startLabel,
    endMonth: endLabel,
    status: d.status || "Active",
    notes: d.notes || "",
  };
}

function allowancesForEngine(list) {
  return (list || [])
    .filter((a) => a.status === "Active")
    .map((a) => ({
      category: a.category,
      name: a.category,
      amountType: a.amtType === "Percentage" ? "Percentage of Basic Salary" : "Fixed Amount",
      value: a.value,
      status: "Active",
    }));
}

function deductionsForEngine(list) {
  return (list || [])
    .filter((d) => d.status === "Active")
    .map((d) => ({
      amountType: d.amtType === "Percentage" ? "Percentage" : "Fixed Amount",
      value: d.value,
      status: "Active",
    }));
}

function DashboardStats({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden grid grid-cols-2 sm:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`p-5 flex flex-col items-center justify-center text-center min-h-[6.5rem] hover:bg-slate-50 transition-colors
            ${i % 2 === 0 && i < stats.length - 1 ? "border-r border-black/5" : ""}
            ${i < 2 && stats.length > 2 ? "border-b border-black/5 sm:border-b-0" : ""}
            ${i < stats.length - 1 ? "sm:border-r border-black/5" : ""}`}
        >
          <span className="text-xl sm:text-2xl font-semibold text-[#000435] tabular-nums tracking-tight">
            {stat.value}
          </span>
          <p className="text-[8px] sm:text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-1 opacity-70">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

const PAYE_BRACKETS = [
  { min: "0", max: "60,000",    rate: "0%" },
  { min: "60,001", max: "100,000",  rate: "10%" },
  { min: "100,001", max: "200,000", rate: "20%" },
  { min: "200,001+", max: "Unlimited", rate: "30%" },
];

const ALLOWANCE_CATEGORIES = [
  "Transport Allowance","Housing Allowance","Communication Allowance",
  "Responsibility Allowance","Risk Allowance","Meal Allowance",
  "Entertainment Allowance","Overtime","Bonus","Acting Allowance",
  "Hardship Allowance","Medical Allowance","Travel Allowance","Other",
];
const DEDUCTION_CATEGORIES = [
  "Loan","Salary Advance","SACCO","Union Fee","Penalty",
  "Court Order","Insurance","Staff Welfare","Other",
];

/* ─────────────────────────────────────────────────────────────
   SHARED UI PRIMITIVES
───────────────────────────────────────────────────────────── */
const badge = (text, color) => {
  const map = {
    green:  { bg: T.successBg, color: T.success },
    red:    { bg: T.dangerBg,  color: T.danger  },
    amber:  { bg: T.amberPale, color: T.amberDark },
    blue:   { bg: T.infoBg,    color: T.info    },
    purple: { bg: T.purpleBg,  color: T.purple  },
    gray:   { bg: "#F3F4F6",   color: T.muted   },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ display:"inline-block", padding:"2px 9px", borderRadius:99,
      fontSize:11, fontWeight:700, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>
      {text}
    </span>
  );
};

function ToggleSwitch({ value, options, onChange }) {
  return (
    <div style={{ display:"flex", borderRadius:8, overflow:"hidden", border:`1.5px solid ${T.border}`, width:"fit-content" }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer",
            border:"none", transition:"all .15s",
            background: value===o ? T.navy : T.white,
            color: value===o ? T.white : T.muted }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:T.muted,
        textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = { width:"100%", padding:"9px 12px", borderRadius:8, border:`1.5px solid ${T.border}`,
  fontSize:13, color:T.text, background:T.white, outline:"none", boxSizing:"border-box" };
const sel = { ...inp, appearance:"none", cursor:"pointer" };

function Select({ value, onChange, options }) {
  return (
    <div style={{ position:"relative" }}>
      <select style={sel} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:T.muted }}>
        <IChevD />
      </div>
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide }) {
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,4,53,0.55)", zIndex:1000,
        display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}>
      <div style={{ background:T.white, borderRadius:16, padding:"28px 32px",
        width: wide ? 640 : 500, maxWidth:"92vw", maxHeight:"88vh", overflowY:"auto",
        boxShadow:"0 24px 64px rgba(0,4,53,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:T.navy }}>{title}</div>
            {subtitle && <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, padding:4, borderRadius:6 }}>
            <IClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div style={{ background:T.white, borderRadius:12, padding:"16px 18px",
      borderLeft:`4px solid ${accent}`, boxShadow:"0 1px 4px rgba(0,4,53,0.07)",
      border:`1px solid ${T.border}`, borderLeftColor:accent, borderLeftWidth:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
        <div style={{ color:accent, opacity:0.7 }}>{icon}</div>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:T.navy, margin:"6px 0 4px" }}>{value}</div>
      <div style={{ fontSize:12, color:T.muted }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:16 }}>
      <div>
        <div style={{ fontSize:15, fontWeight:800, color:T.navy }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", size="md", disabled }) {
  const v = {
    primary:  { bg:T.amber,  color:T.navy,    border:"none" },
    navy:     { bg:T.navy,   color:T.white,   border:"none" },
    outline:  { bg:"transparent", color:T.navy, border:`1.5px solid ${T.border}` },
    ghost:    { bg:T.off,    color:T.muted,   border:`1.5px solid ${T.border}` },
    danger:   { bg:T.dangerBg, color:T.danger, border:`1.5px solid #FECACA` },
    success:  { bg:T.successBg, color:T.success, border:`1.5px solid #A7F3D0` },
  }[variant] || {};
  const p = size==="sm" ? "6px 14px" : size==="lg" ? "11px 24px" : "8px 18px";
  const fs = size==="sm" ? 11 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:p, borderRadius:8,
        fontSize:fs, fontWeight:600, cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?0.5:1, transition:"all .15s", ...v }}>
      {children}
    </button>
  );
}

function InfoBox({ children, color="blue" }) {
  const map = { blue:{bg:T.infoBg,color:T.info}, amber:{bg:T.amberPale,color:T.amberDark}, green:{bg:T.successBg,color:T.success} };
  const s = map[color];
  return (
    <div style={{ background:s.bg, borderRadius:8, padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", marginBottom:12 }}>
      <div style={{ color:s.color, marginTop:1, flexShrink:0 }}><IInfo /></div>
      <div style={{ fontSize:12, color:s.color, lineHeight:1.5 }}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 1 — ALLOWANCES
───────────────────────────────────────────────────────────── */
function AllowancesTab({ allowances, setAllowances, allowanceAuto, setAllowanceAuto, onSaveDraft, saving }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const blank = { category:"Transport Allowance", customName:"", amtType:"Fixed Amount", value:"", taxTreatment:"Taxable", frequency:"Monthly", appliesTo:"All Employees", status:"Active" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const applyAndSave = async (next) => {
    setAllowances(next);
    if (onSaveDraft) await onSaveDraft({ allowances: next });
  };

  function open(a) {
    if (a) {
      const label = allowanceAmtTypeLabel(a.amtType);
      const amtForm =
        label === "Fixed" ? "Fixed Amount"
        : label === "Percentage of Gross" ? "Percentage of Gross Salary"
        : "Percentage of Basic Salary";
      setForm({ ...a, amtType: amtForm, value: String(a.value) });
    } else {
      setForm(blank);
    }
    setEditId(a ? a.id : null);
    setShowModal(true);
  }
  async function save() {
    const category = form.category === "Other" && form.customName ? form.customName : form.category;
    const item = {
      ...form,
      category,
      amtType: normalizeAllowanceAmtType(form.amtType),
      value: parseFloat(form.value) || 0,
      id: editId || Date.now(),
    };
    const next = editId ? allowances.map((x) => (x.id === editId ? item : x)) : [...allowances, item];
    setShowModal(false);
    await applyAndSave(next);
  }
  async function toggle(id) {
    const next = allowances.map((x) =>
      x.id === id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x
    );
    await applyAndSave(next);
  }
  async function del(id) {
    const row = allowances.find((x) => x.id === id);
    const label = row?.category || "this allowance";
    if (!window.confirm(`Delete "${label}"? You can add it again later.`)) return;
    await applyAndSave(allowances.filter((x) => x.id !== id));
  }

  return (
    <div>
      <SectionHeader
        title="Allowance Components"
        
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" size="sm">Import Allowances</Btn>
            <Btn onClick={() => open(null)}><IPlus /> Add Allowance</Btn>
          </div>
        }
      />
   
      <label style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, cursor:"pointer", fontSize:13, fontWeight:600, color:T.navy }}>
        <input
          type="checkbox"
          checked={allowanceAuto?.enabled !== false}
          onChange={async (e) => {
            const next = { ...DEFAULT_SCHOOL_ALLOWANCE_RULES, ...allowanceAuto, enabled: e.target.checked };
            setAllowanceAuto(next);
            if (onSaveDraft) await onSaveDraft({ allowanceAuto: next });
          }}
        />
        Auto-calculate Others, Housing &amp; Transport from each employee&apos;s basic salary
      </label>
      <InfoBox>Manual allowance rows below apply only when auto mode is off, or as extra one-off items on a payroll run.</InfoBox>

      {/* Table */}
      <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:T.navy }}>
              {["Allowance Name","Amount Type","Value","Tax Treatment","Frequency","Applies To","Status","Actions"]
                .map(h => <th key={h} style={{ padding:"11px 14px", color:T.white, fontWeight:600, textAlign:"left", fontSize:11, letterSpacing:"0.4px", whiteSpace:"nowrap" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {allowances.map((a,i) => (
              <tr key={a.id} style={{ background:i%2===0?T.white:T.off, borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"11px 14px", fontWeight:600, color:T.navy }}>{a.category}</td>
                <td style={{ padding:"11px 14px", color:T.muted }}>{allowanceAmtTypeLabel(a.amtType)}</td>
                <td style={{ padding:"11px 14px", fontWeight:700, color:T.text }}>
                  {isFixedAmountType(a.amtType) ? `${fmt(a.value)} RWF` : `${a.value}%`}
                </td>
                <td style={{ padding:"11px 14px" }}>
                  {badge(a.taxTreatment, a.taxTreatment==="Taxable"?"amber":"green")}
                </td>
                <td style={{ padding:"11px 14px", color:T.muted }}>{a.frequency}</td>
                <td style={{ padding:"11px 14px", color:T.muted, fontSize:12 }}>{a.appliesTo}</td>
                <td style={{ padding:"11px 14px" }}>
                  {badge(a.status, a.status==="Active"?"green":"gray")}
                </td>
                <td style={{ padding:"11px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn variant="ghost" size="sm" onClick={() => open(a)}><IEdit /></Btn>
                    <Btn variant={a.status==="Active"?"ghost":"success"} size="sm" onClick={() => toggle(a.id)}>
                      {a.status==="Active" ? "Pause" : "Activate"}
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => del(a.id)}><ITrash /></Btn>
                  </div>
                </td>
              </tr>
            ))}
            {allowances.length===0 && (
              <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:T.faint }}>No allowances configured. Click "Add Allowance" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editId ? "Edit Allowance" : "Add Allowance"} subtitle="Configure this salary allowance component" onClose={() => setShowModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Allowance Category" span={2}>
              <Select value={form.category} onChange={f("category")} options={ALLOWANCE_CATEGORIES} />
            </Field>
            {form.category==="Other" && (
              <Field label="Specify Allowance Name" span={2}>
                <input style={inp} value={form.customName} onChange={e=>f("customName")(e.target.value)} placeholder="e.g. Research Allowance" />
              </Field>
            )}
            <Field label="Amount Type">
              <Select value={form.amtType} onChange={f("amtType")} options={["Fixed Amount","Percentage of Basic Salary","Percentage of Gross Salary"]} />
            </Field>
            <Field label={form.amtType==="Fixed Amount" ? "Value (RWF)" : "Percentage (%)"}>
              <input style={inp} value={form.value} onChange={e=>f("value")(e.target.value)} placeholder={form.amtType==="Fixed Amount"?"50000":"10"} />
            </Field>
            <Field label="Tax Treatment">
              <ToggleSwitch value={form.taxTreatment} options={["Taxable","Non-Taxable"]} onChange={f("taxTreatment")} />
            </Field>
            <Field label="Frequency">
              <Select value={form.frequency} onChange={f("frequency")} options={["Monthly","Quarterly","Yearly","One-Time"]} />
            </Field>
            <Field label="Applies To" span={2}>
              <Select value={form.appliesTo} onChange={f("appliesTo")} options={["All Employees","Specific Department","Specific Position"]} />
            </Field>
            <Field label="Status">
              <ToggleSwitch value={form.status} options={["Active","Inactive"]} onChange={f("status")} />
            </Field>
          </div>

          {/* Preview */}
          <div style={{ marginTop:18, background:`linear-gradient(135deg,${T.navy},${T.navyMid})`, borderRadius:10, padding:"14px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.amberLight, marginBottom:8, textTransform:"uppercase" }}>Preview</div>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>{form.category==="Other"&&form.customName ? form.customName : form.category}</div>
            <div style={{ fontSize:13, color:T.amberLight, marginTop:4 }}>
              {form.amtType==="Fixed Amount" ? `${fmt(form.value||0)} RWF` : `${form.value||0}% of Salary`}
              {" · "}{form.frequency}{" · "}{form.taxTreatment}{" · "}{form.appliesTo}
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={saving}><ICheck /> {saving ? "Saving…" : editId ? "Update" : "Add"} Allowance</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — DEDUCTIONS
───────────────────────────────────────────────────────────── */
function DeductionsTab({ deductions, setDeductions, onSaveDraft, saving }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const blank = { category:"SACCO", customName:"", amtType:"Fixed", value:"", frequency:"Monthly", appliesTo:"All Employees", priority:"Medium", status:"Active" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  const applyAndSave = async (next) => {
    setDeductions(next);
    if (onSaveDraft) await onSaveDraft({ deductions: next });
  };

  function open(d) { setForm(d ? { ...d, value:String(d.value) } : blank); setEditId(d?d.id:null); setShowModal(true); }
  async function save() {
    const item = {
      ...form,
      value: parseFloat(form.value) || 0,
      id: editId || Date.now(),
      category: form.category === "Other" && form.customName ? form.customName : form.category,
    };
    const next = editId ? deductions.map((x) => (x.id === editId ? item : x)) : [...deductions, item];
    setShowModal(false);
    await applyAndSave(next);
  }
  async function toggle(id) {
    const next = deductions.map((x) =>
      x.id === id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x
    );
    await applyAndSave(next);
  }
  async function del(id) {
    const row = deductions.find((x) => x.id === id);
    const label = row?.category || "this deduction";
    if (!window.confirm(`Delete "${label}"? You can add it again later.`)) return;
    await applyAndSave(deductions.filter((x) => x.id !== id));
  }

  const priorityColor = { High:"red", Medium:"amber", Low:"blue" };

  return (
    <div>
      <SectionHeader
        title="Recurring Deductions"
        sub="Non-statutory deductions applied automatically during payroll generation"
        action={<Btn onClick={() => open(null)}><IPlus /> Add Deduction</Btn>}
      />
      <InfoBox color="amber">These are non-statutory deductions (e.g. SACCO, Union Fee). Statutory deductions (RSSB, PAYE, RAMA, CBHI) are configured in the Statutory Rates tab.</InfoBox>

      <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:T.navy }}>
              {["Deduction Name","Type","Value","Frequency","Applies To","Priority","Status","Actions"]
                .map(h => <th key={h} style={{ padding:"11px 14px", color:T.white, fontWeight:600, textAlign:"left", fontSize:11, letterSpacing:"0.4px" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {deductions.map((d,i) => (
              <tr key={d.id} style={{ background:i%2===0?T.white:T.off, borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"11px 14px", fontWeight:600, color:T.navy }}>{d.category}</td>
                <td style={{ padding:"11px 14px", color:T.muted }}>{d.amtType}</td>
                <td style={{ padding:"11px 14px", fontWeight:700 }}>
                  {d.amtType==="Fixed" ? `${fmt(d.value)} RWF` : `${d.value}%`}
                </td>
                <td style={{ padding:"11px 14px", color:T.muted }}>{d.frequency}</td>
                <td style={{ padding:"11px 14px", color:T.muted, fontSize:12 }}>{d.appliesTo}</td>
                <td style={{ padding:"11px 14px" }}>{badge(d.priority, priorityColor[d.priority]||"gray")}</td>
                <td style={{ padding:"11px 14px" }}>{badge(d.status, d.status==="Active"?"green":"gray")}</td>
                <td style={{ padding:"11px 14px" }}>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn variant="ghost" size="sm" onClick={() => open(d)} title="Edit"><IEdit /></Btn>
                    <Btn variant={d.status==="Active"?"ghost":"success"} size="sm" onClick={() => toggle(d.id)}>
                      {d.status==="Active" ? "Pause" : "Activate"}
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => del(d.id)} title="Delete"><ITrash /></Btn>
                  </div>
                </td>
              </tr>
            ))}
            {deductions.length===0 && (
              <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:T.faint }}>No deductions configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={editId?"Edit Deduction":"Add Deduction"} subtitle="Configure this recurring payroll deduction" onClose={() => setShowModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Deduction Category" span={2}>
              <Select value={form.category} onChange={f("category")} options={DEDUCTION_CATEGORIES} />
            </Field>
            {form.category==="Other" && (
              <Field label="Specify Deduction Name" span={2}>
                <input style={inp} value={form.customName} onChange={e=>f("customName")(e.target.value)} placeholder="e.g. Staff Insurance" />
              </Field>
            )}
            <Field label="Amount Type">
              <ToggleSwitch value={form.amtType} options={["Fixed","Percentage"]} onChange={f("amtType")} />
            </Field>
            <Field label={form.amtType==="Fixed"?"Value (RWF)":"Percentage (%)"}>
              <input style={inp} value={form.value} onChange={e=>f("value")(e.target.value)} placeholder={form.amtType==="Fixed"?"10000":"5"} />
            </Field>
            <Field label="Frequency">
              <ToggleSwitch value={form.frequency} options={["Monthly","One-Time"]} onChange={f("frequency")} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={f("priority")} options={["High","Medium","Low"]} />
            </Field>
            <Field label="Apply To" span={2}>
              <ToggleSwitch value={form.appliesTo} options={["All Employees","Selected Employees"]} onChange={f("appliesTo")} />
            </Field>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={save}><ICheck /> {editId?"Update":"Add"} Deduction</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 3 — STATUTORY RATES
───────────────────────────────────────────────────────────── */
function StatutoryTab({
  allowances,
  deductions,
  empDeductions,
  statutory,
  payeRates,
  previewBasic,
  setPreviewBasic,
  allowanceAuto,
  schoolName = "School",
}) {
  const schoolAuto = shouldUseSchoolAutoAllowances([], allowanceAuto || {}, {});
  const allowanceRules = allowanceAuto || DEFAULT_SCHOOL_ALLOWANCE_RULES;
  const engineAllowances = schoolAuto ? [] : allowancesForEngine(allowances);
  const [editingPAYE, setEditingPAYE] = useState(false);
  const [liveStaff, setLiveStaff] = useState([]);
  const [liveStaffLoading, setLiveStaffLoading] = useState(false);

  const pb = parseFloat(String(previewBasic).replace(/,/g, "")) || 0;
  const ratesForPaye = payeRates?.length ? payeRates : DEFAULT_PAYE_BRACKETS;
  const pr = calcRwandaPayroll({
    basicSalary: pb,
    allowances: engineAllowances,
    templateDeductions: deductionsForEngine(deductions),
    employeeDeductions: (empDeductions || [])
      .filter((d) => d.status === "Active")
      .map((d) => ({ monthlyInstallment: d.monthly })),
    statutory: statutory || {},
    payeRates: ratesForPaye,
    allowanceRules,
  });
  const payeDetail = calcProgressivePAYEBreakdown(pr.grossSalary, ratesForPaye);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLiveStaffLoading(true);
      try {
        const rows = await searchPayrollStaff("", 500);
        if (!cancelled) setLiveStaff(rows);
      } catch {
        if (!cancelled) setLiveStaff([]);
      } finally {
        if (!cancelled) setLiveStaffLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const empDedByStaff = useMemo(() => {
    const map = new Map();
    for (const d of empDeductions || []) {
      if (d.status !== "Active" || !d.staffUserId) continue;
      const id = Number(d.staffUserId);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push({ monthlyInstallment: d.monthly });
    }
    return map;
  }, [empDeductions]);

  const calcForBasic = useCallback((basicVal) => calcRwandaPayroll({
    basicSalary: basicVal,
    allowances: engineAllowances,
    templateDeductions: deductionsForEngine(deductions),
    statutory: statutory || {},
    payeRates: ratesForPaye,
    allowanceRules,
  }), [engineAllowances, deductions, statutory, ratesForPaye, allowanceRules]);

  const liveRegisterRows = useMemo(() => {
    const rows = [];
    for (const s of liveStaff) {
      const basic = Number(s?.payroll?.basicSalary || s?.salary?.basic || 0);
      if (!basic) continue;
      const calc = calcRwandaPayroll({
        basicSalary: basic,
        allowances: engineAllowances,
        templateDeductions: deductionsForEngine(deductions),
        employeeDeductions: empDedByStaff.get(Number(s.staffUserId)) || [],
        statutory: statutory || {},
        payeRates: ratesForPaye,
        allowanceRules,
      });
      rows.push(buildPayrollRegisterRow({
        fullName: s.fullName,
        staffCode: s.staffCode,
        rssbNumber: s.rssbNumber || "",
        nationalId: s.nationalId || "",
        sex: s.sex || "",
      }, calc));
    }
    if (!rows.length && pb > 0) {
      rows.push(buildPayrollRegisterRow({ fullName: "Sample (preview basic)" }, pr));
    }
    return rows;
  }, [liveStaff, engineAllowances, deductions, empDedByStaff, statutory, ratesForPaye, pb, pr, allowanceRules]);

  const registerTotals = useMemo(
    () => (liveRegisterRows.length ? sumPayrollRegisterRows(liveRegisterRows) : null),
    [liveRegisterRows]
  );

  const periodLabel = `PAYROLL REGISTER · ${new Date().toLocaleString("en", { month: "long", year: "numeric" }).toUpperCase()}`;

  const st = statutory || {};
  const contributions = [
    { title:"RSSB Pension (CSR)", base:"Gross Salary", empRate:`${st.rssbEmployee ?? 6}%`, emplRate:`${st.rssbEmployer ?? 6}%`, total:"12% on gross", empAmt:pr.rssbEmployee, emplAmt:pr.rssbEmployer, note:"CSR 6% employee + 6% employer on gross. TOTAL CSR 14% adds 2% hazard on base (maternity separate)." },
    { title:"Maternity Leave Fund", base:"Base Salary", empRate:`${st.maternityEmployee ?? 0.3}%`, emplRate:`${st.maternityEmployer ?? 0.3}%`, total:"0.6% on base", empAmt:pr.maternityEmployee, emplAmt:pr.maternityEmployer, note:"0.3% employee + 0.3% employer on base (Gross − Transport). TOT MLD = sum of both." },
    { title:"RAMA (Medical)", base:"Basic Salary", empRate:`${st.ramaEmployee ?? 7.5}%`, emplRate:`${st.ramaEmployer ?? 7.5}%`, total:"15%", empAmt:pr.ramaEmployee, emplAmt:pr.ramaEmployer, note:"Medical insurance" },
    { title:"Occupational Hazard (CSR 2%)", base:"Base Salary", empRate:"—", emplRate:`${st.occupationalHazard ?? 2}%`, total:"2% on base", empAmt:0, emplAmt:pr.occupationalHazard, note:"Employer 2% on base. CSR 8% = 6% employer pension + 2% hazard" },
    { title:"CBHI / Mutuelle", base:"Net Salary", empRate:`${st.cbhi ?? 0.5}%`, emplRate:"—", total:"0.5%", empAmt:pr.cbhi, emplAmt:0, note:"Deducted from final net salary" },
  ];

  return (
    <div>
      <SectionHeader title="Statutory Rates & Formulas" sub="Rwanda Revenue Authority and RSSB contribution rates — configured once" />

      {/* PAYE */}
      <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, padding:"20px 24px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:T.navy }}>PAYE — Income Tax</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>Progressive tax calculated on Gross Salary (Rwanda RRA brackets)</div>
          </div>
          <Btn variant="outline" size="sm" onClick={() => setEditingPAYE(v=>!v)}>
            <IEdit /> {editingPAYE?"Done Editing":"Edit PAYE Rates"}
          </Btn>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:T.navy }}>
              {["Min Income (RWF)","Max Income (RWF)","Tax Rate"].map(h =>
                <th key={h} style={{ padding:"9px 14px", color:T.white, fontWeight:600, textAlign:"left", fontSize:11 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {PAYE_BRACKETS.map((b,i) => (
              <tr key={i} style={{ background:i%2===0?T.white:T.off, borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"10px 14px", color:T.muted }}>{b.min}</td>
                <td style={{ padding:"10px 14px", color:T.muted }}>{b.max}</td>
                <td style={{ padding:"10px 14px" }}>
                  {badge(b.rate, b.rate==="0%"?"green":b.rate==="10%"?"blue":b.rate==="20%"?"amber":"red")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contributions grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
        {contributions.map(c => (
          <div key={c.title} style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
            padding:"16px 18px", borderTop:`3px solid ${T.amber}`, boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
            <div style={{ fontWeight:800, fontSize:13, color:T.navy, marginBottom:4 }}>{c.title}</div>
            <div style={{ fontSize:11, color:T.muted, marginBottom:10 }}>Base: <strong>{c.base}</strong> · {c.note}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {[["Employee",c.empRate,T.info],["Employer",c.emplRate,T.success],["Total",c.total,T.navy]].map(([lbl,rate,clr])=>(
                <div key={lbl} style={{ background:T.off, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.faint, fontWeight:600 }}>{lbl}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:clr, marginTop:2 }}>{rate}</div>
                </div>
              ))}
            </div>
            {(c.empAmt>0||c.emplAmt>0) && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", fontSize:12 }}>
                {c.empAmt>0 && <span style={{ color:T.info }}>Emp: <strong>{fmt(c.empAmt)} RWF</strong></span>}
                {c.emplAmt>0 && <span style={{ color:T.success }}>Empl: <strong>{fmt(c.emplAmt)} RWF</strong></span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Live formula preview */}
      <div style={{ background:`linear-gradient(135deg,${T.navyDeep} 0%,${T.navyMid} 100%)`, borderRadius:14, padding:"22px 26px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:T.amberLight }}>Live Formula Preview</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:2 }}>Enter basic salary — gross and PAYE update from active allowances</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>Basic Salary (RWF):</div>
            <input value={previewBasic} onChange={e=>setPreviewBasic(e.target.value.replace(/\D/g,""))}
              style={{ ...inp, width:140, background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.2)",
                color:T.white, fontWeight:700 }} />
          </div>
        </div>

        <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:10 }}>
          Uses {allowances.filter(a=>a.status==="Active").length} active allowance(s) from template + statutory rates
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10 }}>
          {[
            { label:"Basic Salary",    value:pr.basicSalary,  color:"#E2E8F0", sign:"" },
            { label:"Gross Salary",    value:pr.grossSalary,  color:T.amberLight, sign:"=" },
            { label:"Base Salary",     value:pr.baseSalary,   color:"#93C5FD", sign:"" },
            { label:"PAYE (on gross)", value:pr.paye,         color:"#FCA5A5", sign:"−" },
            { label:"CSR 6% emp (gross)", value:pr.rssbEmployee, color:"#FCA5A5", sign:"−" },
            { label:"M.LEAVE 0.3% emp", value:pr.maternityEmployee, color:"#FCA5A5", sign:"−" },
            { label:"RAMA 7.5% emp", value:pr.ramaEmployee, color:"#FCA5A5", sign:"−" },
            { label:"Other Deductions",value:pr.otherDeductions, color:"#FCA5A5", sign:"−" },
            { label:"Income Salary", value:pr.incomeSalary ?? pr.netBeforeCbhi, color:"#6EE7B7", sign:"=" },
            { label:"Mutuelle CBHI 0.5%", value:pr.cbhi, color:"#FCA5A5", sign:"−" },
            { label:"Net Salary",value:pr.finalNet, color:"#34D399", sign:"=" },
            { label:"TOTAL CSR 14%", value:pr.totalCsr14, color:"#FCD34D", sign:"" },
            { label:"CSR 8% (empl.)", value:pr.csrEmployer8, color:"#93C5FD", sign:"" },
            { label:"M.LEAVE 0.3% empl", value:pr.maternityEmployer, color:"#93C5FD", sign:"" },
            { label:"Cost to School",  value:pr.totalCostToSchool, color:T.amberLight, sign:"" },
          ].map(r => (
            <div key={r.label} style={{ background:"rgba(255,255,255,0.07)", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:600, textTransform:"uppercase" }}>{r.sign} {r.label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:r.color, marginTop:4 }}>{fmt(r.value)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:18, background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.amberLight, marginBottom:10 }}>
            PAYE bracket breakdown (on gross salary — not flat 30%)
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ color:"rgba(255,255,255,0.5)" }}>
                <th style={{ textAlign:"left", padding:"6px 8px", fontWeight:600 }}>Bracket</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:600 }}>Amount in bracket</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:600 }}>Rate</th>
                <th style={{ textAlign:"right", padding:"6px 8px", fontWeight:600 }}>Tax</th>
              </tr>
            </thead>
            <tbody>
              {payeDetail.rows.map((row) => (
                <tr key={row.bracket} style={{ borderTop:"1px solid rgba(255,255,255,0.08)" }}>
                  <td style={{ padding:"8px", color:"rgba(255,255,255,0.85)" }}>{row.bracket}</td>
                  <td style={{ padding:"8px", textAlign:"right", color:"#E2E8F0" }}>{fmt(row.amountInBracket)}</td>
                  <td style={{ padding:"8px", textAlign:"right", color:"#93C5FD" }}>{row.rate}%</td>
                  <td style={{ padding:"8px", textAlign:"right", color:"#FCA5A5", fontWeight:700 }}>{fmt(row.tax)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:"2px solid rgba(254,191,16,0.4)" }}>
                <td colSpan={3} style={{ padding:"10px 8px", fontWeight:800, color:T.amberLight }}>Total PAYE</td>
                <td style={{ padding:"10px 8px", textAlign:"right", fontWeight:800, color:"#34D399", fontSize:15 }}>
                  {fmt(payeDetail.total)} RWF
                </td>
              </tr>
            </tfoot>
          </table>
          {pr.grossSalary > 0 ? (
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:10 }}>
              PAYE base: <strong style={{ color:T.amberLight }}>{fmt(pr.grossSalary)} RWF</strong> gross
              (basic {fmt(pr.basicSalary)} + allowances). Marginal brackets apply to gross, not a flat 30%.
            </p>
          ) : null}
        </div>
      </div>

      {/* Live payroll register (school Excel layout) */}
      <div style={{ marginTop:20, background:T.white, borderRadius:12, border:`1px solid ${T.border}`,
        padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:14 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:T.navy }}>Live Payroll Register</div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              Same columns as your school payroll sheet — CSR 6%×2 on gross · M.LEAVE 0.3%×2 on base · CSR 2% hazard on base · TOTAL CSR 14% = 6%+6%+2%
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn variant="outline" size="sm" disabled={!liveRegisterRows.length}
              onClick={() => downloadPayrollRegisterCsv({ schoolName, periodLabel, rows: liveRegisterRows,
                filename: `payroll-register-live-${Date.now()}.csv` })}>
              Export CSV
            </Btn>
            <Btn variant="primary" size="sm" disabled={!liveRegisterRows.length}
              onClick={() => downloadPayrollRegisterExcel({ schoolName, periodLabel, rows: liveRegisterRows,
                filename: `payroll-register-live-${Date.now()}.xlsx` })}>
              Export Excel
            </Btn>
          </div>
        </div>
        {liveStaffLoading ? (
          <p style={{ fontSize:13, color:T.muted, padding:"24px 0", textAlign:"center" }}>Loading staff for live register…</p>
        ) : liveRegisterRows.length === 0 ? (
          <p style={{ fontSize:13, color:T.muted, padding:"24px 0", textAlign:"center" }}>
            Enter a basic salary above or set staff basic salaries to preview the register.
          </p>
        ) : (
          <PayrollRegisterTable rows={liveRegisterRows} totalRow={registerTotals} maxHeight={420} />
        )}
        {pb > 0 && liveStaff.length > 0 ? (
          <p style={{ fontSize:11, color:T.muted, marginTop:10 }}>
            Preview basic {fmt(pb)} RWF: CSR employee {fmt(calcForBasic(pb).rssbEmployee)} · PAYE {fmt(calcForBasic(pb).paye)} · Net {fmt(calcForBasic(pb).finalNet)} RWF
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TAB 4 — EMPLOYEE DEDUCTIONS
───────────────────────────────────────────────────────────── */
function EmployeeDeductionsTab({ empDeductions, onPersist, previewNetSalary }) {
  const [search, setSearch] = useState("");
  const [staffResults, setStaffResults] = useState([]);
  const [staffSearching, setStaffSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(null);
  const [editId, setEditId] = useState(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const blank = { staffUserId:"", emp:"", dept:"", position:"", empCode:"", category:"Loan", customName:"", total:"", monthly:"", repayMonths:"", startMonth:"", notes:"", status:"Active" };
  const [form, setForm] = useState(blank);
  const f = k => v => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setStaffResults([]);
      return undefined;
    }
    const t = window.setTimeout(async () => {
      setStaffSearching(true);
      try {
        const rows = await searchPayrollStaff(q, 12);
        setStaffResults(rows);
      } catch {
        setStaffResults([]);
      } finally {
        setStaffSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const months = ["Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026","Oct 2026","Nov 2026","Dec 2026","Jan 2027","Feb 2027","Mar 2027","Apr 2027","May 2027","Jun 2027","Jul 2027","Aug 2027","Sep 2027","Oct 2027","Nov 2027","Dec 2027","Jan 2028","Feb 2028","Mar 2028","Apr 2028"];

  function calcEndMonth(start, repay) {
    const idx = months.indexOf(start);
    if (idx<0||!repay) return "";
    const end = idx + parseInt(repay) - 1;
    return months[end] || "Beyond 2028";
  }

  function open(d) {
    setForm(d ? { ...d, staffUserId: d.staffUserId ? String(d.staffUserId) : "", total:String(d.total), monthly:String(d.monthly), repayMonths: d.monthly ? String(Math.round(d.total/d.monthly)) : "" } : blank);
    setEditId(d?d.id:null);
    setShowModal(true);
  }
  async function save() {
    const total = parseFloat(form.total) || 0;
    const monthly = parseFloat(form.monthly) || 0;
    const repayMonths = parseInt(form.repayMonths, 10) || null;
    const endMonth = calcEndMonth(form.startMonth, form.repayMonths);
    const staffUserId = Number(form.staffUserId) || 0;
    if (!staffUserId && !editId) {
      window.alert("Staff User ID is required to save to the server (from HR / staff record).");
      return;
    }
    const payload = {
      staffUserId: staffUserId || empDeductions.find((x) => x.id === editId)?.staffUserId,
      staffName: form.emp,
      deductionType: form.category,
      customName: form.category === "Other" ? form.customName : "",
      totalAmount: total,
      monthlyInstallment: monthly,
      repaymentMonths: repayMonths,
      startMonth: form.startMonth,
      startYear: new Date().getFullYear(),
      remainingBalance: editId
        ? empDeductions.find((x) => x.id === editId)?.remaining ?? total
        : total,
      notes: form.notes,
      status: form.status,
    };
    setSavingEmp(true);
    try {
      if (editId) {
        await updateEmployeePayrollDeduction(editId, payload);
      } else {
        await createEmployeePayrollDeduction(payload);
      }
      if (onPersist) await onPersist();
      setShowModal(false);
    } catch {
      window.alert("Failed to save employee deduction.");
    } finally {
      setSavingEmp(false);
    }
  }

  async function toggleStatus(d) {
    const nextStatus = d.status === "Active" ? "Suspended" : "Active";
    try {
      await updateEmployeePayrollDeduction(d.id, { status: nextStatus });
      if (onPersist) await onPersist();
    } catch {
      window.alert("Failed to update deduction status.");
    }
  }

  async function removeDeduction(id) {
    if (!window.confirm("Remove this employee deduction?")) return;
    try {
      await deleteEmployeePayrollDeduction(id);
      if (onPersist) await onPersist();
    } catch {
      window.alert("Failed to delete employee deduction.");
    }
  }

  function pickStaff(s) {
    setForm((p) => ({
      ...p,
      staffUserId: String(s.staffUserId),
      emp: s.fullName || "",
      empCode: s.staffCode || "",
      dept: s.department || s.role || "",
      position: s.position || "",
    }));
    setSearch(s.fullName || "");
    setStaffResults([]);
  }

  function buildSchedule(d) {
    const sched = [];
    const idx = months.indexOf(d.startMonth);
    let rem = d.total;
    for (let i=0; i<Math.ceil(d.total/d.monthly); i++) {
      const mo = idx>=0 ? (months[idx+i]||`Month ${i+1}`) : `Month ${i+1}`;
      const pay = Math.min(rem, d.monthly);
      rem -= pay;
      sched.push({ month:mo, payment:pay, balance:rem });
      if (rem<=0) break;
    }
    return sched;
  }

  const filtered = empDeductions.filter(d => {
    const q = search.toLowerCase();
    return !q || d.emp.toLowerCase().includes(q) || d.empCode.toLowerCase().includes(q) || d.dept.toLowerCase().includes(q);
  });

  const statusColor = { Active:"green", Completed:"blue", Suspended:"amber" };

  return (
    <div>
      <SectionHeader
        title="Employee-Specific Deductions"
        sub="Loans, salary advances and custom deductions per employee — auto-applied during payroll"
        action={<Btn onClick={() => open(null)}><IPlus /> Add Employee Deduction</Btn>}
      />

      {/* Search */}
      <div style={{ marginBottom:16, maxWidth:420 }}>
        <div style={{ position:"relative" }}>
          <div style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:T.faint }}><ISearch /></div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft:36 }}
            placeholder="Search staff by name or code (min 2 chars)…"
          />
        </div>
        {staffSearching ? (
          <p style={{ fontSize:11, color:T.muted, marginTop:6 }}>Searching staff…</p>
        ) : null}
        {staffResults.length > 0 ? (
          <div style={{ marginTop:6, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", background:T.white }}>
            {staffResults.map((s) => (
              <button
                key={s.staffUserId}
                type="button"
                onClick={() => pickStaff(s)}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"10px 12px", border:"none", borderBottom:`1px solid ${T.border}`, background:T.white, cursor:"pointer", fontSize:12 }}
              >
                <strong style={{ color:T.navy }}>{s.fullName}</strong>
                <span style={{ color:T.muted, marginLeft:8 }}>{s.staffCode}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ background:T.white, borderRadius:12, border:`1px solid ${T.border}`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,4,53,0.06)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:T.navy }}>
              {["Employee","Type","Total","Monthly Deduction","Remaining Balance","Period","Status","Actions"]
                .map(h => <th key={h} style={{ padding:"11px 14px", color:T.white, fontWeight:600, textAlign:"left", fontSize:11 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d,i) => {
              const pct = d.total>0 ? Math.round((1 - d.remaining/d.total)*100) : 100;
              return (
                <tr key={d.id} style={{ background:i%2===0?T.white:T.off, borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontWeight:700, color:T.navy }}>{d.emp}</div>
                    <div style={{ fontSize:11, color:T.faint }}>{d.empCode} · {d.dept}</div>
                  </td>
                  <td style={{ padding:"11px 14px", fontWeight:600, color:T.text }}>{d.category}</td>
                  <td style={{ padding:"11px 14px", fontWeight:700 }}>{fmt(d.total)}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontWeight:700, color:T.info }}>{fmt(d.monthly)} RWF</div>
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ fontWeight:700, color:d.remaining<=0?T.success:T.danger }}>{fmt(d.remaining)} RWF</div>
                    <div style={{ marginTop:5, height:4, background:T.border, borderRadius:99, overflow:"hidden", width:80 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:T.amber, borderRadius:99, transition:"width .3s" }} />
                    </div>
                    <div style={{ fontSize:10, color:T.faint, marginTop:2 }}>{pct}% repaid</div>
                  </td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:T.muted }}>
                    {d.startMonth} → {d.endMonth}
                  </td>
                  <td style={{ padding:"11px 14px" }}>{badge(d.status, statusColor[d.status]||"gray")}</td>
                  <td style={{ padding:"11px 14px" }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <Btn variant="ghost" size="sm" onClick={() => setShowSchedule(d)}><IEye /></Btn>
                      <Btn variant="ghost" size="sm" onClick={() => open(d)}><IEdit /></Btn>
                      <Btn variant="danger" size="sm" onClick={() => removeDeduction(d.id)}><ITrash /></Btn>
                      <Btn variant={d.status==="Active"?"ghost":"success"} size="sm" onClick={() => toggleStatus(d)}>
                        {d.status==="Active"?"Suspend":"Resume"}
                      </Btn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length===0 && (
              <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:T.faint }}>
                {search ? "No matching employees found." : "No employee deductions configured."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editId?"Edit Employee Deduction":"Add Employee Deduction"} wide onClose={() => setShowModal(false)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label="Employee Name" span={2}>
              <input style={inp} value={form.emp} onChange={e=>f("emp")(e.target.value)} placeholder="Search above or type name" readOnly={!!form.staffUserId} />
            </Field>
            {form.staffUserId ? (
              <Field label="Staff ID" span={2}>
                <input style={{ ...inp, background:T.off, color:T.muted }} value={form.staffUserId} readOnly />
              </Field>
            ) : null}
            <Field label="Employee Code">
              <input style={inp} value={form.empCode} onChange={e=>f("empCode")(e.target.value)} placeholder="TCH-001" />
            </Field>
            <Field label="Department">
              <input style={inp} value={form.dept} onChange={e=>f("dept")(e.target.value)} placeholder="Academics" />
            </Field>
            <Field label="Deduction Type" span={2}>
              <Select value={form.category} onChange={f("category")} options={DEDUCTION_CATEGORIES} />
            </Field>
            {form.category==="Other" && (
              <Field label="Specify Name" span={2}>
                <input style={inp} value={form.customName} onChange={e=>f("customName")(e.target.value)} placeholder="Deduction name" />
              </Field>
            )}
            <Field label="Total Amount (RWF)">
              <input style={inp} value={form.total} onChange={e=>f("total")(e.target.value)} placeholder="500000" />
            </Field>
            <Field label="Monthly Installment (RWF)">
              <input style={inp} value={form.monthly} onChange={e=>f("monthly")(e.target.value)} placeholder="25000" />
            </Field>
            <Field label="Repayment Months">
              <input style={inp} value={form.repayMonths} onChange={e=>f("repayMonths")(e.target.value)}
                placeholder={form.total&&form.monthly ? String(Math.ceil(parseFloat(form.total)/parseFloat(form.monthly))) : "20"} />
            </Field>
            <Field label="Start Month">
              <Select value={form.startMonth||months[8]} onChange={f("startMonth")} options={months} />
            </Field>
            <Field label="Estimated End Month">
              <input style={{ ...inp, background:T.off, color:T.muted }} readOnly
                value={calcEndMonth(form.startMonth||months[8], form.repayMonths)} />
            </Field>
            <Field label="Status">
              <ToggleSwitch value={form.status} options={["Active","Suspended","Completed"]} onChange={f("status")} />
            </Field>
            <Field label="Notes" span={2}>
              <textarea style={{ ...inp, minHeight:60, resize:"vertical" }} value={form.notes} onChange={e=>f("notes")(e.target.value)} placeholder="Optional notes…" />
            </Field>
          </div>

          {/* Payroll impact */}
          {form.monthly && previewNetSalary > 0 ? (
            <div style={{ marginTop:16, background:T.amberPale, borderRadius:10, padding:"12px 16px", display:"flex", gap:24, flexWrap:"wrap" }}>
              <div style={{ fontSize:12 }}>
                <span style={{ color:T.muted }}>Preview net (template):</span>{" "}
                <strong style={{ color:T.navy }}>{fmt(previewNetSalary)} RWF</strong>
              </div>
              <div style={{ fontSize:12 }}>→</div>
              <div style={{ fontSize:12 }}>
                <span style={{ color:T.muted }}>After this deduction:</span>{" "}
                <strong style={{ color:T.danger }}>{fmt(Math.max(0, previewNetSalary - parseFloat(form.monthly || 0)))} RWF</strong>
              </div>
            </div>
          ) : null}

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={save} disabled={savingEmp}><ICheck /> {savingEmp ? "Saving…" : editId ? "Update" : "Add"} Deduction</Btn>
          </div>
        </Modal>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <Modal title="Repayment Schedule" subtitle={`${showSchedule.emp} — ${showSchedule.category}`} onClose={() => setShowSchedule(null)}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[["Total Amount",showSchedule.total,T.navy],["Monthly",showSchedule.monthly,T.info],["Remaining",showSchedule.remaining,T.danger]]
              .map(([l,v,c])=>(
                <div key={l} style={{ background:T.off, borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                  <div style={{ fontSize:10, color:T.faint, fontWeight:600 }}>{l}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:c, marginTop:2 }}>{fmt(v)}</div>
                </div>
              ))}
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead style={{ position:"sticky", top:0 }}>
                <tr style={{ background:T.navy }}>
                  {["#","Month","Payment (RWF)","Balance (RWF)"].map(h=>
                    <th key={h} style={{ padding:"8px 12px", color:T.white, fontWeight:600, textAlign:"left", fontSize:11 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {buildSchedule(showSchedule).map((r,i)=>(
                  <tr key={i} style={{ background:i%2===0?T.white:T.off, borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ padding:"8px 12px", color:T.faint }}>{i+1}</td>
                    <td style={{ padding:"8px 12px", fontWeight:600 }}>{r.month}</td>
                    <td style={{ padding:"8px 12px", color:T.info, fontWeight:700 }}>{fmt(r.payment)}</td>
                    <td style={{ padding:"8px 12px", color:r.balance<=0?T.success:T.danger, fontWeight:600 }}>{fmt(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <InfoBox color="green" style={{ marginTop:12 }}>System auto-marks this deduction as Completed when balance reaches 0 RWF.</InfoBox>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ROOT — SalaryTemplate
───────────────────────────────────────────────────────────── */
const TABS = [
  { key:"allowances",  label:"Allowances",          icon:<ICalc /> },
  { key:"deductions",  label:"Deductions",           icon:<ICheck /> },
  { key:"statutory",   label:"Statutory Rates",      icon:<IInfo /> },
  { key:"employee",    label:"Employee Deductions",  icon:<IUser /> },
];

export default function SalaryTemplate() {
  const [tab, setTab] = useState("allowances");
  const [allowances, setAllowances] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [empDeductions, setEmpDeductions] = useState([]);
  const [payeRates, setPayeRates] = useState(DEFAULT_PAYE_BRACKETS.map((r, i) => ({ id: i + 1, ...r })));
  const [statutory, setStatutory] = useState({ ...DEFAULT_STATUTORY_RATES });
  const [allowanceAuto, setAllowanceAuto] = useState({ ...DEFAULT_SCHOOL_ALLOWANCE_RULES });
  const [hasTemplate, setHasTemplate] = useState(false);
  const [applyToAll, setApplyToAll] = useState(true);
  const [templateMeta, setTemplateMeta] = useState({
    id: null,
    name: "Rwanda School Payroll Template",
    description: "",
    status: "Draft",
    version: 1,
    isActive: false,
  });
  const [previewBasic, setPreviewBasic] = useState("300000");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveOk, setLiveOk] = useState(false);
  const [notice, setNotice] = useState("");

  const schoolName = useMemo(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("authUser") || "{}";
      const u = JSON.parse(raw);
      return u?.school?.name || u?.school_name || "School";
    } catch {
      return "School";
    }
  }, []);

  const loadTemplate = useCallback(async () => {
    setRefreshing(true);
    try {
      const [tpl, empRows] = await Promise.all([
        getActivePayrollTemplate(),
        getEmployeePayrollDeductions().catch(() => []),
      ]);
      if (tpl) {
        setHasTemplate(true);
        setTemplateMeta({
          id: tpl.id,
          name: tpl.name || "Payroll Salary Template",
          description: tpl.description || "",
          status: tpl.status || "Draft",
          version: tpl.version || 1,
          isActive: !!tpl.isActive,
        });
        setApplyToAll(!!tpl.applyToAll);
        setAllowances(Array.isArray(tpl.allowances) ? tpl.allowances.map(mapAllowanceFromApi) : []);
        setDeductions(Array.isArray(tpl.deductions) ? tpl.deductions.map(mapDeductionFromApi) : []);
        if (Array.isArray(tpl.payeRates) && tpl.payeRates.length) {
          setPayeRates(tpl.payeRates.map((r, i) => ({ id: r.id || i + 1, ...r })));
        }
        if (tpl.statutory && Object.keys(tpl.statutory).length) {
          setStatutory(normalizeStatutoryRates(tpl.statutory));
        }
        const loadedAuto = tpl.rules?.allowanceAuto;
        setAllowanceAuto(
          loadedAuto && typeof loadedAuto === "object"
            ? { ...DEFAULT_SCHOOL_ALLOWANCE_RULES, ...loadedAuto }
            : { ...DEFAULT_SCHOOL_ALLOWANCE_RULES }
        );
        setLiveOk(true);
      } else {
        setHasTemplate(false);
        setAllowances([]);
        setDeductions([]);
        setLiveOk(false);
      }
      setEmpDeductions(Array.isArray(empRows) ? empRows.map(mapEmpDedFromApi) : []);
    } catch {
      setHasTemplate(false);
      setLiveOk(false);
      setNotice("Could not load template from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const persistTemplate = useCallback(
    async (mode, overrides = {}) => {
      setSaving(true);
      const allowanceList = overrides.allowances ?? allowances;
      const deductionList = overrides.deductions ?? deductions;
      const action = mode === true ? "activate" : mode === false ? "save_draft" : String(mode || "save_draft");
      try {
        const res = await savePayrollTemplate({
          action,
          templateId: templateMeta.id || undefined,
          status: action === "activate" ? "Active" : action === "deactivate" ? "Inactive" : templateMeta.status,
          name: templateMeta.name,
          description: templateMeta.description,
          applyToAll,
          allowances: allowanceList.map(mapAllowanceToApi),
          deductions: deductionList.map(mapDeductionToApi),
          payeRates,
          statutory,
          rules: { allowanceAuto: overrides.allowanceAuto ?? allowanceAuto },
        });
        if (res?.id) {
          setTemplateMeta((m) => ({
            ...m,
            id: res.id,
            status: res.status || m.status,
            isActive: res.isActive ?? m.isActive,
          }));
        }
        await loadTemplate();
        const notices = {
          activate: "Template activated for payroll runs.",
          deactivate: "Template deactivated. Edit allowances or deductions, then activate again.",
          update: "Changes saved.",
          save_draft: "Template saved as draft.",
        };
        setNotice(notices[action] || "Template saved to server.");
        window.setTimeout(() => setNotice(""), 4000);
      } catch {
        setNotice("Failed to save template.");
      } finally {
        setSaving(false);
      }
    },
    [allowances, deductions, applyToAll, loadTemplate, payeRates, statutory, allowanceAuto, templateMeta]
  );

  const saveDraft = useCallback(
    (overrides) => (templateMeta.id ? persistTemplate("update", overrides) : persistTemplate("save_draft", overrides)),
    [persistTemplate, templateMeta.id]
  );

  const deactivateTemplate = useCallback(() => {
    if (!templateMeta.id) {
      setNotice("Save the template first before deactivating.");
      return;
    }
    if (!window.confirm(
      "Deactivate this salary template?\n\nPayroll runs will not mark it as active until you click Activate again. You can still edit allowances and deductions."
    )) return;
    persistTemplate("deactivate");
  }, [persistTemplate, templateMeta.id]);

  const templateSchoolAuto = shouldUseSchoolAutoAllowances([], allowanceAuto, {});
  const previewNetSalary = calcRwandaPayroll({
    basicSalary: parseFloat(String(previewBasic).replace(/,/g, "")) || 0,
    allowances: templateSchoolAuto ? [] : allowancesForEngine(allowances),
    templateDeductions: deductionsForEngine(deductions),
    employeeDeductions: empDeductions
      .filter((d) => d.status === "Active")
      .map((d) => ({ monthlyInstallment: d.monthly })),
    statutory,
    payeRates,
    allowanceRules: allowanceAuto,
  }).finalNet;

  const activeAllowances = allowances.filter((a) => a.status === "Active").length;
  const activeDeductions = deductions.filter((d) => d.status === "Active").length;
  const activeEmpDed = empDeductions.filter((d) => d.status === "Active").length;
  const totalEmpDedMonthly = empDeductions
    .filter((d) => d.status === "Active")
    .reduce((s, d) => s + Number(d.monthly || 0), 0);

  const templateIsActive = templateMeta.isActive && String(templateMeta.status || "").toLowerCase() === "active";

  const stats = [
    { label: "Active Allowances", value: String(activeAllowances) },
    { label: "Template Deductions", value: String(activeDeductions) },
    { label: "Employee Deductions", value: String(activeEmpDed) },
    {
      label: "Template Status",
      value: templateIsActive ? "Active" : (templateMeta.status === "Inactive" ? "Inactive" : "Draft"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-[#c87800]" />
          <p className="text-sm text-slate-500">Loading salary template…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow="Finance · Payroll"
        titleLine="Salary"
        titleAccent="Template"
        subtitle="Configure allowances, statutory rates and deductions once — applied automatically on every payroll run."
        icon={Calculator}
        rightSlot={
          <>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/25 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
              {refreshing ? "Updating…" : liveOk ? "Live from server" : "Offline / defaults"}
            </div>
            <button
              type="button"
              onClick={loadTemplate}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white hover:bg-white/20 transition-all disabled:opacity-60"
              title="Refresh"
              aria-label="Refresh template"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => persistTemplate("save_draft")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Draft
            </button>
            {templateIsActive ? (
              <button
                type="button"
                disabled={saving || !templateMeta.id}
                onClick={deactivateTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300/50 bg-red-500/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-500/30 disabled:opacity-60"
              >
                <Power size={14} />
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => persistTemplate("activate")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FEBF10] px-4 py-2.5 text-xs font-bold text-[#000435] hover:bg-[#fcd34d] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                Activate
              </button>
            )}
          </>
        }
      />

      <div className="acct-shell-standard -mt-10 relative z-10 pb-24 space-y-5">
        {notice ? (
          <div className={`rounded-xl px-4 py-2.5 text-xs font-medium border ${
            notice.includes("Failed") || notice.includes("Could not")
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            {notice}
          </div>
        ) : null}

        {templateMeta.status === "Inactive" && hasTemplate ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <strong>Template is deactivated.</strong> Edit allowances, deductions, or employee deductions below, then click{" "}
            <strong>Activate</strong> to use on payroll runs again.
          </div>
        ) : null}

        {!hasTemplate && !loading ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>No payroll template saved yet.</strong> Add allowances and deductions below, then click{" "}
            <strong>Save Draft</strong> or <strong>Activate</strong> to store on the server for payroll runs.
          </div>
        ) : null}

        <DashboardStats stats={stats} />

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 pt-3 border-b border-slate-100 flex flex-wrap gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? "bg-[#c87800] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-6" style={{ color: T.text }}>
            {tab === "allowances" && (
              <AllowancesTab
                allowances={allowances}
                setAllowances={setAllowances}
                allowanceAuto={allowanceAuto}
                setAllowanceAuto={setAllowanceAuto}
                onSaveDraft={saveDraft}
                saving={saving}
              />
            )}
            {tab === "deductions" && (
              <DeductionsTab
                deductions={deductions}
                setDeductions={setDeductions}
                onSaveDraft={saveDraft}
                saving={saving}
              />
            )}
            {tab === "statutory" && (
              <StatutoryTab
                allowances={allowances}
                deductions={deductions}
                empDeductions={empDeductions}
                statutory={statutory}
                payeRates={payeRates}
                previewBasic={previewBasic}
                setPreviewBasic={setPreviewBasic}
                allowanceAuto={allowanceAuto}
                schoolName={schoolName}
              />
            )}
            {tab === "employee" && (
              <EmployeeDeductionsTab
                empDeductions={empDeductions}
                onPersist={loadTemplate}
                previewNetSalary={previewNetSalary}
              />
            )}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 pb-4">
          <strong className="text-[#000435]">{templateMeta.name}</strong>
          {" · "}v{templateMeta.version}
          {" · "}
          {applyToAll ? "Applies to all active employees on payroll run" : "Manual apply"}
          {totalEmpDedMonthly > 0 ? ` · ${fmt(totalEmpDedMonthly)} RWF/mo employee deductions` : ""}
        </div>
      </div>
    </div>
  );
}