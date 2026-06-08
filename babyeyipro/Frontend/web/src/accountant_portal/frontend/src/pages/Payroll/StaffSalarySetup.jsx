import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Save, Send, Plus, Trash2, X, Wallet, Pencil,
  TrendingUp, TrendingDown, CalendarClock,
  CheckCircle, AlertCircle, History, Loader2, User, Calculator,
} from "lucide-react";
import {
  calcNetToGrossFromDesiredNet,
  DEFAULT_PAYE_BRACKETS,
  normalizeStatutoryRates,
} from "../../utils/rwandaPayrollEngine";
import {
  searchPayrollStaff,
  saveStaffPayrollProfile,
  getActivePayrollTemplate,
  getEmployeePayrollDeductions,
  createEmployeePayrollDeduction,
  deleteEmployeePayrollDeduction,
  getStaffAdvanceCheck,
} from "../../services/payrollTemplateService";
import { mergeRegisterAllowanceAmounts } from "../../utils/payrollStaffAllowances";
import PortalToast from "../../components/PortalToast";

const EMPTY_SALARY = {
  basic: 0, others: 0, transport: 0, housing: 0, communication: 0, responsibility: 0, meal: 0,
  customAllowances: [],
  customDeductions: [],
  advances: [],
  desiredNet: 0,
  lastIncrement: "—", prevBasic: 0,
};

const PAYROLL_MODES = {
  normal: { id: "normal", label: "Normal Payroll" },
  netToGross: { id: "netToGross", label: "NetToGross Salary Payroll" },
};

const STATUS_COLORS = {
  Permanent: "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  Contract:  "bg-white/10 text-white/60 border border-white/10",
};
const DEPT_COLORS = {
  Secondary: "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  Primary:   "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  Admin:     "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  Support:   "bg-white/10 text-white/50 border border-white/10",
  Staff:     "bg-amber-400/10 text-amber-400 border border-amber-400/20",
};

const REPAYMENT_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const KNOWN_OTHER_ALLOWANCES = {
  "communication allowance": "communication",
  "responsibility allowance": "responsibility",
};

function parseOtherAllowances(raw) {
  if (!raw) return [];
  let list = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((item, i) => ({
      id: item.id || `oa-${i}`,
      name: item.name || item.category || "Allowance",
      amount: Number(item.amount ?? item.value ?? 0),
    }))
    .filter((a) => a.amount > 0);
}

function parseStaffPayrollAllowances(p = {}) {
  const transport = Number(p.transportAllowance || 0);
  const housing = Number(p.housingAllowance || 0);
  const meal = Number(p.mealAllowance || 0);
  let others = 0;
  let communication = 0;
  let responsibility = 0;
  const customAllowances = [];

  for (const item of parseOtherAllowances(p.otherAllowances)) {
    const nameLower = item.name?.toLowerCase?.()?.trim();
    if (nameLower === "others") {
      others += item.amount;
    } else if (KNOWN_OTHER_ALLOWANCES[nameLower] === "communication") {
      communication = item.amount;
    } else if (KNOWN_OTHER_ALLOWANCES[nameLower] === "responsibility") {
      responsibility = item.amount;
    } else {
      customAllowances.push(item);
    }
  }

  return { others, transport, housing, meal, communication, responsibility, customAllowances };
}

/** School payroll register columns — Others, H/A, T/A */
const REGISTER_ALLOWANCES = [
  { field: "others", name: "Others" },
  { field: "housing", name: "H/A" },
  { field: "transport", name: "T/A" },
];

const SUPPLEMENTAL_ALLOWANCES = [
  { field: "meal", name: "Meal Allowance" },
  { field: "communication", name: "Communication Allowance" },
  { field: "responsibility", name: "Responsibility Allowance" },
];

const ALLOWANCE_NAME_TO_FIELD = {
  others: "others",
  "h/a": "housing",
  "housing allowance": "housing",
  "t/a": "transport",
  "transport allowance": "transport",
  meal: "meal",
  "meal allowance": "meal",
  "communication allowance": "communication",
  "responsibility allowance": "responsibility",
};

function matchAllowanceField(name) {
  const key = String(name || "").toLowerCase().trim();
  if (ALLOWANCE_NAME_TO_FIELD[key]) return ALLOWANCE_NAME_TO_FIELD[key];
  const supplemental = SUPPLEMENTAL_ALLOWANCES.find((f) => f.name.toLowerCase() === key);
  return supplemental?.field || null;
}

function getRegisterAllowanceAmounts(sal, allowanceRules = {}) {
  const merged = mergeRegisterAllowanceAmounts(sal.basic, {
    others: sal.others,
    housing: sal.housing,
    transport: sal.transport,
  }, allowanceRules);
  return {
    others: merged.others,
    housing: merged.housing,
    transport: merged.transport,
    source: merged.source,
  };
}

function buildStaffAllowancePayload(sal, allowanceRules = {}) {
  const register = getRegisterAllowanceAmounts(sal, allowanceRules);
  const otherItems = [];
  if (register.others > 0) otherItems.push({ name: "Others", amount: register.others });
  if (sal.communication > 0) {
    otherItems.push({ name: "Communication Allowance", amount: sal.communication });
  }
  if (sal.responsibility > 0) {
    otherItems.push({ name: "Responsibility Allowance", amount: sal.responsibility });
  }
  for (const a of sal.customAllowances || []) {
    if (a.amount > 0) otherItems.push({ name: a.name, amount: a.amount });
  }
  return {
    payroll_basic_salary: sal.basic,
    payroll_transport_allowance: register.transport,
    payroll_housing_allowance: register.housing,
    payroll_meal_allowance: sal.meal,
    payroll_other_allowances: otherItems,
  };
}

function buildAllowanceRows(sal, allowanceRules = {}) {
  const rows = [];
  const register = getRegisterAllowanceAmounts(sal, allowanceRules);

  for (const r of REGISTER_ALLOWANCES) {
    const amount = Number(register[r.field] || 0);
    if (amount > 0) {
      rows.push({
        id: r.field,
        name: r.name,
        amount,
        field: r.field,
        kind: register.source === "auto" ? "auto" : "register",
      });
    }
  }

  for (const f of SUPPLEMENTAL_ALLOWANCES) {
    const amount = Number(sal[f.field] || 0);
    if (amount > 0) {
      rows.push({ id: f.field, name: f.name, amount, field: f.field, kind: "fixed" });
    }
  }

  for (const a of sal.customAllowances || []) {
    const amount = Number(a.amount || 0);
    if (amount > 0) {
      rows.push({ id: a.id, name: a.name, amount, field: null, kind: "custom" });
    }
  }
  return rows;
}

