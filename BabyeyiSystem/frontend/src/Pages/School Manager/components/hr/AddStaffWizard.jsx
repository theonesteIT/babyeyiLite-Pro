/**
 * AddStaffWizard — 6-step HR onboarding modal
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X, ChevronLeft, ChevronRight, Save, UserPlus, Printer, Plus, Trash2,
  Upload, Check, AlertCircle, Loader2, RefreshCw, Eye, EyeOff, Sparkles,
} from "lucide-react";
import {
  WIZARD_STEPS, createEmptyStaffForm, DOCUMENT_SLOTS, DEPARTMENTS,
  CONTRACT_TYPES, WORKING_STATUSES, GENDERS, MARITAL_STATUSES,
  PAYMENT_FREQUENCIES, PAYMENT_METHODS, MOMO_PROVIDERS, CURRENCIES,
  HR_ROLE_OPTIONS, DRAFT_STORAGE_KEY,
} from "../../utils/hrCenterConstants";
import {
  calcAge, validateNationalId, validatePhone, formatCurrency, calcSalarySummary,
  generateEmployeeId, generatePassword, passwordStrength, suggestUsername,
  suggestEmail, buildStaffApiPayload, loadDraft, saveDraft, clearDraft,
  serializeFormForDraft, roleLabelForCode,
} from "../../utils/hrCenterHelpers";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";
const FONT = `"Montserrat", system-ui, sans-serif`;

function Field({ label, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required ? <span className="text-amber-600 ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[10px] text-slate-400 mt-1">{hint}</p> : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all";

export default function AddStaffWizard({ open, onClose, onSuccess, session, toast, existingUsernames = [] }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(createEmptyStaffForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [otherRoleOpen, setOtherRoleOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState("");
  const draftKey = DRAFT_STORAGE_KEY(session?.schoolId);

  useEffect(() => {
    if (!open) return;
    const draft = loadDraft(draftKey);
    if (draft?.form) {
      setForm({ ...createEmptyStaffForm(), ...draft.form });
      setStep(draft.step || 1);
    } else {
      const empty = createEmptyStaffForm();
      empty.professional.employee_id = generateEmployeeId();
      setForm(empty);
      setStep(1);
    }
    setErrors({});
  }, [open, draftKey]);

  const salarySummary = useMemo(() => calcSalarySummary(form.salary), [form.salary]);
  const age = useMemo(() => calcAge(form.personal.date_of_birth), [form.personal.date_of_birth]);
  const pwStrength = useMemo(() => passwordStrength(form.account.password), [form.account.password]);
  const progress = ((step - 1) / (WIZARD_STEPS.length - 1)) * 100;

  const patch = useCallback((section, patchObj) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], ...patchObj } }));
  }, []);

  const validateStep = (s) => {
    const e = {};
    const p = form.personal;
    const pr = form.professional;
    const ac = form.account;

    if (s === 1) {
      if (!p.first_name.trim()) e.first_name = "Required";
      if (!p.last_name.trim()) e.last_name = "Required";
      if (!p.phone.trim()) e.phone = "Required";
      const ph = validatePhone(p.phone);
      if (!ph.ok) e.phone = ph.message;
      const nid = validateNationalId(p.national_id);
      if (!nid.ok) e.national_id = nid.message;
    }
    if (s === 2) {
      if (!pr.department) e.department = "Required";
      if (pr.role_code === "CUSTOM" && !pr.custom_role_name.trim()) e.custom_role = "Enter role name";
    }
    if (s === 3) {
      if (!form.salary.basic_salary) e.basic_salary = "Required";
    }
    if (s === 5) {
      if (!ac.username || ac.username.length < 3) e.username = "Min 3 characters";
      if (existingUsernames.includes(ac.username.toLowerCase())) e.username = "Username taken";
      const hasEmail = !ac.no_email && !!(ac.email?.trim() || p.email?.trim());
      if (hasEmail) {
        const em = (ac.email || p.email).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = "Invalid email format";
      }
      const manualPw = ac.set_password_manually || !ac.auto_generate_password;
      if (manualPw || ac.no_email || !hasEmail) {
        if (!ac.password || ac.password.length < 8) {
          e.password = ac.no_email || !hasEmail
            ? "Required — share this password with staff (no email)"
            : "Min 8 characters";
        }
        if (ac.password !== ac.confirm_password) e.confirm_password = "Passwords must match";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < WIZARD_STEPS.length) setStep((s) => s + 1);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSaveDraft = () => {
    const ok = saveDraft(draftKey, serializeFormForDraft(form), step);
    toast?.(ok ? "Draft saved." : "Could not save draft.", ok ? "success" : "error");
  };

  const autoFillAccount = () => {
    const u = suggestUsername(form.personal.first_name, form.personal.last_name);
    const em = suggestEmail(form.personal.first_name, form.personal.last_name);
    const pw = generatePassword();
    patch("account", {
      username: u,
      ...(!form.account.no_email ? { email: em || form.personal.email } : {}),
      ...(form.account.set_password_manually
        ? { password: pw, confirm_password: pw }
        : {}),
    });
  };

  const fillGeneratedPassword = () => {
    const pw = generatePassword();
    patch("account", {
      password: pw,
      confirm_password: pw,
      set_password_manually: true,
      auto_generate_password: false,
    });
  };

  useEffect(() => {
    if (step === 5 && !form.account.username && form.personal.first_name) {
      autoFillAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const uploadProfilePhoto = async (userId, file) => {
    if (!file || !userId) return;
    const fd = new FormData();
    fd.append("photo", file);
    await fetch(`${API}/api/school/staff/${userId}/photo`, {
      method: "POST",
      credentials: "include",
      body: fd,
    }).catch(() => null);
  };

  const applyApiFieldErrors = (json) => {
    const field = String(json?.field || "").toLowerCase();
    const msg = json?.message || "Could not create staff";
    const next = {};
    let targetStep = 6;
    if (field === "first_name") { next.first_name = msg; targetStep = 1; }
    else if (field === "last_name") { next.last_name = msg; targetStep = 1; }
    else if (field === "phone") { next.phone = msg; targetStep = 1; }
    else if (field === "national_id") { next.national_id = msg; targetStep = 1; }
    else if (field === "email") { next.email = msg; targetStep = 5; }
    else if (field === "username") { next.username = msg; targetStep = 5; }
    else if (field === "password") { next.password = msg; targetStep = 5; }
    else if (field === "department" || field === "role_code" || field === "custom_role") {
      if (field === "department") next.department = msg;
      else next.custom_role = msg;
      targetStep = 2;
    } else if (field === "basic_salary" || field.startsWith("payroll")) {
      next.basic_salary = msg;
      targetStep = 3;
    } else if (field === "rfid_uid") {
      targetStep = 5;
    }
    if (Object.keys(next).length) {
      setErrors(next);
      setStep(targetStep);
    }
    return msg;
  };

  const handleSubmit = async () => {
    for (const s of [1, 2, 3, 5]) {
      if (!validateStep(s)) {
        setStep(s);
        return;
      }
    }
    setSaving(true);
    setErrors({});
    try {
      const payload = buildStaffApiPayload(form);
      const res = await fetch(`${API}/api/school/staff`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        const msg = applyApiFieldErrors(json);
        toast?.(msg, "error");
        return;
      }
      const userId = json.data?.id || json.data?.user_id;
      if (userId && form.personal.profile_photo) {
        await uploadProfilePhoto(userId, form.personal.profile_photo);
      }
      clearDraft(draftKey);
      toast?.(
        json.data?.password_sent_by_email
          ? "Staff created. Login credentials sent by email."
          : "Staff member added successfully.",
        "success"
      );
      onSuccess?.();
      onClose?.();
    } catch {
      toast?.("Network error", "error");
    } finally {
      setSaving(false);
    }
  };

  const addAllowance = () => {
    patch("salary", {
      allowances: [...form.salary.allowances, { name: "", amount: "", type: "Fixed" }],
    });
  };

  const addDeduction = () => {
    patch("salary", {
      deductions: [...form.salary.deductions, { name: "", amount: "", type: "Fixed" }],
    });
  };

  const addCustomRole = () => {
    const name = newRoleInput.trim();
    if (!name) return;
    patch("professional", {
      custom_roles: [...new Set([...form.professional.custom_roles, name])],
      custom_role_name: name,
      role_label: name,
      role_code: "CUSTOM",
    });
    setNewRoleInput("");
    setOtherRoleOpen(false);
  };

  const handleDocDrop = (slotKey, files) => {
    const valid = [...files].filter((f) =>
      /pdf|image\/(jpeg|jpg|png|webp)/i.test(f.type)
    );
    patch("documents", {
      [slotKey]: [...(form.documents[slotKey] || []), ...valid],
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ fontFamily: FONT }}
    >
      <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#000435] to-[#0a1654] text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/90">HR Center</p>
              <h2 className="text-lg sm:text-xl font-bold">Add Staff Member</h2>
              <p className="text-[11px] text-white/55 mt-0.5">Step {step} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1]?.label}</p>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
              <X size={18} />
            </button>
          </div>
          {/* Progress */}
          <div className="mt-4 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Stepper */}
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {WIZARD_STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  s.id === step
                    ? "bg-amber-400 text-[#000435]"
                    : s.id < step
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/40"
                }`}
              >
                {s.short}
                {s.optional ? " ○" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name" required className="sm:col-span-1">
                <input className={inputCls} value={form.personal.first_name} onChange={(e) => patch("personal", { first_name: e.target.value })} />
                {errors.first_name && <p className="text-[10px] text-red-500 mt-1">{errors.first_name}</p>}
              </Field>
              <Field label="Last Name" required>
                <input className={inputCls} value={form.personal.last_name} onChange={(e) => patch("personal", { last_name: e.target.value })} />
                {errors.last_name && <p className="text-[10px] text-red-500 mt-1">{errors.last_name}</p>}
              </Field>
              <Field label="Gender">
                <select className={inputCls} value={form.personal.gender} onChange={(e) => patch("personal", { gender: e.target.value })}>
                  <option value="">Select</option>
                  {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Date of Birth" hint={age != null ? `Age: ${age} years` : undefined}>
                <input type="date" className={inputCls} value={form.personal.date_of_birth} onChange={(e) => patch("personal", { date_of_birth: e.target.value })} />
              </Field>
              <Field label="National ID">
                <input className={inputCls} value={form.personal.national_id} onChange={(e) => patch("personal", { national_id: e.target.value })} placeholder="16 digits" />
                {errors.national_id && <p className="text-[10px] text-red-500 mt-1">{errors.national_id}</p>}
              </Field>
              <Field label="Phone Number" required>
                <input className={inputCls} value={form.personal.phone} onChange={(e) => patch("personal", { phone: e.target.value })} placeholder="078xxxxxxx" />
                {errors.phone && <p className="text-[10px] text-red-500 mt-1">{errors.phone}</p>}
              </Field>
              <Field label="Email Address" className="sm:col-span-2">
                <input type="email" className={inputCls} value={form.personal.email} onChange={(e) => patch("personal", { email: e.target.value })} />
              </Field>
              <Field label="Physical Address" className="sm:col-span-2">
                <textarea className={`${inputCls} min-h-[72px]`} value={form.personal.address} onChange={(e) => patch("personal", { address: e.target.value })} />
              </Field>
              <Field label="Marital Status">
                <select className={inputCls} value={form.personal.marital_status} onChange={(e) => patch("personal", { marital_status: e.target.value })}>
                  <option value="">Select</option>
                  {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Nationality">
                <input className={inputCls} value={form.personal.nationality} onChange={(e) => patch("personal", { nationality: e.target.value })} />
              </Field>
              <Field label="Profile Photo" className="sm:col-span-2">
                <label className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-300 cursor-pointer transition-colors">
                  {form.personal.profile_preview ? (
                    <img src={form.personal.profile_preview} alt="" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-400/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center"><Upload size={24} className="text-slate-400" /></div>
                  )}
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-semibold text-slate-700">Upload profile photo</p>
                    <p className="text-[11px] text-slate-400">JPEG, PNG — max 5MB</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    patch("personal", { profile_photo: f, profile_preview: URL.createObjectURL(f) });
                  }} />
                </label>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee ID" hint="Auto-generated — editable">
                <div className="flex gap-2">
                  <input className={`${inputCls} font-mono`} value={form.professional.employee_id} onChange={(e) => patch("professional", { employee_id: e.target.value })} />
                  <button type="button" onClick={() => patch("professional", { employee_id: generateEmployeeId() })} className="shrink-0 px-3 rounded-xl border border-slate-200 hover:bg-slate-50">
                    <RefreshCw size={16} />
                  </button>
                </div>
              </Field>
              <Field label="Joining Date">
                <input type="date" className={inputCls} value={form.professional.joining_date} onChange={(e) => patch("professional", { joining_date: e.target.value })} />
              </Field>
              <Field label="Contract Type">
                <select className={inputCls} value={form.professional.contract_type} onChange={(e) => patch("professional", { contract_type: e.target.value })}>
                  {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Department" required>
                <select className={inputCls} value={form.professional.department} onChange={(e) => patch("professional", { department: e.target.value })}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errors.department && <p className="text-[10px] text-red-500 mt-1">{errors.department}</p>}
              </Field>
              <Field label="Qualification" className="sm:col-span-2">
                <input className={inputCls} value={form.professional.qualification} onChange={(e) => patch("professional", { qualification: e.target.value })} />
              </Field>
              <Field label="Experience (Years)">
                <input type="number" min="0" className={inputCls} value={form.professional.experience_years} onChange={(e) => patch("professional", { experience_years: e.target.value })} />
              </Field>
              <Field label="Working Status">
                <select className={inputCls} value={form.professional.working_status} onChange={(e) => patch("professional", { working_status: e.target.value })}>
                  {WORKING_STATUSES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
              <Field label="Role / Position" required className="sm:col-span-2">
                <select
                  className={inputCls}
                  value={form.professional.role_code === "CUSTOM" ? "OTHER" : form.professional.role_code}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "OTHER") {
                      setOtherRoleOpen(true);
                      patch("professional", { role_code: "CUSTOM" });
                    } else if (v.startsWith("custom_")) {
                      const name = v.slice(7);
                      patch("professional", {
                        role_code: "CUSTOM",
                        custom_role_name: name,
                        role_label: name,
                      });
                    } else {
                      const opt = HR_ROLE_OPTIONS.find((r) => r.code === v);
                      patch("professional", { role_code: v, role_label: opt?.label || v, custom_role_name: "" });
                    }
                  }}
                >
                  {HR_ROLE_OPTIONS.filter((r) => !r.isOther).map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                  <option value="OTHER">Other Role…</option>
                  {form.professional.custom_roles.map((r) => (
                    <option key={r} value={`custom_${r}`}>{r}</option>
                  ))}
                </select>
                {form.professional.role_code === "CUSTOM" && form.professional.custom_role_name && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-1.5 flex items-center gap-1">
                    <Check size={12} /> {form.professional.custom_role_name}
                  </p>
                )}
                {errors.custom_role && <p className="text-[10px] text-red-500 mt-1">{errors.custom_role}</p>}
                {otherRoleOpen && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row gap-2">
                    <input className={inputCls} placeholder="Enter new role name" value={newRoleInput} onChange={(e) => setNewRoleInput(e.target.value)} />
                    <button type="button" onClick={addCustomRole} className="px-4 py-2 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold shrink-0">Add Role</button>
                    <button type="button" onClick={() => setOtherRoleOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold shrink-0">Cancel</button>
                  </div>
                )}
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Basic Salary" required>
                  <input type="number" className={inputCls} value={form.salary.basic_salary} onChange={(e) => patch("salary", { basic_salary: e.target.value })} />
                  {errors.basic_salary && <p className="text-[10px] text-red-500 mt-1">{errors.basic_salary}</p>}
                </Field>
                <Field label="Currency">
                  <select className={inputCls} value={form.salary.currency} onChange={(e) => patch("salary", { currency: e.target.value })}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Payment Frequency">
                  <select className={inputCls} value={form.salary.payment_frequency} onChange={(e) => patch("salary", { payment_frequency: e.target.value })}>
                    {PAYMENT_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.salary.apply_tax} onChange={(e) => patch("salary", { apply_tax: e.target.checked })} className="rounded border-slate-300 text-amber-500" />
                Apply Tax
              </label>
              {form.salary.apply_tax && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Field label="Tax %"><input className={inputCls} value={form.salary.tax_percent} onChange={(e) => patch("salary", { tax_percent: e.target.value })} /></Field>
                  <Field label="RSSB"><input className={inputCls} value={form.salary.rssb} onChange={(e) => patch("salary", { rssb: e.target.value })} /></Field>
                  <Field label="PAYE"><input className={inputCls} value={form.salary.paye} onChange={(e) => patch("salary", { paye: e.target.value })} /></Field>
                  <Field label="Housing Ded."><input className={inputCls} value={form.salary.housing_deduction} onChange={(e) => patch("salary", { housing_deduction: e.target.value })} /></Field>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Allowances</h4>
                  <button type="button" onClick={addAllowance} className="text-xs font-bold text-amber-700 flex items-center gap-1"><Plus size={14} /> Add Allowance</button>
                </div>
                {form.salary.allowances.map((a, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input className={`${inputCls} col-span-5`} placeholder="Name" value={a.name} onChange={(e) => {
                      const arr = [...form.salary.allowances]; arr[i] = { ...a, name: e.target.value }; patch("salary", { allowances: arr });
                    }} />
                    <input className={`${inputCls} col-span-3`} placeholder="Amount" value={a.amount} onChange={(e) => {
                      const arr = [...form.salary.allowances]; arr[i] = { ...a, amount: e.target.value }; patch("salary", { allowances: arr });
                    }} />
                    <select className={`${inputCls} col-span-3`} value={a.type} onChange={(e) => {
                      const arr = [...form.salary.allowances]; arr[i] = { ...a, type: e.target.value }; patch("salary", { allowances: arr });
                    }}>
                      <option>Fixed</option><option>Percentage</option>
                    </select>
                    <button type="button" className="col-span-1 flex items-center justify-center text-red-500" onClick={() => patch("salary", { allowances: form.salary.allowances.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800">Deductions</h4>
                  <button type="button" onClick={addDeduction} className="text-xs font-bold text-amber-700 flex items-center gap-1"><Plus size={14} /> Add Deduction</button>
                </div>
                {form.salary.deductions.map((d, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                    <input className={`${inputCls} col-span-5`} placeholder="Name" value={d.name} onChange={(e) => {
                      const arr = [...form.salary.deductions]; arr[i] = { ...d, name: e.target.value }; patch("salary", { deductions: arr });
                    }} />
                    <input className={`${inputCls} col-span-3`} placeholder="Amount" value={d.amount} onChange={(e) => {
                      const arr = [...form.salary.deductions]; arr[i] = { ...d, amount: e.target.value }; patch("salary", { deductions: arr });
                    }} />
                    <select className={`${inputCls} col-span-3`} value={d.type} onChange={(e) => {
                      const arr = [...form.salary.deductions]; arr[i] = { ...d, type: e.target.value }; patch("salary", { deductions: arr });
                    }}>
                      <option>Fixed</option><option>Percentage</option>
                    </select>
                    <button type="button" className="col-span-1 flex items-center justify-center text-red-500" onClick={() => patch("salary", { deductions: form.salary.deductions.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Basic Salary", salarySummary.basic],
                  ["Total Allowances", salarySummary.totalAllowances],
                  ["Total Deductions", salarySummary.totalDeductions],
                  ["Net Salary", salarySummary.net],
                ].map(([label, val]) => (
                  <div key={label} className={`rounded-2xl p-3 border ${label === "Net Salary" ? "bg-[#000435] text-white border-[#000435]" : "bg-white border-slate-200"}`}>
                    <p className={`text-[10px] font-bold uppercase ${label === "Net Salary" ? "text-amber-400" : "text-slate-400"}`}>{label}</p>
                    <p className="text-base font-black mt-1">{formatCurrency(val, form.salary.currency)}</p>
                  </div>
                ))}
              </div>
              <Field label="Payment Method">
                <select className={inputCls} value={form.salary.payment_method} onChange={(e) => patch("salary", { payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              {form.salary.payment_method === "Bank Transfer" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Bank Name"><input className={inputCls} value={form.salary.bank_name} onChange={(e) => patch("salary", { bank_name: e.target.value })} /></Field>
                  <Field label="Account Number"><input className={inputCls} value={form.salary.account_number} onChange={(e) => patch("salary", { account_number: e.target.value })} /></Field>
                  <Field label="Account Holder"><input className={inputCls} value={form.salary.account_holder} onChange={(e) => patch("salary", { account_holder: e.target.value })} /></Field>
                </div>
              )}
              {form.salary.payment_method === "Mobile Money" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="MoMo Provider">
                    <select className={inputCls} value={form.salary.momo_provider} onChange={(e) => patch("salary", { momo_provider: e.target.value })}>
                      {MOMO_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Phone Number"><input className={inputCls} value={form.salary.momo_phone} onChange={(e) => patch("salary", { momo_phone: e.target.value })} /></Field>
                </div>
              )}
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.salary.allow_advance}
                    onChange={(e) => patch("salary", { allow_advance: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span>
                    <span className="text-sm font-bold text-slate-800 block">Allowed to take Shule Avance</span>
                    <span className="text-[11px] text-slate-500 leading-snug">
                      When enabled, this staff member can request salary advances through Shule Avance.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <strong>Optional step</strong> — upload documents now or skip and add them later. Files are stored in your draft until staff is created.
              </p>
              {DOCUMENT_SLOTS.map((slot) => (
                <div key={slot.key}>
                  <p className="text-xs font-bold text-slate-600 mb-2">{slot.label}</p>
                  <label
                    className="block p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-300 transition-colors cursor-pointer text-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDocDrop(slot.key, e.dataTransfer.files); }}
                  >
                    <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                    <p className="text-[11px] text-slate-500">Drag & drop or click — PDF, JPEG, PNG</p>
                    <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => handleDocDrop(slot.key, e.target.files)} />
                  </label>
                  {(form.documents[slot.key] || []).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {form.documents[slot.key].map((f, i) => (
                        <li key={i} className="text-[11px] text-slate-600 flex items-center gap-2">
                          <Check size={12} className="text-emerald-500" /> {f.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <button type="button" onClick={autoFillAccount} className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                <Sparkles size={14} /> Auto-fill username{form.account.no_email ? "" : " & email"}
              </button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.account.no_email}
                    onChange={(e) => {
                      const noEmail = e.target.checked;
                      patch("account", {
                        no_email: noEmail,
                        email: noEmail ? "" : form.account.email,
                        send_credentials_email: noEmail ? false : form.account.send_credentials_email,
                        set_password_manually: noEmail ? true : form.account.set_password_manually,
                        auto_generate_password: noEmail ? false : form.account.auto_generate_password,
                      });
                    }}
                    className="mt-0.5 rounded border-slate-300 text-amber-500"
                  />
                  <span>
                    <span className="text-sm font-bold text-slate-800 block">Staff has no email</span>
                    <span className="text-[11px] text-slate-500">Use username + manual password to sign in.</span>
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Username" required>
                  <input className={`${inputCls} font-mono`} value={form.account.username} onChange={(e) => patch("account", { username: e.target.value })} />
                  {errors.username && <p className="text-[10px] text-red-500 mt-1">{errors.username}</p>}
                </Field>
                {!form.account.no_email && (
                  <Field label="Email Address" hint="Optional if set on personal step">
                    <input
                      type="email"
                      className={inputCls}
                      value={form.account.email}
                      onChange={(e) => patch("account", { email: e.target.value })}
                      placeholder={form.personal.email || "name@school.rw"}
                    />
                    {errors.email && <p className="text-[10px] text-red-500 mt-1">{errors.email}</p>}
                  </Field>
                )}
              </div>

              <Field label="RFID card UID" hint="For gate morning & evening attendance (Smart Access)">
                <input
                  className={`${inputCls} font-mono uppercase`}
                  value={form.account.rfid_uid}
                  onChange={(e) => patch("account", { rfid_uid: e.target.value.toUpperCase() })}
                  placeholder="e.g. A1B2C3D4"
                />
              </Field>

              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.account.set_password_manually || !!form.account.no_email}
                    disabled={!!form.account.no_email}
                    onChange={(e) => {
                      const manual = e.target.checked;
                      patch("account", {
                        set_password_manually: manual,
                        auto_generate_password: !manual,
                        send_credentials_email: manual ? false : form.account.send_credentials_email,
                      });
                    }}
                    className="mt-0.5 rounded border-slate-300 text-amber-500 disabled:opacity-60"
                  />
                  <span>
                    <span className="text-sm font-bold text-slate-800 block">Set password manually</span>
                    <span className="text-[11px] text-slate-500">
                      {form.account.no_email
                        ? "Required when staff has no email — share the password in person or by phone."
                        : "Choose a password yourself instead of auto-generating one."}
                    </span>
                  </span>
                </label>
                {(form.account.set_password_manually || form.account.no_email || !form.account.auto_generate_password) && (
                  <div className="space-y-3 pt-1 border-t border-amber-200/50">
                    <button
                      type="button"
                      onClick={fillGeneratedPassword}
                      className="text-xs font-bold text-amber-800 bg-white border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50"
                    >
                      Generate strong password
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Password" required>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} className={inputCls} value={form.account.password} onChange={(e) => patch("account", { password: e.target.value })} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw((v) => !v)}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${pwStrength.color} transition-all`} style={{ width: `${(pwStrength.score + 1) * 20}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{pwStrength.label}</p>
                    {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
                  </Field>
                  <Field label="Confirm Password" required>
                    <input type="password" className={inputCls} value={form.account.confirm_password} onChange={(e) => patch("account", { confirm_password: e.target.value })} />
                    {errors.confirm_password && <p className="text-[10px] text-red-500 mt-1">{errors.confirm_password}</p>}
                  </Field>
                    </div>
                  </div>
                )}
                {!form.account.set_password_manually && !form.account.no_email && form.account.auto_generate_password && (
                  <p className="text-[11px] text-slate-500">
                    Password will be generated automatically
                    {form.account.send_credentials_email ? " and emailed to the staff member." : "."}
                  </p>
                )}
              </div>
              <Field label="Account Status">
                <select className={inputCls} value={form.account.account_status} onChange={(e) => patch("account", { account_status: e.target.value })}>
                  <option>Active</option><option>Disabled</option>
                </select>
              </Field>
              {!form.account.no_email && !form.account.set_password_manually && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.account.send_credentials_email}
                    onChange={(e) => patch("account", { send_credentials_email: e.target.checked })}
                    className="rounded"
                  />
                  Send login credentials by email
                </label>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              {[
                {
                  title: "Personal Information",
                  rows: [
                    ["Name", `${form.personal.first_name} ${form.personal.last_name}`],
                    ["Phone", form.personal.phone],
                    ["Email", form.personal.email || form.account.email],
                    ["National ID", form.personal.national_id || "—"],
                    ["Age", age != null ? `${age} years` : "—"],
                  ],
                },
                {
                  title: "Professional Information",
                  rows: [
                    ["Employee ID", form.professional.employee_id],
                    ["Department", form.professional.department],
                    ["Role", roleLabelForCode(form.professional.role_code, form.professional.custom_role_name || form.professional.role_label)],
                    ["Status", form.professional.working_status],
                  ],
                },
                {
                  title: "Payroll",
                  rows: [
                    ["Net Salary", formatCurrency(salarySummary.net, form.salary.currency)],
                    ["Payment", form.salary.payment_method],
                    ["Shule Avance", form.salary.allow_advance ? "Allowed" : "Not allowed"],
                  ],
                },
                {
                  title: "Account",
                  rows: [
                    ["Username", form.account.username],
                    ["RFID UID", form.account.rfid_uid || "—"],
                    ["Email", form.account.no_email ? "No email (username login)" : (form.account.email || form.personal.email || "—")],
                    ["Password", form.account.set_password_manually || form.account.no_email ? "Set manually" : "Auto-generated"],
                    ["Status", form.account.account_status],
                  ],
                },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-[#000435] mb-3">{card.title}</h4>
                  <dl className="space-y-1.5">
                    {card.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-sm">
                        <dt className="text-slate-500 font-medium">{k}</dt>
                        <dd className="font-semibold text-slate-800 text-right">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle size={12} />
                Documents: {(Object.values(form.documents).flat().length) || 0} file(s) attached in draft
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-2">
          {step > 1 && (
            <button type="button" onClick={goPrev} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-white">
              <ChevronLeft size={16} /> Previous
            </button>
          )}
          <button type="button" onClick={handleSaveDraft} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 text-sm font-bold text-amber-800 hover:bg-amber-50">
            <Save size={16} /> Save Draft
          </button>
          <div className="flex-1" />
          {step === 4 && (
            <button type="button" onClick={() => setStep(5)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 px-3">
              Skip documents →
            </button>
          )}
          {step < 6 ? (
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-sm font-bold hover:bg-amber-300 shadow-md">
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <>
              <button type="button" onClick={() => window.print()} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
                <Printer size={16} /> Print Preview
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSubmit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#000435] text-amber-400 text-sm font-bold hover:bg-[#000a50] disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Submit Staff
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
