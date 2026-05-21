import { useState, useEffect } from "react";
import { X, Loader2, Eye, EyeOff } from "lucide-react";
import {
  DEPARTMENTS, CONTRACT_TYPES, WORKING_STATUSES, GENDERS,
  PAYMENT_FREQUENCIES, PAYMENT_METHODS, HR_ROLE_OPTIONS,
} from "../../utils/hrCenterConstants";
import { staffRowToForm, buildStaffPatchPayload, isPlaceholderEmail } from "../../utils/staffFormMapper";
import { validatePhone, validateNationalId } from "../../utils/hrCenterHelpers";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const FONT = `"Montserrat", system-ui, sans-serif`;
const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15";

function Field({ label, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required ? <span className="text-amber-600 ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function EditStaffModal({ open, staff, onClose, onSuccess, toast }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState("personal");

  useEffect(() => {
    if (!open || !staff) {
      setForm(null);
      return;
    }
    setForm(staffRowToForm(staff));
    setTab("personal");
    setErrors({});
  }, [open, staff]);

  const patch = (section, patchObj) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], ...patchObj } }));
  };

  if (!open || !staff || !form) return null;

  const validate = () => {
    const e = {};
    if (!form.personal.first_name.trim()) e.first_name = "Required";
    if (!form.personal.last_name.trim()) e.last_name = "Required";
    const ph = validatePhone(form.personal.phone);
    if (!ph.ok) e.phone = ph.message;
    const nid = validateNationalId(form.personal.national_id);
    if (!nid.ok) e.national_id = nid.message;
    if (!form.professional.department) e.department = "Required";
    if (!form.account.no_email) {
      const em = (form.account.email || form.personal.email || "").trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Invalid email";
    }
    if (form.account.new_password && form.account.new_password.length < 8) {
      e.new_password = "Min 8 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = buildStaffPatchPayload({
        ...form,
        account: {
          ...form.account,
          new_password: form.account.new_password,
        },
      });
      const res = await fetch(`${API}/api/school/staff/${staff.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        toast?.(json.message || "Update failed", "error");
        return;
      }
      toast?.("Staff updated successfully.", "success");
      onSuccess?.();
      onClose?.();
    } catch {
      toast?.("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "job", label: "Job" },
    { id: "payroll", label: "Payroll" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ fontFamily: FONT }}>
      <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-2xl max-h-[94vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#000435] to-[#0a1654] text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">Edit staff</p>
              <h2 className="text-lg font-bold">{form.personal.first_name} {form.personal.last_name}</h2>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  tab === t.id ? "bg-amber-400 text-[#000435]" : "bg-white/15 text-white/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "personal" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" required>
                <input className={inputCls} value={form.personal.first_name} onChange={(e) => patch("personal", { first_name: e.target.value })} />
                {errors.first_name && <p className="text-[10px] text-red-500 mt-1">{errors.first_name}</p>}
              </Field>
              <Field label="Last name" required>
                <input className={inputCls} value={form.personal.last_name} onChange={(e) => patch("personal", { last_name: e.target.value })} />
                {errors.last_name && <p className="text-[10px] text-red-500 mt-1">{errors.last_name}</p>}
              </Field>
              <Field label="Gender">
                <select className={inputCls} value={form.personal.gender} onChange={(e) => patch("personal", { gender: e.target.value })}>
                  <option value="">Select</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of birth">
                <input type="date" className={inputCls} value={form.personal.date_of_birth} onChange={(e) => patch("personal", { date_of_birth: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={form.personal.phone} onChange={(e) => patch("personal", { phone: e.target.value })} />
                {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
              </Field>
              <Field label="National ID">
                <input className={inputCls} value={form.personal.national_id} onChange={(e) => patch("personal", { national_id: e.target.value })} />
                {errors.national_id && <p className="text-[10px] text-red-500 mt-1">{errors.national_id}</p>}
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea className={`${inputCls} min-h-[72px]`} value={form.personal.address} onChange={(e) => patch("personal", { address: e.target.value })} />
              </Field>
            </div>
          )}

          {tab === "job" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Staff ID">
                <input className={`${inputCls} font-mono bg-slate-50`} value={form.professional.employee_id} readOnly />
                <p className="text-[10px] text-slate-400 mt-1">Staff ID cannot be changed.</p>
              </Field>
              <Field label="Joining date">
                <input type="date" className={inputCls} value={form.professional.joining_date} onChange={(e) => patch("professional", { joining_date: e.target.value })} />
              </Field>
              <Field label="Department" required>
                <select className={inputCls} value={form.professional.department} onChange={(e) => patch("professional", { department: e.target.value })}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="text-[10px] text-red-500 mt-1">{errors.department}</p>}
              </Field>
              <Field label="Contract type">
                <select className={inputCls} value={form.professional.contract_type} onChange={(e) => patch("professional", { contract_type: e.target.value })}>
                  {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Role" className="sm:col-span-2">
                <select
                  className={inputCls}
                  value={form.professional.role_code === "CUSTOM" ? "CUSTOM" : form.professional.role_code}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "CUSTOM") {
                      patch("professional", { role_code: "CUSTOM" });
                    } else {
                      const opt = HR_ROLE_OPTIONS.find((r) => r.code === v);
                      patch("professional", { role_code: v, role_label: opt?.label || v, custom_role_name: "" });
                    }
                  }}
                >
                  {HR_ROLE_OPTIONS.filter((r) => !r.isOther).map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                  <option value="CUSTOM">Custom role</option>
                </select>
              </Field>
              {form.professional.role_code === "CUSTOM" && (
                <Field label="Custom role name" className="sm:col-span-2">
                  <input
                    className={inputCls}
                    value={form.professional.custom_role_name}
                    onChange={(e) => patch("professional", { custom_role_name: e.target.value, role_label: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Working status">
                <select className={inputCls} value={form.professional.working_status} onChange={(e) => patch("professional", { working_status: e.target.value })}>
                  {WORKING_STATUSES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
            </div>
          )}

          {tab === "payroll" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Basic salary">
                <input type="number" className={inputCls} value={form.salary.basic_salary} onChange={(e) => patch("salary", { basic_salary: e.target.value })} />
              </Field>
              <Field label="Payment frequency">
                <select className={inputCls} value={form.salary.payment_frequency} onChange={(e) => patch("salary", { payment_frequency: e.target.value })}>
                  {PAYMENT_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Payment method" className="sm:col-span-2">
                <select className={inputCls} value={form.salary.payment_method} onChange={(e) => patch("salary", { payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              {form.salary.payment_method === "Bank Transfer" && (
                <>
                  <Field label="Bank name"><input className={inputCls} value={form.salary.bank_name} onChange={(e) => patch("salary", { bank_name: e.target.value })} /></Field>
                  <Field label="Account number"><input className={inputCls} value={form.salary.account_number} onChange={(e) => patch("salary", { account_number: e.target.value })} /></Field>
                </>
              )}
              {form.salary.payment_method === "Mobile Money" && (
                <Field label="MoMo phone"><input className={inputCls} value={form.salary.momo_phone} onChange={(e) => patch("salary", { momo_phone: e.target.value })} /></Field>
              )}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.salary.allow_advance}
                    onChange={(e) => patch("salary", { allow_advance: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  Allowed to take Shule Avance
                </label>
              </div>
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-4">
              <Field label="Username">
                <input className={`${inputCls} font-mono bg-slate-50`} value={form.account.username} readOnly />
                <p className="text-[10px] text-slate-400 mt-1">Username cannot be changed.</p>
              </Field>
              <Field label="RFID card UID" hint="Used for morning & evening gate attendance">
                <input
                  className={`${inputCls} font-mono uppercase`}
                  value={form.account.rfid_uid || ""}
                  onChange={(e) => patch("account", { rfid_uid: e.target.value.toUpperCase() })}
                  placeholder="Scan or type card UID"
                />
              </Field>
              {form.account.no_email || isPlaceholderEmail(staff.email) ? (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  This account uses system login without a personal email.
                </p>
              ) : (
                <Field label="Email">
                  <input type="email" className={inputCls} value={form.account.email} onChange={(e) => patch("account", { email: e.target.value })} />
                  {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email}</p>}
                </Field>
              )}
              <Field label="Account status">
                <select className={inputCls} value={form.account.account_status} onChange={(e) => patch("account", { account_status: e.target.value })}>
                  <option>Active</option>
                  <option>Disabled</option>
                </select>
              </Field>
              <Field label="New password" hint="Leave blank to keep current password">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className={inputCls}
                    value={form.account.new_password || ""}
                    onChange={(e) => patch("account", { new_password: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.new_password && <p className="text-[10px] text-red-500 mt-1">{errors.new_password}</p>}
              </Field>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/80">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#000435] text-amber-400 text-sm font-bold hover:bg-[#000a50] disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