function removeAllowanceFromSal(sal, row) {
  const next = { ...sal, customAllowances: [...(sal.customAllowances || [])] };
  if (row.field && row.kind !== "custom") {
    next[row.field] = 0;
  } else {
    next.customAllowances = next.customAllowances.filter((a) => a.id !== row.id);
  }
  return next;
}

function upsertAllowanceInSal(sal, { name, amount }, replaceRow = null) {
  let next = { ...sal, customAllowances: [...(sal.customAllowances || [])] };
  if (replaceRow) next = removeAllowanceFromSal(next, replaceRow);

  const matchedField = matchAllowanceField(name);
  if (matchedField) {
    next[matchedField] = amount;
  } else {
    const id = replaceRow?.kind === "custom" ? replaceRow.id : `ca-${Date.now()}`;
    next.customAllowances.push({ id, name, amount });
  }
  return next;
}

function allowanceKindLabel(kind) {
  if (kind === "auto") return "Auto from basic";
  if (kind === "register") return "Payroll register";
  if (kind === "fixed") return "Standard";
  return "Custom";
}

function seedRegisterFromAuto(sal, allowanceRules = {}) {
  const reg = getRegisterAllowanceAmounts(sal, allowanceRules);
  if (reg.source !== "auto") return sal;
  return {
    ...sal,
    others: reg.others,
    housing: reg.housing,
    transport: reg.transport,
  };
}

function sumCustomAllowances(list = []) {
  return list.reduce((s, a) => s + Number(a.amount || 0), 0);
}

function sumCustomDeductions(list = []) {
  return list.reduce((s, d) => s + Number(d.amount || 0), 0);
}

function calcActiveAdvanceMonthly(advances = []) {
  return advances.reduce((sum, adv) => {
    if (adv.status === "Completed" || adv.status === "Inactive") return sum;
    const months = Math.max(1, Number(adv.repaymentMonths || 1));
    const paid = Number(adv.monthsPaid || 0);
    if (paid >= months) return sum;
    const monthly = Number(adv.monthlyInstallment || Math.round(Number(adv.totalAmount || 0) / months));
    return sum + monthly;
  }, 0);
}

function buildEmployeeDeductionsForCalc(sal) {
  const items = [];
  for (const d of (sal.customDeductions || []).filter((x) => x.status !== "Inactive")) {
    items.push({ monthlyInstallment: Number(d.amount || 0) });
  }
  const advanceMonthly = calcActiveAdvanceMonthly(sal.advances);
  if (advanceMonthly > 0) items.push({ monthlyInstallment: advanceMonthly });
  return items;
}

function salaryFromNetToGrossResult(prevSal, result) {
  const split = result.registerAllowanceSplit || {};
  return {
    ...prevSal,
    basic: result.basicSalary,
    others: split.others || 0,
    housing: split.housing || 0,
    transport: split.transport || 0,
    communication: 0,
    responsibility: 0,
    meal: 0,
    customAllowances: [],
    desiredNet: result.desiredNet,
  };
}

function calcPAYE(taxable) {
  if (taxable <= 60000)  return 0;
  if (taxable <= 100000) return (taxable - 60000) * 0.10;
  if (taxable <= 200000) return 4000 + (taxable - 100000) * 0.20;
  return 24000 + (taxable - 200000) * 0.30;
}

function fmtRwf(n) {
  return `RWF ${Math.round(Number(n) || 0).toLocaleString()}`;
}

function InputField({ label, value, onChange, prefix, disabled, placeholder }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
            {prefix}
          </span>
        )}
        <input
          type={typeof value === "number" ? "number" : "text"}
          value={value}
          onChange={e => onChange && onChange(
            typeof value === "number" ? Number(e.target.value) : e.target.value
          )}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full border rounded-xl py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400
            ${prefix ? "pl-14 pr-3" : "px-3"}
            ${disabled
              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
              : "bg-white border-slate-200 text-[#000435] hover:border-amber-300 transition-colors"
            }`}
        />
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label, color = "text-[#000435]" }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-6 h-6 rounded-lg bg-current/10 flex items-center justify-center ${color}`}>
        <Icon size={13} />
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</p>
    </div>
  );
}

