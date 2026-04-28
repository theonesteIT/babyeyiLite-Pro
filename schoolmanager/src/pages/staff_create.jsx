import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createStaff, listStaff, updateStaff, uploadStaffPhoto } from '../services/staffApi';

const STEPS = ['Personal Information', 'Employment Details', 'Department & Role Assignment', 'Payroll Setup', 'Account Setup', 'Review & Save'];
const DEPARTMENTS = ['Academics', 'Administration', 'Finance', 'Discipline', 'HR', 'ICT', 'Library', 'Store', 'Other'];
const ROLES = ['Teacher', 'Accountant', 'HR', 'DOS', 'Stock Manager', 'Librarian', 'Head of Discipline', 'Secretary', 'Staff'];
const ROLE_CODE_MAP = {
  Teacher: 'TEACHER',
  Accountant: 'ACCOUNTANT',
  HR: 'HR',
  DOS: 'DOS',
  'Stock Manager': 'STORE_MANAGER',
  Librarian: 'LIBRARIAN',
  'Head of Discipline': 'DISCIPLINE',
  Secretary: 'SECRETARY',
  Staff: 'HOD',
};

const emptyForm = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  nationalId: '',
  passportNumber: '',
  phone: '',
  email: '',
  address: '',
  profilePhoto: null,
  profilePhotoPreview: '',
  staffId: '',
  employmentType: 'Full-time',
  jobTitle: '',
  dateOfEmployment: '',
  contractStartDate: '',
  contractEndDate: '',
  status: 'Active',
  department: 'Academics',
  subDepartment: '',
  role: 'Teacher',
  basicSalary: '',
  transportAllowance: '',
  housingAllowance: '',
  mealAllowance: '',
  otherAllowances: [{ label: '', amount: '' }],
  taxPercent: '',
  pension: '',
  otherDeductions: [{ label: '', amount: '' }],
  paymentFrequency: 'Monthly',
  paymentMethod: 'Bank Transfer',
  bankName: '',
  accountNumber: '',
  mobileMoneyPhone: '',
  partTimeRate: '',
  partTimeRateUnit: 'hour',
  allowAdvance: false,
  maxAdvanceLimit: '',
  advanceDeductionType: 'percent',
  advanceDeductionValue: '',
  createLoginAccount: true,
  username: '',
  password: '',
  confirmPassword: '',
};

function toNumberOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function StaffCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editingId = searchParams.get('id');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [existingStaff, setExistingStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const rows = await listStaff();
        setExistingStaff(rows);
      } catch {
        setExistingStaff([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!existingStaff.length) return;
    if (editingId) {
      const row = existingStaff.find((s) => String(s.id) === String(editingId));
      if (!row) return;
      setForm((prev) => ({
        ...prev,
        fullName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        gender: row.gender || '',
        dateOfBirth: row.date_of_birth || '',
        nationalId: row.national_id || '',
        passportNumber: row.passport_number || '',
        phone: row.phone || '',
        email: row.email || '',
        address: row.address || '',
        profilePhotoPreview: row.photo || '',
        staffId: row.staff_id || '',
        employmentType: row.employment_type || 'Full-time',
        jobTitle: row.job_title || '',
        dateOfEmployment: row.date_of_employment || '',
        contractStartDate: row.contract_start_date || '',
        contractEndDate: row.contract_end_date || '',
        status: row.employment_status || 'Active',
        department: row.department || 'Academics',
        subDepartment: row.sub_department || '',
        role: Object.keys(ROLE_CODE_MAP).find((k) => ROLE_CODE_MAP[k] === row.role_code) || 'Teacher',
        basicSalary: row.payroll_basic_salary ?? '',
        transportAllowance: row.payroll_transport_allowance ?? '',
        housingAllowance: row.payroll_housing_allowance ?? '',
        mealAllowance: row.payroll_meal_allowance ?? '',
        taxPercent: row.payroll_tax_percent ?? '',
        pension: row.payroll_pension_amount ?? '',
        paymentFrequency: row.payroll_payment_frequency || 'Monthly',
        paymentMethod: row.payroll_payment_method || 'Bank Transfer',
        bankName: row.payroll_bank_name || '',
        accountNumber: row.payroll_account_number || '',
        mobileMoneyPhone: row.payroll_mobile_money_phone || '',
        partTimeRate: row.payroll_part_time_rate ?? '',
        partTimeRateUnit: row.payroll_part_time_unit || 'hour',
        allowAdvance: !!row.allow_advance,
        maxAdvanceLimit: row.max_advance_limit ?? '',
        advanceDeductionType: row.advance_deduction_type || 'percent',
        advanceDeductionValue: row.advance_deduction_value ?? '',
        createLoginAccount: row.account_enabled !== 0,
        username: row.staff_login_username || row.username || '',
      }));
      return;
    }
    setForm((prev) => {
      if (prev.staffId) return prev;
      const nextId = String(existingStaff.length + 1).padStart(3, '0');
      return { ...prev, staffId: `STF-${new Date().getFullYear()}-${nextId}` };
    });
  }, [existingStaff, editingId]);

  const duplicate = useMemo(() => {
    const currentId = editingId ? Number(editingId) : null;
    const sameId = existingStaff.find((s) => s.national_id && form.nationalId && s.national_id === form.nationalId && s.id !== currentId);
    const sameEmail = existingStaff.find((s) => s.email && form.email && String(s.email).toLowerCase() === String(form.email).toLowerCase() && s.id !== currentId);
    return { sameId, sameEmail };
  }, [existingStaff, form.nationalId, form.email, editingId]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!form.fullName || !form.email || !form.phone || !form.gender || !form.nationalId) {
        return 'Fill all required personal fields.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Invalid email format.';
      if (!/^[+]?[\d\s-]{9,20}$/.test(form.phone)) return 'Invalid phone number format.';
      if (duplicate.sameId) return 'National ID/Passport already exists.';
      if (duplicate.sameEmail) return 'Email already exists.';
    }
    if (step === 1) {
      if (!form.staffId || !form.jobTitle || !form.dateOfEmployment) return 'Complete employment details.';
      if (form.employmentType === 'Contract' && (!form.contractStartDate || !form.contractEndDate)) return 'Contract staff requires start and end dates.';
    }
    if (step === 2) {
      if (!form.department || !form.role) return 'Select department and role.';
    }
    if (step === 4 && form.createLoginAccount) {
      if (!form.username) return 'Username is required for account setup.';
      if (!editingId && form.password.length < 8) return 'Password must be at least 8 characters.';
      if (!editingId && form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    return '';
  };

  const onNext = () => {
    const err = validateStep();
    if (err) return setError(err);
    next();
  };

  const photoToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const save = async () => {
    setError('');
    setInfo('');
    const err = validateStep();
    if (err) return setError(err);
    setLoading(true);
    try {
      const [first_name, ...others] = form.fullName.trim().split(/\s+/);
      const last_name = others.join(' ') || '-';
      const payload = {
        first_name,
        last_name,
        full_name: form.fullName,
        gender: form.gender,
        date_of_birth: form.dateOfBirth || null,
        national_id: form.nationalId || null,
        passport_number: form.passportNumber || null,
        phone: form.phone,
        email: form.email,
        address: form.address || null,
        staff_id: form.staffId,
        employment_type: form.employmentType,
        job_title: form.jobTitle,
        date_of_employment: form.dateOfEmployment,
        contract_start_date: form.employmentType === 'Contract' ? form.contractStartDate : null,
        contract_end_date: form.employmentType === 'Contract' ? form.contractEndDate : null,
        employment_status: form.status,
        department: form.department,
        sub_department: form.subDepartment || null,
        role_code: ROLE_CODE_MAP[form.role] || 'TEACHER',
        payroll_basic_salary: toNumberOrNull(form.basicSalary),
        payroll_transport_allowance: toNumberOrNull(form.transportAllowance),
        payroll_housing_allowance: toNumberOrNull(form.housingAllowance),
        payroll_meal_allowance: toNumberOrNull(form.mealAllowance),
        payroll_other_allowances: form.otherAllowances.filter((a) => a.label || a.amount),
        payroll_tax_percent: toNumberOrNull(form.taxPercent),
        payroll_pension_amount: toNumberOrNull(form.pension),
        payroll_other_deductions: form.otherDeductions.filter((d) => d.label || d.amount),
        payroll_payment_frequency: form.paymentFrequency,
        payroll_payment_method: form.paymentMethod,
        payroll_bank_name: form.paymentMethod === 'Bank Transfer' ? form.bankName : null,
        payroll_account_number: form.paymentMethod === 'Bank Transfer' ? form.accountNumber : null,
        payroll_mobile_money_phone: form.paymentMethod === 'Mobile Money' ? form.mobileMoneyPhone : null,
        payroll_part_time_rate: form.employmentType === 'Part-time' ? toNumberOrNull(form.partTimeRate) : null,
        payroll_part_time_unit: form.employmentType === 'Part-time' ? form.partTimeRateUnit : null,
        allow_advance: form.allowAdvance,
        max_advance_limit: form.allowAdvance ? toNumberOrNull(form.maxAdvanceLimit) : null,
        advance_deduction_type: form.allowAdvance ? form.advanceDeductionType : null,
        advance_deduction_value: form.allowAdvance ? toNumberOrNull(form.advanceDeductionValue) : null,
        account_enabled: form.createLoginAccount,
        username: form.username || `${first_name}.${last_name}`.toLowerCase().replace(/\s+/g, ''),
      };
      if (form.createLoginAccount && !editingId) payload.password = form.password;

      const response = editingId ? await updateStaff(editingId, payload) : await createStaff(payload);
      const userId = editingId || response?.data?.id;
      if (form.profilePhoto && userId) {
        const base64 = await photoToBase64(form.profilePhoto);
        const mime = form.profilePhoto.type || 'image/jpeg';
        await uploadStaffPhoto(userId, base64, mime);
      }
      setInfo('Staff saved successfully. Login credentials are prepared for dashboard access.');
      setTimeout(() => navigate('/staff'), 1000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save staff.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, key, type = 'text', required = false) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-slate-600">{label}{required ? ' *' : ''}</span>
      <input type={type} className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" value={form[key] ?? ''} onChange={(e) => updateField(key, e.target.value)} />
    </label>
  );

  const renderContent = () => {
    if (step === 0) {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderInput('Full Name', 'fullName', 'text', true)}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Gender *</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.gender} onChange={(e) => updateField('gender', e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option></select></label>
        {renderInput('Date of Birth', 'dateOfBirth', 'date')}
        {renderInput('National ID / Passport', 'nationalId', 'text', true)}
        {renderInput('Phone Number', 'phone', 'text', true)}
        {renderInput('Email', 'email', 'email', true)}
        {renderInput('Address', 'address')}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Profile Photo</span><input type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          updateField('profilePhoto', file);
          updateField('profilePhotoPreview', URL.createObjectURL(file));
        }} />
          {form.profilePhotoPreview ? <img src={form.profilePhotoPreview} alt="preview" className="w-20 h-20 object-cover rounded-md border border-slate-200 mt-2" /> : null}
        </label>
      </div>;
    }
    if (step === 1) {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderInput('Staff ID', 'staffId', 'text', true)}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Employment Type *</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.employmentType} onChange={(e) => updateField('employmentType', e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option></select></label>
        {renderInput('Job Title', 'jobTitle', 'text', true)}
        {renderInput('Date of Employment', 'dateOfEmployment', 'date', true)}
        {form.employmentType === 'Contract' ? renderInput('Contract Start Date', 'contractStartDate', 'date', true) : null}
        {form.employmentType === 'Contract' ? renderInput('Contract End Date', 'contractEndDate', 'date', true) : null}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Status</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.status} onChange={(e) => updateField('status', e.target.value)}><option>Active</option><option>On Leave</option><option>Suspended</option></select></label>
      </div>;
    }
    if (step === 2) {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Department *</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.department} onChange={(e) => updateField('department', e.target.value)}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></label>
        {renderInput('Sub-department', 'subDepartment')}
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Role *</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.role} onChange={(e) => updateField('role', e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
      </div>;
    }
    if (step === 3) {
      const editList = (name, idx, key, value) => {
        const list = [...form[name]];
        list[idx] = { ...list[idx], [key]: value };
        updateField(name, list);
      };
      return <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput('Basic Salary', 'basicSalary', 'number')}
          {renderInput('Transport', 'transportAllowance', 'number')}
          {renderInput('Housing', 'housingAllowance', 'number')}
          {renderInput('Meal', 'mealAllowance', 'number')}
          {renderInput('Tax (%)', 'taxPercent', 'number')}
          {renderInput('Pension', 'pension', 'number')}
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Payment Frequency</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.paymentFrequency} onChange={(e) => updateField('paymentFrequency', e.target.value)}><option>Monthly</option><option>Weekly</option></select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Payment Method</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)}><option>Bank Transfer</option><option>Mobile Money</option></select></label>
          {form.paymentMethod === 'Bank Transfer' ? renderInput('Bank Name', 'bankName') : renderInput('Mobile Money Phone', 'mobileMoneyPhone')}
          {form.paymentMethod === 'Bank Transfer' ? renderInput('Account Number', 'accountNumber') : null}
          {form.employmentType === 'Part-time' ? renderInput('Part-time Rate', 'partTimeRate', 'number') : null}
          {form.employmentType === 'Part-time' ? <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Rate Unit</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.partTimeRateUnit} onChange={(e) => updateField('partTimeRateUnit', e.target.value)}><option value="hour">Per Hour</option><option value="session">Per Session</option></select></label> : null}
        </div>
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Other Allowances</h4><button className="text-xs text-primary flex items-center gap-1" onClick={() => updateField('otherAllowances', [...form.otherAllowances, { label: '', amount: '' }])}><Plus size={14} /> Add</button></div>
          {form.otherAllowances.map((item, idx) => <div key={`oa-${idx}`} className="grid grid-cols-5 gap-2"><input className="col-span-3 border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Allowance name" value={item.label} onChange={(e) => editList('otherAllowances', idx, 'label', e.target.value)} /><input type="number" className="col-span-1 border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Amount" value={item.amount} onChange={(e) => editList('otherAllowances', idx, 'amount', e.target.value)} /><button className="text-red-500" onClick={() => updateField('otherAllowances', form.otherAllowances.filter((_, i) => i !== idx))}><Trash2 size={14} /></button></div>)}
        </div>
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2"><input type="checkbox" checked={form.allowAdvance} onChange={(e) => updateField('allowAdvance', e.target.checked)} /><span className="text-sm font-semibold">Allow Advance / Loan</span></div>
          {form.allowAdvance ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{renderInput('Max Advance Limit', 'maxAdvanceLimit', 'number')}<label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-600">Deduction Type</span><select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.advanceDeductionType} onChange={(e) => updateField('advanceDeductionType', e.target.value)}><option value="percent">Percent</option><option value="fixed">Fixed</option></select></label>{renderInput('Deduction Value', 'advanceDeductionValue', 'number')}</div> : null}
        </div>
      </div>;
    }
    if (step === 4) {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.createLoginAccount} onChange={(e) => updateField('createLoginAccount', e.target.checked)} /><span className="text-sm font-semibold">Create login account</span></label>
        <div />
        {form.createLoginAccount ? <>{renderInput('Username', 'username', 'text', true)}{renderInput('Password', 'password', 'password', !editingId)}{renderInput('Confirm Password', 'confirmPassword', 'password', !editingId)}</> : null}
      </div>;
    }
    return <div className="space-y-3 text-sm">
      <p><strong>Personal:</strong> {form.fullName} | {form.email} | {form.phone}</p>
      <p><strong>Employment:</strong> {form.staffId} | {form.employmentType} | {form.jobTitle} | {form.status}</p>
      <p><strong>Department & Role:</strong> {form.department}{form.subDepartment ? ` / ${form.subDepartment}` : ''} | {form.role}</p>
      <p><strong>Payroll:</strong> Basic {form.basicSalary || 0}, {form.paymentFrequency}, {form.paymentMethod}</p>
      <p><strong>Account:</strong> {form.createLoginAccount ? `Enabled (${form.username || 'auto'})` : 'Disabled'}</p>
      <p className="text-xs text-slate-500">After save, credentials are sent by email and role determines dashboard route (Teacher, Accountant, DOS, Stock Manager, Librarian, Head of Discipline, Secretary, etc.).</p>
    </div>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-auto">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/staff" className="text-slate-500 hover:text-primary"><ArrowLeft size={18} /></Link>
          <h1 className="text-lg font-bold text-slate-800">HR Central - {editingId ? 'Edit Staff' : 'Add New Staff'}</h1>
        </div>
        <button disabled={loading} onClick={save} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 disabled:opacity-60"><Save size={15} /> {loading ? 'Saving...' : 'Save Staff'}</button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {STEPS.map((s, i) => <button key={s} onClick={() => setStep(i)} className={`text-xs px-2 py-2 rounded border ${step === i ? 'bg-primary text-white border-primary' : i < step ? 'bg-primary/10 text-primary border-primary/30' : 'bg-white text-slate-500 border-slate-200'}`}>{s}</button>)}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-800">{STEPS[step]}</h2>
          {renderContent()}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {info ? <p className="text-sm text-emerald-600">{info}</p> : null}
          <div className="flex justify-between pt-2">
            <button onClick={back} disabled={step === 0} className="px-3 py-2 rounded border border-slate-300 text-sm disabled:opacity-50">Back</button>
            {step < STEPS.length - 1 ? <button onClick={onNext} className="px-3 py-2 rounded bg-primary text-white text-sm">Next</button> : <button onClick={save} disabled={loading} className="px-3 py-2 rounded bg-primary text-white text-sm disabled:opacity-50">Review & Save</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
