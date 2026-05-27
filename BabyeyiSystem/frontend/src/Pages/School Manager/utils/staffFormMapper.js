import { createEmptyStaffForm, HR_ROLE_OPTIONS } from "./hrCenterConstants";
import { roleLabelForCode, parseMoney } from "./hrCenterHelpers";

const PLACEHOLDER_EMAIL_RE = /@staff\.noemail\.local$/i;

export function isPlaceholderEmail(email) {
  return !email || PLACEHOLDER_EMAIL_RE.test(String(email).trim());
}

const PAYMENT_METHOD_FROM_API = {
  bank: "Bank Transfer",
  mobile_money: "Mobile Money",
  cash: "Cash",
  cheque: "Cheque",
};

function parseJsonField(val) {
  if (val == null || val === "") return null;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function resolveRoleFromRow(row) {
  const code = String(row.role_code || "").toUpperCase();
  const known = HR_ROLE_OPTIONS.find((r) => r.code === code && !r.isOther);
  if (known) {
    return { role_code: code, role_label: known.label, custom_role_name: "" };
  }
  const label = row.role_name || row.job_title || code;
  return {
    role_code: "CUSTOM",
    role_label: label,
    custom_role_name: label,
  };
}

/** Map API staff row → wizard form shape for edit */
export function staffRowToForm(row) {
  const form = createEmptyStaffForm();
  const noEmail = isPlaceholderEmail(row.email);

  form.personal = {
    ...form.personal,
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    gender: row.gender || "",
    date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : "",
    national_id: row.national_id || "",
    phone: row.phone || "",
    email: noEmail ? "" : row.email || "",
    address: row.address || "",
    marital_status: "",
    nationality: form.personal.nationality,
  };

  const role = resolveRoleFromRow(row);
  form.professional = {
    ...form.professional,
    employee_id: row.staff_id || "",
    joining_date: row.date_of_employment ? String(row.date_of_employment).slice(0, 10) : form.professional.joining_date,
    contract_type: row.employment_type || "Permanent",
    department: row.department || "",
    qualification: "",
    experience_years: "",
    working_status: row.employment_status || (Number(row.is_active) === 1 ? "Active" : "Inactive"),
    ...role,
  };

  const pm = PAYMENT_METHOD_FROM_API[String(row.payroll_payment_method || "").toLowerCase()] || "Bank Transfer";

  form.salary = {
    ...form.salary,
    basic_salary: row.payroll_basic_salary != null ? String(row.payroll_basic_salary) : "",
    payment_frequency: row.payroll_payment_frequency || "Monthly",
    payment_method: pm,
    bank_name: row.payroll_bank_name || "",
    account_number: row.payroll_account_number || "",
    momo_phone: row.payroll_mobile_money_phone || "",
    allow_advance: Number(row.allow_advance) === 1,
    apply_tax: row.payroll_tax_percent != null && Number(row.payroll_tax_percent) > 0,
    tax_percent: row.payroll_tax_percent != null ? String(row.payroll_tax_percent) : "",
  };

  form.account = {
    ...form.account,
    username: row.username || row.staff_login_username || "",
    rfid_uid: row.rfid_uid || "",
    email: noEmail ? "" : row.email || "",
    no_email: noEmail,
    account_status: Number(row.account_enabled) === 0 ? "Disabled" : "Active",
    auto_generate_password: true,
    set_password_manually: false,
    password: "",
    confirm_password: "",
  };

  return form;
}

/** Build PATCH body for /api/school/staff/:id */
export function buildStaffPatchPayload(form) {
  const { personal, professional, salary, account } = form;
  const roleCode = professional.role_code === "CUSTOM" ? "CUSTOM" : professional.role_code;
  const customRole =
    professional.role_code === "CUSTOM"
      ? professional.custom_role_name || professional.role_label
      : undefined;

  const paymentMethodMap = {
    "Bank Transfer": "bank",
    "Mobile Money": "mobile_money",
    Cash: "cash",
    Cheque: "cheque",
  };

  const payload = {
    first_name: personal.first_name.trim(),
    last_name: personal.last_name.trim(),
    phone: personal.phone.trim() || null,
    gender: personal.gender || null,
    date_of_birth: personal.date_of_birth || null,
    national_id: personal.national_id.replace(/\s/g, "") || null,
    address: personal.address || null,
    employment_type: professional.contract_type,
    job_title: roleLabelForCode(professional.role_code, professional.custom_role_name || professional.role_label),
    date_of_employment: professional.joining_date || null,
    employment_status: professional.working_status,
    department: professional.department || null,
    role_code: roleCode,
    custom_role_name: customRole,
    payroll_basic_salary: parseMoney(salary.basic_salary) || null,
    payroll_payment_frequency: salary.payment_frequency,
    payroll_payment_method: paymentMethodMap[salary.payment_method] || salary.payment_method,
    payroll_bank_name: salary.bank_name || null,
    payroll_account_number: salary.account_number || null,
    payroll_mobile_money_phone:
      salary.payment_method === "Mobile Money" ? salary.momo_phone || null : null,
    payroll_tax_percent: salary.apply_tax ? parseMoney(salary.tax_percent) : null,
    allow_advance: !!salary.allow_advance,
    is_active: professional.working_status === "Active" || (account.account_status === "Active"),
    account_enabled: account.account_status === "Active",
  };

  if (!account.no_email) {
    const em = (account.email || personal.email || "").trim();
    if (em) payload.email = em;
  }

  if (account.new_password && account.new_password.length >= 8) {
    payload.password = account.new_password;
  }

  if (account.rfid_uid !== undefined) {
    const rfid = String(account.rfid_uid || "").trim().toUpperCase();
    payload.rfid_uid = rfid || null;
  }

  return payload;
}

export function staffRowDisplayMeta(row) {
  const noEmail = isPlaceholderEmail(row.email);
  return {
    fullName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    emailDisplay: noEmail ? "— (no email)" : row.email,
    roleDisplay: row.role_name || row.job_title || row.role_code || "—",
  };
}