const MODAL_BTN =
  "w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm transition-colors disabled:opacity-50";

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000435]/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#000435]/10">
        <div className="bg-[#000435] border-b-4 border-amber-400 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-black text-base tracking-tight">{title}</h3>
            {subtitle && <p className="text-amber-400/80 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ItemChip({ name, amount, onRemove, variant = "amber" }) {
  const colors = variant === "navy"
    ? "bg-[#000435]/5 border-[#000435]/15 text-[#000435]"
    : "bg-amber-50 border-amber-100 text-[#000435]";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{name}</p>
        <p className="text-xs opacity-70 mt-0.5">{fmtRwf(amount)}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-white/60 text-current transition-colors flex-shrink-0"
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export default function StaffSalarySetup() {
  const [search, setSearch]           = useState("");
  const [staffList, setStaffList]       = useState([]);
  const [selected, setSelected]         = useState(null);
  const [salaries, setSalaries]         = useState({});
  const [tab, setTab]                   = useState("earnings");
  const [payrollMode, setPayrollMode]   = useState("normal");
  const [saved, setSaved]               = useState(false);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [loadError, setLoadError]       = useState("");
  const [dedLoading, setDedLoading]     = useState(false);
  const [allowanceRules, setAllowanceRules] = useState({});
  const [templateStatutory, setTemplateStatutory] = useState({});
  const [templatePayeRates, setTemplatePayeRates] = useState(DEFAULT_PAYE_BRACKETS);

  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal]     = useState(false);
  const [allowanceForm, setAllowanceForm] = useState({ name: "", amount: "" });
  const [editingAllowanceId, setEditingAllowanceId] = useState(null);
  const [deductionForm, setDeductionForm] = useState({ name: "", amount: "" });
  const [advanceForm, setAdvanceForm]     = useState({ amount: "", repaymentMonths: 3 });
  const [modalSaving, setModalSaving]     = useState(false);
  const [allowanceRemovingId, setAllowanceRemovingId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadStaffDeductions = useCallback(async (staffId, staffName) => {
    if (!staffId) return;
    setDedLoading(true);
    try {
      const [dedRows, advanceCheck] = await Promise.all([
        getEmployeePayrollDeductions({ staffUserId: staffId }),
        getStaffAdvanceCheck(staffId).catch(() => null),
      ]);

      const customDeductions = [];
      const advances = [];

      for (const d of dedRows) {
        const type = String(d.deductionType || "");
        if (type === "Salary Advance") {
          const months = Math.max(1, Number(d.repaymentMonths || 1));
          const monthly = Number(d.monthlyInstallment || 0);
          const total = Number(d.totalAmount || 0);
          const remaining = Number(d.remainingBalance ?? total);
          const monthsPaid = monthly > 0
            ? Math.max(0, months - Math.ceil(remaining / monthly))
            : 0;
          advances.push({
            id: d.id,
            apiId: d.id,
            totalAmount: total,
            repaymentMonths: months,
            monthlyInstallment: monthly || Math.round(total / months),
            monthsPaid,
            remainingBalance: remaining,
            status: monthsPaid >= months ? "Completed" : (d.status || "Active"),
            source: "payroll",
          });
        } else {
          customDeductions.push({
            id: d.id,
            apiId: d.id,
            name: type === "Other" ? (d.customName || "Deduction") : type,
            amount: Number(d.monthlyInstallment || d.totalAmount || 0),
            status: d.status || "Active",
          });
        }
      }

      if (advanceCheck?.approvedAdvances?.length) {
        for (const a of advanceCheck.approvedAdvances) {
          const exists = advances.some((x) => x.shuleId === a.id);
          if (!exists) {
            advances.push({
              id: `shule-${a.id}`,
              shuleId: a.id,
              totalAmount: a.totalAmount,
              repaymentMonths: a.months,
              monthlyInstallment: a.monthlyPayment,
              monthsPaid: a.paidInstallments || 0,
              remainingBalance: a.remainingBalance,
              status: (a.remainingMonths || 0) <= 0 ? "Completed" : "Active",
              source: "shule_avance",
            });
          }
        }
      }

      setSalaries((prev) => ({
        ...prev,
        [staffId]: {
          ...(prev[staffId] || EMPTY_SALARY),
          customDeductions,
          advances,
        },
      }));
    } catch {
      /* keep existing local state */
    } finally {
      setDedLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [rows, tpl] = await Promise.all([
        searchPayrollStaff("", 500),
        getActivePayrollTemplate().catch(() => null),
      ]);
      setAllowanceRules(tpl?.rules?.allowanceAuto || tpl?.allowanceAuto || {});
      if (Array.isArray(tpl?.payeRates) && tpl.payeRates.length) {
        setTemplatePayeRates(tpl.payeRates);
      } else {
        setTemplatePayeRates(DEFAULT_PAYE_BRACKETS);
      }
      setTemplateStatutory(tpl?.statutory ? normalizeStatutoryRates(tpl.statutory) : {});
      const mapped = rows.map((s) => ({
        id:         Number(s.staffUserId),
        name:       s.fullName || `Staff ${s.staffUserId}`,
        dept:       s.department || s.role || "Staff",
        position:   s.position || s.role || "Staff",
        contract:   "Permanent",
        employeeNo: s.staffCode || `STF-${s.staffUserId}`,
        rssb:       s.rssbNumber || "",
        account:    "",
        payroll:    s.payroll || {},
      }));
      setStaffList(mapped);

      const salMap = {};
      for (const s of rows) {
        const p = s.payroll || {};
        const allowances = parseStaffPayrollAllowances(p);
        salMap[Number(s.staffUserId)] = {
          ...EMPTY_SALARY,
          basic: Number(p.basicSalary || 0),
          ...allowances,
        };
      }
      setSalaries(salMap);
      setSelected((prev) => {
        if (prev && mapped.some((m) => m.id === prev.id)) return prev;
        return mapped[0] || null;
      });
    } catch {
      setLoadError("Failed to load staff. Try again.");
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  useEffect(() => {
    if (selected?.id) {
      loadStaffDeductions(selected.id, selected.name);
    }
  }, [selected?.id, loadStaffDeductions]);

  const sal = selected ? (salaries[selected.id] || EMPTY_SALARY) : EMPTY_SALARY;
  const set = (k, v) => {
    if (!selected) return;
    setSalaries((s) => ({ ...s, [selected.id]: { ...(s[selected.id] || EMPTY_SALARY), [k]: v } }));
  };

  const employeeDeductionsForCalc = useMemo(
    () => buildEmployeeDeductionsForCalc(sal),
    [sal.customDeductions, sal.advances]
  );

  const netToGrossResult = useMemo(() => {
    if (payrollMode !== "netToGross" || Number(sal.desiredNet) <= 0) return null;
    return calcNetToGrossFromDesiredNet({
      desiredNet: sal.desiredNet,
      employeeDeductions: employeeDeductionsForCalc,
      statutory: templateStatutory,
      payeRates: templatePayeRates,
    });
  }, [payrollMode, sal.desiredNet, employeeDeductionsForCalc, templateStatutory, templatePayeRates]);

  useEffect(() => {
    if (payrollMode !== "netToGross" || !selected?.id || !netToGrossResult) return;
    setSalaries((prev) => {
      const current = prev[selected.id] || EMPTY_SALARY;
      const next = salaryFromNetToGrossResult(current, netToGrossResult);
      if (
        current.basic === next.basic
        && current.others === next.others
        && current.housing === next.housing
        && current.transport === next.transport
      ) {
        return prev;
      }
      return { ...prev, [selected.id]: next };
    });
  }, [payrollMode, selected?.id, netToGrossResult]);

  const switchPayrollMode = (mode) => {
    setPayrollMode(mode);
    setTab(mode === "netToGross" ? "netToGross" : "earnings");
  };

  const handleDesiredNetChange = (value) => {
    if (!selected) return;
    const desiredNet = Math.max(0, Number(value) || 0);
    setSalaries((prev) => ({
      ...prev,
      [selected.id]: { ...(prev[selected.id] || EMPTY_SALARY), desiredNet },
    }));
  };

  const registerAmounts = useMemo(() => getRegisterAllowanceAmounts(sal, allowanceRules), [sal, allowanceRules]);
  const allowanceRows = useMemo(() => buildAllowanceRows(sal, allowanceRules), [sal, allowanceRules]);
  const customAllowanceTotal = sumCustomAllowances(sal.customAllowances);
  const customDeductionTotal = sumCustomDeductions(
    (sal.customDeductions || []).filter((d) => d.status !== "Inactive")
  );
  const advanceMonthly       = calcActiveAdvanceMonthly(sal.advances);

  const gross = sal.basic + registerAmounts.others + registerAmounts.housing + registerAmounts.transport
    + sal.communication + sal.responsibility + sal.meal + customAllowanceTotal;
  const taxable        = gross;
  const paye           = calcPAYE(taxable);
  const rssb           = sal.basic * 0.06;
  const rama           = sal.basic * 0.075;
  const cbhi           = sal.basic * 0.005;
  const totalDeductions = paye + rssb + rama + cbhi + customDeductionTotal + advanceMonthly;
  const net            = gross - totalDeductions;
  const employerCost   = gross + (sal.basic * 0.06) + (sal.basic * 0.075)
    + (sal.basic * 0.002) + (sal.basic * 0.003);

  const displayGross = payrollMode === "netToGross" && netToGrossResult
    ? netToGrossResult.grossSalary
    : gross;
  const displayNet = payrollMode === "netToGross" && netToGrossResult
    ? netToGrossResult.finalNet
    : Math.round(net);
  const displayDeductions = payrollMode === "netToGross" && netToGrossResult
    ? netToGrossResult.grossSalary - netToGrossResult.finalNet
    : Math.round(totalDeductions);
  const displayEmployerCost = payrollMode === "netToGross" && netToGrossResult
    ? netToGrossResult.totalCostToSchool
    : Math.round(employerCost);

  const modeTabs = payrollMode === "netToGross"
    ? ["netToGross", "deductions", "advance", "summary"]
    : ["earnings", "deductions", "advance", "summary"];
  const tabLabels = {
    earnings: "Earnings",
    netToGross: "Net-to-Gross",
    deductions: "Deductions",
    advance: "Advance",
    summary: "Summary",
  };

  const persistStaffAllowances = async (salaryState) => {
    if (!selected) return;
    await saveStaffPayrollProfile(selected.id, buildStaffAllowancePayload(salaryState, allowanceRules));
  };

  const showToast = (type, message, detail = "") => {
    setToast({ type, message, detail });
    window.clearTimeout(window.__salarySetupToast);
    window.__salarySetupToast = window.setTimeout(() => setToast(null), 4500);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setLoadError("");
    try {
      await persistStaffAllowances(sal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast(
        "success",
        "Salary package saved",
        `${selected.name} · Gross ${fmtRwf(displayGross)} · Net ${fmtRwf(displayNet)}`,
      );
    } catch {
      setLoadError("Failed to save salary package.");
      showToast("error", "Could not save salary package", "Check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const closeAllowanceModal = () => {
    setShowAllowanceModal(false);
    setEditingAllowanceId(null);
    setAllowanceForm({ name: "", amount: "" });
  };

  const openAddAllowance = () => {
    setEditingAllowanceId(null);
    setAllowanceForm({ name: "", amount: "" });
    setShowAllowanceModal(true);
  };

  const openEditAllowance = (row) => {
    setEditingAllowanceId(row.id);
    setAllowanceForm({ name: row.name, amount: row.amount });
    setShowAllowanceModal(true);
  };

  const applySalaryState = (nextSal) => {
    if (!selected) return;
    setSalaries((s) => ({ ...s, [selected.id]: nextSal }));
  };

  const saveAllowance = async () => {
    const name = allowanceForm.name.trim();
    const amount = Number(allowanceForm.amount || 0);
    if (!name || amount <= 0 || !selected) return;

    const replaceRow = editingAllowanceId
      ? allowanceRows.find((r) => r.id === editingAllowanceId)
      : null;
    const baseSal = replaceRow?.kind === "auto" ? seedRegisterFromAuto(sal, allowanceRules) : sal;
    const nextSal = upsertAllowanceInSal(baseSal, { name, amount }, replaceRow);

    setModalSaving(true);
    setLoadError("");
    try {
      await persistStaffAllowances(nextSal);
      applySalaryState(nextSal);
      closeAllowanceModal();
    } catch {
      setLoadError("Failed to save allowance to staff profile.");
    } finally {
      setModalSaving(false);
    }
  };

  const removeAllowanceRow = async (row) => {
    if (!selected) return;
    const baseSal = row.kind === "auto" ? seedRegisterFromAuto(sal, allowanceRules) : sal;
    const nextSal = removeAllowanceFromSal(baseSal, row);
    setAllowanceRemovingId(row.id);
    setLoadError("");
    try {
      await persistStaffAllowances(nextSal);
      applySalaryState(nextSal);
    } catch {
      setLoadError("Failed to remove allowance from staff profile.");
    } finally {
      setAllowanceRemovingId(null);
    }
  };

  const addDeduction = async () => {
    const name = deductionForm.name.trim();
    const amount = Number(deductionForm.amount || 0);
    if (!name || amount <= 0 || !selected) return;
    setModalSaving(true);
    try {
      const created = await createEmployeePayrollDeduction({
        staffUserId: selected.id,
        staffName: selected.name,
        deductionType: "Other",
        customName: name,
        totalAmount: amount,
        monthlyInstallment: amount,
        status: "Active",
      });
      set("customDeductions", [
        ...(sal.customDeductions || []),
        { id: created?.id || `cd-${Date.now()}`, apiId: created?.id, name, amount, status: "Active" },
      ]);
      setDeductionForm({ name: "", amount: "" });
      setShowDeductionModal(false);
    } catch {
      setLoadError("Failed to save deduction.");
    } finally {
      setModalSaving(false);
    }
  };

  const removeDeduction = async (item) => {
    if (item.apiId) {
      try {
        await deleteEmployeePayrollDeduction(item.apiId);
      } catch {
        setLoadError("Failed to remove deduction.");
        return;
      }
    }
    set("customDeductions", (sal.customDeductions || []).filter((d) => d.id !== item.id));
  };

  const addAdvance = async () => {
    const amount = Number(advanceForm.amount || 0);
    const repaymentMonths = Number(advanceForm.repaymentMonths || 1);
    if (amount <= 0 || !selected) return;
    setModalSaving(true);
    const now = new Date();
    const monthlyInstallment = Math.round(amount / repaymentMonths);
    try {
      const created = await createEmployeePayrollDeduction({
        staffUserId: selected.id,
        staffName: selected.name,
        deductionType: "Salary Advance",
        totalAmount: amount,
        repaymentMonths,
        monthlyInstallment,
        startMonth: now.getMonth() + 1,
        startYear: now.getFullYear(),
        remainingBalance: amount,
        status: "Active",
      });
      set("advances", [
        ...(sal.advances || []),
        {
          id: created?.id || `adv-${Date.now()}`,
          apiId: created?.id,
          totalAmount: amount,
          repaymentMonths,
          monthlyInstallment,
          monthsPaid: 0,
          remainingBalance: amount,
          status: "Active",
          source: "payroll",
        },
      ]);
      setAdvanceForm({ amount: "", repaymentMonths: 3 });
      setShowAdvanceModal(false);
    } catch {
      setLoadError("Failed to save salary advance.");
    } finally {
      setModalSaving(false);
    }
  };

  const removeAdvance = async (item) => {
    if (item.apiId) {
      try {
        await deleteEmployeePayrollDeduction(item.apiId);
      } catch {
        setLoadError("Failed to remove advance.");
        return;
      }
    }
    set("advances", (sal.advances || []).filter((a) => a.id !== item.id));
  };

  const filtered = useMemo(
    () => staffList.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeNo.toLowerCase().includes(search.toLowerCase())
    ),
    [staffList, search]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-amber-400" size={32} />
          <p className="text-sm text-slate-400 font-medium">Loading staff…</p>
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#000435] flex items-center justify-center">
            <User size={24} className="text-amber-400" />
          </div>
          <p className="text-slate-500 text-sm">{loadError || "No staff found. Import employees with basic salary first."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">

      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-[#000435] font-black text-xl tracking-tight">Staff Salary Setup</h1>
            <p className="text-slate-400 text-xs mt-0.5">Configure individual employee salary packages</p>
          </div>

          <div className="flex gap-1.5 bg-slate-100 rounded-xl p-1">
            {Object.values(PAYROLL_MODES).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => switchPayrollMode(mode.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap
                  ${payrollMode === mode.id
                    ? "bg-[#000435] text-white shadow-sm"
                    : "text-slate-500 hover:text-[#000435] hover:bg-white/70"
                  }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadStaff}
              className="flex items-center gap-2 border border-slate-200 text-slate-500 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <History size={14} /> Reload
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (payrollMode === "netToGross" && !netToGrossResult)}
              className={`flex items-center gap-2 font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-60
                ${saved
                  ? "bg-[#000435] text-white"
                  : "bg-amber-400 hover:bg-amber-500 text-[#000435]"
                }`}
            >
              {saved
                ? <><CheckCircle size={14} /> Saved!</>
                : saving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save salary package</>
              }
            </button>

            <button className="flex items-center gap-2 bg-[#000435] hover:bg-[#000435]/90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
              <Send size={14} /> Submit
            </button>
          </div>
        </div>

        {payrollMode === "netToGross" && (
          <p className="text-xs text-slate-500 max-w-3xl">
            Enter the desired net salary per employee. The system finds gross salary and splits it into
            Basic (70%), Housing (10%), Transport (10%), and Others (10%), then calculates statutory deductions.
            Saved packages work in Payroll Run like normal payroll.
          </p>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        <div className="w-72 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 hidden md:flex">
          <div className="p-4 border-b border-slate-50">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search staff…"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(s => {
              const staffSal = salaries[s.id] || EMPTY_SALARY;
              const hasMissing = payrollMode === "netToGross"
                ? !(staffSal.desiredNet > 0)
                : !(staffSal.basic > 0);
              const isActive   = selected.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-amber-50/60 transition-colors border-b border-slate-50 text-left
                    ${isActive ? "bg-amber-50 border-l-4 border-l-amber-400" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isActive ? "bg-amber-400" : "bg-[#000435]"}`}>
                    <User size={15} className={isActive ? "text-[#000435]" : "text-amber-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#000435] truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.position}</p>
                  </div>
                  {hasMissing && <AlertCircle size={13} className="text-amber-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {loadError && (
            <p className="p-3 text-xs text-[#000435] border-t border-slate-50">{loadError}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-[#F59E0B] flex items-center justify-center flex-shrink-0 shadow-sm">
                  <User size={24} className="text-[#000435]" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[#000435] font-black text-lg tracking-tight truncate">
                    {selected.name}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#000435]/5 text-[#000435] border border-[#000435]/10">
                      {selected.dept}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      {selected.contract}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5">
                    {selected.position} · {selected.employeeNo}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[520px]">
                {[
                  { label: "Gross Salary", value: fmtRwf(displayGross), highlight: true },
                  { label: "Net Salary", value: fmtRwf(displayNet), highlight: true },
                  { label: "Total Deductions", value: fmtRwf(displayDeductions), highlight: false },
                  { label: "Employer Cost", value: fmtRwf(displayEmployerCost), highlight: false },
                ].map(({ label, value, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-xl px-4 py-3.5 border transition-shadow hover:shadow-sm ${
                      highlight
                        ? "bg-[#000435] border-[#000435] shadow-md"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <p className={`font-black text-sm leading-tight tabular-nums ${highlight ? "text-[#F59E0B]" : "text-[#000435]"}`}>
                      {value}
                    </p>
                    <p className={`text-[10px] mt-1.5 font-semibold uppercase tracking-wider ${highlight ? "text-white/50" : "text-slate-400"}`}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(!selected.rssb || !selected.account) && (
            <div className="flex items-center gap-3 bg-amber-400/8 border border-amber-400/25 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 font-medium">
                {!selected.rssb    && "Missing RSSB number. "}
                {!selected.account && "Missing bank account. "}
                Please update employee profile.
              </p>
            </div>
          )}

          <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1 w-fit shadow-sm flex-wrap">
            {modeTabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${tab === t
                    ? "bg-[#000435] text-white shadow-sm"
                    : "text-slate-400 hover:text-[#000435]"
                  }`}
              >
                {tabLabels[t] || t}
              </button>
            ))}
          </div>

          {tab === "netToGross" && payrollMode === "netToGross" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <SectionLabel icon={Calculator} label="Net-to-Gross Calculator — Method 2" color="text-[#000435]" />
                <p className="text-sm text-slate-500 mb-4">
                  Enter the desired take-home net salary. The system iteratively finds gross salary and applies
                  Basic 70% · Housing 10% · Transport 10% · Others 10%.
                </p>
                <div className="max-w-sm">
                  <InputField
                    label="Desired Net Salary *"
                    value={sal.desiredNet || ""}
                    onChange={handleDesiredNetChange}
                    prefix="RWF"
                    placeholder="e.g. 621400"
                  />
                </div>
              </div>

              {netToGrossResult ? (
                <>
                  <div className={`rounded-xl px-4 py-3 border flex items-center gap-3
                    ${Math.abs(netToGrossResult.difference || 0) <= 1
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <CheckCircle size={16} className={Math.abs(netToGrossResult.difference || 0) <= 1 ? "text-[#F59E0B]" : "text-[#000435]"} />
                    <div className="text-sm">
                      <p className="font-bold text-[#000435]">
                        {Math.abs(netToGrossResult.difference || 0) <= 1
                          ? "Net salary verified — gross salary found."
                          : "Approximate match — review amounts before saving."}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Desired {fmtRwf(netToGrossResult.desiredNet)} · Calculated {fmtRwf(netToGrossResult.verifiedNet)}
                        · Difference {fmtRwf(netToGrossResult.difference)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="bg-[#000435] px-5 py-3">
                      <p className="text-white font-black text-sm">Net-to-Gross Result</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[420px]">
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Item</th>
                            <th className="py-3 px-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Amount (RWF)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {[
                            { label: "Desired Net Salary", value: netToGrossResult.desiredNet, cls: "text-[#000435] font-bold" },
                            { label: "Gross Salary", value: netToGrossResult.grossSalary, cls: "text-[#F59E0B] font-bold" },
                            { label: "Basic Salary (70%)", value: netToGrossResult.basicSalary },
                            { label: "Housing Allowance (10%)", value: netToGrossResult.registerAllowanceSplit?.housing },
                            { label: "Transport Allowance (10%)", value: netToGrossResult.registerAllowanceSplit?.transport },
                            { label: "Other Allowance (10%)", value: netToGrossResult.registerAllowanceSplit?.others },
                            { label: "PAYE", value: netToGrossResult.paye, cls: "text-[#000435]" },
                            { label: "Employee Pension (CSR 6%)", value: netToGrossResult.rssbEmployee, cls: "text-[#000435]" },
                            { label: "Employee RAMA (7.5%)", value: netToGrossResult.ramaEmployee, cls: "text-[#000435]" },
                            { label: "Employee Maternity (0.3%)", value: netToGrossResult.maternityEmployee, cls: "text-[#000435]" },
                            ...(netToGrossResult.cbhi ? [{ label: "Mutuelle / CBHI (0.5%)", value: netToGrossResult.cbhi, cls: "text-[#000435]" }] : []),
                            ...(netToGrossResult.otherDeductions ? [{ label: "Other Deductions", value: netToGrossResult.otherDeductions, cls: "text-[#000435]" }] : []),
                            { label: "Verified Net Salary", value: netToGrossResult.verifiedNet, cls: "text-[#F59E0B] font-black" },
                          ].map((row) => (
                            <tr key={row.label} className="hover:bg-amber-50/30">
                              <td className="py-3 px-5 text-slate-600">{row.label}</td>
                              <td className={`py-3 px-5 text-right tabular-nums ${row.cls || "font-semibold text-[#000435]"}`}>
                                {Math.round(Number(row.value) || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save calculated package to profile
                    </button>
                  </div>
                </>
              ) : sal.desiredNet > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  Could not find a gross salary for this net amount. Try a different value or check deductions.
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-8 text-center text-sm text-slate-400">
                  Enter a desired net salary above to calculate gross and allowance split.
                </div>
              )}
            </div>
          )}

          {tab === "earnings" && payrollMode === "normal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <SectionLabel icon={TrendingUp} label="Earnings Components" color="text-[#000435]" />
                </div>
                <InputField label="Basic Salary *" value={sal.basic} onChange={v => set("basic", v)} prefix="RWF" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <SectionLabel icon={TrendingUp} label="Allowances" color="text-[#000435]" />
                  <button
                    type="button"
                    onClick={openAddAllowance}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#000435] text-xs font-bold transition-colors"
                  >
                    <Plus size={14} /> Add Allowance
                  </button>
                </div>

                {allowanceRows.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No allowances yet. Set a basic salary for auto Others / H/A / T/A, or add allowances manually.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="bg-[#000435] text-white text-left">
                          <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Allowance</th>
                          <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest">Monthly Amount</th>
                          <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allowanceRows.map((row) => (
                          <tr key={row.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#000435]">{row.name}</p>
                              <p className={`text-[10px] mt-0.5 uppercase tracking-wide font-semibold
                                ${row.kind === "auto" ? "text-amber-600" : "text-slate-400"}`}>
                                {allowanceKindLabel(row.kind)}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#F59E0B]">{fmtRwf(row.amount)}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditAllowance(row)}
                                  className="p-2 rounded-lg hover:bg-[#000435]/5 text-[#000435] transition-colors"
                                  title="Edit allowance"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAllowanceRow(row)}
                                  disabled={allowanceRemovingId === row.id}
                                  className="p-2 rounded-lg hover:bg-amber-50 text-[#000435]/60 transition-colors disabled:opacity-50"
                                  title="Remove allowance"
                                >
                                  {allowanceRemovingId === row.id
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Trash2 size={14} />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-50/60 border-t border-amber-100">
                          <td className="py-3 px-4 font-bold text-[#000435]">Allowances subtotal</td>
                          <td className="py-3 px-4 font-black text-[#F59E0B]">
                            {fmtRwf(allowanceRows.reduce((s, r) => s + r.amount, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-[#000435] border border-[#000435] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <p className="text-sm font-bold text-white/70">Total Gross Salary</p>
                <p className="text-xl font-black text-[#F59E0B]">{fmtRwf(gross)}</p>
              </div>
            </div>
          )}

          {tab === "deductions" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <SectionLabel icon={TrendingDown} label="Statutory Deductions (Auto-calculated)" color="text-[#000435]" />
                </div>
                <InputField label="PAYE"              value={Math.round(paye)}  prefix="RWF" disabled />
                <InputField label="RSSB Pension (6%)" value={Math.round(rssb)}  prefix="RWF" disabled />
                <InputField label="RAMA (7.5%)"        value={Math.round(rama)}  prefix="RWF" disabled />
                <InputField label="CBHI (0.5%)"        value={Math.round(cbhi)}  prefix="RWF" disabled />
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <SectionLabel icon={Plus} label="Additional Deductions" color="text-[#000435]" />
                  <button
                    type="button"
                    onClick={() => { setDeductionForm({ name: "", amount: "" }); setShowDeductionModal(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#000435] hover:bg-[#000435]/90 text-white text-xs font-bold transition-colors"
                  >
                    <Plus size={14} /> Add Deduction
                  </button>
                </div>

                {dedLoading ? (
                  <p className="text-sm text-slate-400 text-center py-6 inline-flex items-center gap-2 justify-center w-full">
                    <Loader2 size={14} className="animate-spin" /> Loading deductions…
                  </p>
                ) : (sal.customDeductions || []).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    No deductions yet. Use Add Deduction for monthly payroll deductions.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(sal.customDeductions || []).map((d) => (
                      <ItemChip
                        key={d.id}
                        name={d.name}
                        amount={d.amount}
                        variant="navy"
                        onRemove={() => removeDeduction(d)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {advanceMonthly > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <Wallet size={15} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Salary advance deduction this month: <strong>{fmtRwf(advanceMonthly)}</strong>
                    {" "}— managed on the <button type="button" onClick={() => setTab("advance")} className="underline font-bold">Advance</button> tab.
                  </p>
                </div>
              )}

              <div className="bg-white border-2 border-[#000435] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <p className="text-sm font-bold text-[#000435]">Total Deductions</p>
                <p className="text-xl font-black text-[#F59E0B]">{fmtRwf(Math.round(totalDeductions))}</p>
              </div>
            </div>
          )}

          {tab === "advance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Deduction</p>
                  <p className="text-xl font-black text-amber-600 mt-1">{fmtRwf(advanceMonthly)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Advances</p>
                  <p className="text-xl font-black text-[#000435] mt-1">
                    {(sal.advances || []).filter((a) => a.status === "Active").length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outstanding Balance</p>
                  <p className="text-xl font-black text-[#F59E0B] mt-1">
                    {fmtRwf((sal.advances || []).reduce((s, a) => s + Number(a.remainingBalance || 0), 0))}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <SectionLabel icon={Wallet} label="Salary Advances" color="text-amber-600" />
                  <button
                    type="button"
                    onClick={() => { setAdvanceForm({ amount: "", repaymentMonths: 3 }); setShowAdvanceModal(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#000435] text-xs font-bold transition-colors"
                  >
                    <Plus size={14} /> Request Advance
                  </button>
                </div>

                {dedLoading ? (
                  <p className="text-sm text-slate-400 text-center py-8 inline-flex items-center gap-2 justify-center w-full">
                    <Loader2 size={14} className="animate-spin" /> Loading advances…
                  </p>
                ) : (sal.advances || []).length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                      <Wallet size={20} className="text-amber-500" />
                    </div>
                    <p className="text-sm text-slate-500 font-medium">No salary advances on record</p>
                    <p className="text-xs text-slate-400 mt-1">Request an advance and choose repayment over 1–12 months.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(sal.advances || []).map((adv) => {
                      const months = Math.max(1, Number(adv.repaymentMonths || 1));
                      const paid = Number(adv.monthsPaid || 0);
                      const progress = Math.min(100, Math.round((paid / months) * 100));
                      const isActive = paid < months && adv.status !== "Completed";
                      return (
                        <div
                          key={adv.id}
                          className={`rounded-xl border p-4 ${isActive ? "border-amber-200 bg-amber-50/40" : "border-slate-100 bg-slate-50/50"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black text-[#000435]">{fmtRwf(adv.totalAmount)}</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                                  ${isActive ? "bg-amber-400/20 text-amber-700" : "bg-[#000435]/5 text-[#000435]"}`}>
                                  {isActive ? "Active" : "Completed"}
                                </span>
                                {adv.source === "shule_avance" && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Shule Avance
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <CalendarClock size={12} />
                                {fmtRwf(adv.monthlyInstallment)}/month · {paid} of {months} payroll months
                              </p>
                            </div>
                            {adv.source === "payroll" && isActive && (
                              <button
                                type="button"
                                onClick={() => removeAdvance(adv)}
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-[#000435]/60 transition-colors"
                                title="Remove advance"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="mt-3">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isActive ? "bg-amber-400" : "bg-[#000435]/30"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {isActive
                                ? `${months - paid} month${months - paid !== 1 ? "s" : ""} remaining · Balance ${fmtRwf(adv.remainingBalance)}`
                                : "Fully repaid — no further payroll deduction"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-[#000435] rounded-2xl p-4 text-white/70 text-xs leading-relaxed">
                <p className="font-bold text-white text-sm mb-1">How advance repayment works</p>
                <p>
                  When you choose e.g. <strong className="text-amber-400">2 months</strong>, the advance is split equally and deducted on
                  <strong className="text-white"> only 2 payroll runs</strong>. After that, the deduction stops automatically.
                </p>
              </div>
            </div>
          )}

          {tab === "summary" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-amber-400" />
                  <p className="font-black text-[#000435] text-sm">Payslip Preview</p>
                  {payrollMode === "netToGross" && sal.desiredNet > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                      Net-to-Gross
                    </span>
                  )}
                </div>

                {[
                  { label: "Basic Salary", value: sal.basic },
                  ...allowanceRows.map((a) => ({ label: a.name, value: a.amount })),
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-semibold text-[#F59E0B]">+ {fmtRwf(row.value)}</span>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-bold">
                  <span className="text-[#000435]">Gross Salary</span>
                  <span className="text-[#000435]">{fmtRwf(displayGross)}</span>
                </div>

                {[
                  { label: "PAYE", value: netToGrossResult?.paye ?? Math.round(paye) },
                  { label: "CSR (6%)", value: netToGrossResult?.rssbEmployee ?? Math.round(rssb) },
                  { label: "RAMA (7.5%)", value: netToGrossResult?.ramaEmployee ?? Math.round(rama) },
                  { label: "Maternity (0.3%)", value: netToGrossResult?.maternityEmployee ?? Math.round(sal.basic * 0.003) },
                  { label: "CBHI (0.5%)", value: netToGrossResult?.cbhi ?? Math.round(cbhi) },
                  ...(sal.customDeductions || []).map((d) => ({ label: d.name, value: d.amount })),
                  ...(advanceMonthly > 0 ? [{ label: "Salary Advance", value: advanceMonthly }] : []),
                ].filter(r => r.value > 0).map(row => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-semibold text-[#000435]">− {fmtRwf(row.value)}</span>
                  </div>
                ))}

                <div className="border-t-2 border-amber-400 pt-3 flex justify-between">
                  <span className="font-black text-[#000435]">Net Salary</span>
                  <span className="font-black text-xl text-[#000435]">{fmtRwf(displayNet)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 rounded-full bg-amber-400" />
                    <p className="font-black text-[#000435] text-sm">Salary History</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Previous Basic",      value: fmtRwf(sal.prevBasic),                        cls: "text-[#000435]" },
                      { label: "Current Basic",       value: fmtRwf(sal.basic),                            cls: "text-[#F59E0B]" },
                      { label: "Increment",           value: `+ ${fmtRwf(sal.basic - sal.prevBasic)}`,         cls: "text-amber-600" },
                      { label: "Last Increment Date", value: sal.lastIncrement,                                               cls: "text-[#000435]" },
                      ...(payrollMode === "netToGross" && sal.desiredNet > 0
                        ? [{ label: "Target Net Salary", value: fmtRwf(sal.desiredNet), cls: "text-[#F59E0B]" }]
                        : []),
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{r.label}</span>
                        <span className={`font-semibold ${r.cls}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 rounded-full bg-amber-400" />
                    <p className="font-black text-[#000435] text-sm">Employer Cost Breakdown</p>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Gross Salary",          value: displayGross },
                      { label: "Employer CSR (6%)",     value: netToGrossResult?.rssbEmployer ?? Math.round(sal.basic * 0.06) },
                      { label: "Employer RAMA (7.5%)",  value: netToGrossResult?.ramaEmployer ?? Math.round(sal.basic * 0.075) },
                      { label: "Maternity (0.3%)",      value: netToGrossResult?.maternityEmployer ?? Math.round(sal.basic * 0.003) },
                      { label: "Occ. Hazard (2%)",      value: netToGrossResult?.occupationalHazard ?? Math.round(sal.basic * 0.02) },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{r.label}</span>
                        <span className="font-semibold text-[#000435]">{fmtRwf(r.value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-2.5 flex justify-between font-bold text-sm">
                      <span className="text-[#000435]">Total Employer Cost</span>
                      <span className="text-amber-600">{fmtRwf(displayEmployerCost)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {showAllowanceModal && (
        <Modal
          title={editingAllowanceId ? "Edit Allowance" : "Add Allowance"}
          subtitle={editingAllowanceId ? "Update name or amount — saved to staff profile" : "Custom earning added to gross salary"}
          onClose={closeAllowanceModal}
        >
          <div className="space-y-4">
            <InputField
              label="Allowance Name"
              value={allowanceForm.name}
              onChange={(v) => setAllowanceForm((p) => ({ ...p, name: v }))}
              placeholder="e.g. Others, H/A, T/A, Meal Allowance"
            />
            <InputField
              label="Monthly Amount"
              value={allowanceForm.amount === "" ? "" : Number(allowanceForm.amount)}
              onChange={(v) => setAllowanceForm((p) => ({ ...p, amount: v }))}
              prefix="RWF"
            />
            <button
              type="button"
              onClick={saveAllowance}
              disabled={modalSaving || !allowanceForm.name.trim() || Number(allowanceForm.amount) <= 0}
              className={MODAL_BTN}
            >
              {modalSaving
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : editingAllowanceId
                  ? <><Save size={16} /> Save Changes</>
                  : <><Plus size={16} /> Add Allowance</>
              }
            </button>
          </div>
        </Modal>
      )}

      {showDeductionModal && (
        <Modal
          title="Add Deduction"
          subtitle="Monthly deduction from net salary"
          onClose={() => setShowDeductionModal(false)}
        >
          <div className="space-y-4">
            <InputField
              label="Deduction Name"
              value={deductionForm.name}
              onChange={(v) => setDeductionForm((p) => ({ ...p, name: v }))}
              placeholder="e.g. Staff SACCO, Loan"
            />
            <InputField
              label="Monthly Amount"
              value={deductionForm.amount === "" ? "" : Number(deductionForm.amount)}
              onChange={(v) => setDeductionForm((p) => ({ ...p, amount: v }))}
              prefix="RWF"
            />
            <button
              type="button"
              onClick={addDeduction}
              disabled={modalSaving || !deductionForm.name.trim() || Number(deductionForm.amount) <= 0}
              className={MODAL_BTN}
            >
              {modalSaving
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : <><Plus size={16} /> Add Deduction</>
              }
            </button>
          </div>
        </Modal>
      )}

      {showAdvanceModal && (
        <Modal
          title="Request Salary Advance"
          subtitle="Deducted equally over selected payroll months only"
          onClose={() => setShowAdvanceModal(false)}
        >
          <div className="space-y-4">
            <InputField
              label="Advance Amount"
              value={advanceForm.amount === "" ? "" : Number(advanceForm.amount)}
              onChange={(v) => setAdvanceForm((p) => ({ ...p, amount: v }))}
              prefix="RWF"
            />
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Repayment Months
              </label>
              <select
                value={advanceForm.repaymentMonths}
                onChange={(e) => setAdvanceForm((p) => ({ ...p, repaymentMonths: Number(e.target.value) }))}
                className="w-full border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-[#000435] bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {REPAYMENT_MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} month{m !== 1 ? "s" : ""}
                    {advanceForm.amount > 0 ? ` — ${fmtRwf(Math.round(Number(advanceForm.amount) / m))}/mo` : ""}
                  </option>
                ))}
              </select>
            </div>

            {Number(advanceForm.amount) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold">Repayment preview</p>
                <p className="mt-1">
                  {fmtRwf(advanceForm.amount)} over {advanceForm.repaymentMonths} month
                  {advanceForm.repaymentMonths !== 1 ? "s" : ""} =
                  {" "}<strong>{fmtRwf(Math.round(Number(advanceForm.amount) / advanceForm.repaymentMonths))}</strong> per payroll.
                  Deduction stops after month {advanceForm.repaymentMonths}.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={addAdvance}
              disabled={modalSaving || Number(advanceForm.amount) <= 0}
              className={MODAL_BTN}
            >
              {modalSaving
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : <><Wallet size={16} /> Request Advance</>
              }
            </button>
          </div>
        </Modal>
      )}

      <PortalToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
