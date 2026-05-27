import { HR_ROLE_OPTIONS } from "./hrCenterConstants";

const RW_PHONE_RE = /^(?:\+?250|0)?7[2389]\d{7}$/;
const RW_NID_RE = /^\d{16}$/;

export function calcAge(dateStr) {
  if (!dateStr) return null;
  const dob = new Date(dateStr);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function validateNationalId(nid) {
  if (!nid) return { ok: true };
  const clean = String(nid).replace(/\s/g, "");
  if (!RW_NID_RE.test(clean)) {
    return { ok: false, message: "National ID must be 16 digits." };
  }
  return { ok: true };
}

export function validatePhone(phone) {
  if (!phone) return { ok: true };
  const clean = String(phone).replace(/\s/g, "");
  if (!RW_PHONE_RE.test(clean)) {
    return { ok: false, message: "Use a valid Rwanda number (e.g. 078xxxxxxx)." };
  }
  return { ok: true };
}

export function formatCurrency(amount, currency = "RWF") {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseMoney(v) {
  const n = Number(String(v || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function calcSalarySummary(salary) {
  const basic = parseMoney(salary.basic_salary);
  let totalAllowances = 0;
  let totalDeductions = 0;

  (salary.allowances || []).forEach((a) => {
    const amt = parseMoney(a.amount);
    totalAllowances += a.type === "Percentage" ? (basic * amt) / 100 : amt;
  });

  (salary.deductions || []).forEach((d) => {
    const amt = parseMoney(d.amount);
    totalDeductions += d.type === "Percentage" ? (basic * amt) / 100 : amt;
  });

  if (salary.apply_tax && salary.tax_percent) {
    totalDeductions += (basic * parseMoney(salary.tax_percent)) / 100;
  }
  totalDeductions += parseMoney(salary.rssb) + parseMoney(salary.paye);
  totalDeductions += parseMoney(salary.housing_deduction) + parseMoney(salary.transport_deduction);

  const net = basic + totalAllowances - totalDeductions;
  return { basic, totalAllowances, totalDeductions, net: Math.max(0, net) };
}

export function generateEmployeeId() {
  const y = new Date().getFullYear();
  const r = Math.floor(1000 + Math.random() * 9000);
  return `EMP-${y}-${r}`;
}

export function generatePassword(len = 12) {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: "Empty", color: "bg-slate-200" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ["Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["bg-red-400", "bg-orange-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
  const idx = Math.min(score, 4);
  return { score: idx, label: labels[idx], color: colors[idx] };
}

export function suggestUsername(first, last) {
  const f = String(first || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  const l = String(last || "").trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!f && !l) return "";
  return `${f}.${l}`.replace(/\.+/g, ".").replace(/^\.|\.$/g, "");
}

export function suggestEmail(first, last, domain = "babyeyi.rw") {
  const u = suggestUsername(first, last);
  return u ? `${u}@${domain}` : "";
}

export function roleLabelForCode(code, customName) {
  if (code === "CUSTOM" && customName) return customName;
  const found = HR_ROLE_OPTIONS.find((r) => r.code === code && !r.isOther);
  return found?.label || customName || code;
}

export function buildStaffApiPayload(form) {
  const { personal, professional, salary, account } = form;
  const roleCode = professional.role_code === "CUSTOM" ? "CUSTOM" : professional.role_code;
  const customRole =
    professional.role_code === "CUSTOM"
      ? professional.custom_role_name || professional.role_label
      : undefined;

  const summary = calcSalarySummary(salary);
  const transport = (salary.allowances || []).find((a) =>
    /transport/i.test(a.name || "")
  );
  const housing = (salary.allowances || []).find((a) =>
    /housing/i.test(a.name || "")
  );
  const meal = (salary.allowances || []).find((a) =>
    /meal|food/i.test(a.name || "")
  );
  const otherAllowances = (salary.allowances || []).filter(
    (a) => !/transport|housing|meal|food/i.test(a.name || "")
  );
  const otherDeductions = [
    ...(salary.deductions || []).map((d) => ({
      name: d.name,
      amount: parseMoney(d.amount),
      type: d.type,
    })),
    salary.rssb ? { name: "RSSB", amount: parseMoney(salary.rssb), type: "Fixed" } : null,
    salary.paye ? { name: "PAYE", amount: parseMoney(salary.paye), type: "Fixed" } : null,
    salary.housing_deduction
      ? { name: "Housing Deduction", amount: parseMoney(salary.housing_deduction), type: "Fixed" }
      : null,
    salary.transport_deduction
      ? { name: "Transport Deduction", amount: parseMoney(salary.transport_deduction), type: "Fixed" }
      : null,
  ].filter(Boolean);

  const paymentMethodMap = {
    "Bank Transfer": "bank",
    "Mobile Money": "mobile_money",
    Cash: "cash",
    Cheque: "cheque",
  };

  const emailRaw = account.no_email
    ? ""
    : (account.email || personal.email || "").trim();
  const useManualPassword =
    account.set_password_manually || !account.auto_generate_password;

  return {
    first_name: personal.first_name.trim(),
    last_name: personal.last_name.trim(),
    email: emailRaw || undefined,
    username: account.username.trim(),
    phone: personal.phone.trim() || undefined,
    password: useManualPassword ? account.password : undefined,
    role_code: roleCode,
    custom_role_name: customRole,
    staff_id: professional.employee_id.trim() || undefined,
    gender: personal.gender || undefined,
    date_of_birth: personal.date_of_birth || undefined,
    national_id: personal.national_id.replace(/\s/g, "") || undefined,
    address: personal.address || undefined,
    employment_type: professional.contract_type,
    job_title: roleLabelForCode(professional.role_code, professional.custom_role_name || professional.role_label),
    date_of_employment: professional.joining_date || undefined,
    employment_status: professional.working_status,
    department: professional.department || undefined,
    payroll_basic_salary: summary.basic || undefined,
    payroll_transport_allowance: transport ? parseMoney(transport.amount) : undefined,
    payroll_housing_allowance: housing ? parseMoney(housing.amount) : undefined,
    payroll_meal_allowance: meal ? parseMoney(meal.amount) : undefined,
    payroll_other_allowances: otherAllowances.length ? otherAllowances : undefined,
    payroll_tax_percent: salary.apply_tax ? parseMoney(salary.tax_percent) : undefined,
    payroll_other_deductions: otherDeductions.length ? otherDeductions : undefined,
    payroll_payment_frequency: salary.payment_frequency,
    payroll_payment_method: paymentMethodMap[salary.payment_method] || salary.payment_method,
    payroll_bank_name: salary.bank_name || undefined,
    payroll_account_number: salary.account_number || undefined,
    payroll_mobile_money_phone:
      salary.payment_method === "Mobile Money" ? salary.momo_phone : undefined,
    account_enabled: account.account_status === "Active",
    allow_advance: !!salary.allow_advance,
    rfid_uid: (account.rfid_uid || "").trim().toUpperCase() || undefined,
  };
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDraft(key, form, step) {
  try {
    localStorage.setItem(key, JSON.stringify({ form, step, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Strip File objects for localStorage draft */
export function serializeFormForDraft(form) {
  return {
    ...form,
    personal: {
      ...form.personal,
      profile_photo: null,
      profile_preview: form.personal.profile_preview,
    },
    documents: Object.fromEntries(
      Object.entries(form.documents || {}).map(([k, files]) => [
        k,
        (files || []).map((f) => ({ name: f.name, size: f.size, type: f.type })),
      ])
    ),
  };
}
