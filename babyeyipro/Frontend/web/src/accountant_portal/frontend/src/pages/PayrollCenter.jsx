import { useEffect, useMemo, useState } from 'react';
import { Download, Mail, Printer, Search, UserPlus, X } from 'lucide-react';
import api from '../services/api';

function formatMoney(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

const roleTemplates = {
  Teacher: { basic: 320000, allowance: 40000 },
  Admin: { basic: 280000, allowance: 30000 },
  Accountant: { basic: 450000, allowance: 60000 },
};

const seedStaff = [];

function RegisterStaffModal({ open, onClose, onSubmit, nextStaffCode }) {
  const [step, setStep] = useState(1);
  const [extraAllowances, setExtraAllowances] = useState([{ key: 'Other', amount: '' }]);
  const [form, setForm] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    photo: null,
    role: 'Teacher',
    department: '',
    employmentType: 'Full-time',
    dateOfEmployment: '',
    status: 'Active',
    basicSalary: '',
    transport: '',
    housing: '',
    paymentMethod: 'Bank',
    accountNumber: '',
    momoPhone: '',
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setExtraAllowances([{ key: 'Other', amount: '' }]);
    setForm({
      fullName: '', gender: '', dateOfBirth: '', phone: '', email: '', photo: null,
      role: 'Teacher', department: '', employmentType: 'Full-time', dateOfEmployment: '', status: 'Active',
      basicSalary: '', transport: '', housing: '', paymentMethod: 'Bank', accountNumber: '', momoPhone: '',
    });
  }, [open]);

  if (!open) return null;

  const computedAllowance =
    Number(form.transport || 0) +
    Number(form.housing || 0) +
    extraAllowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const payload = {
    fullName: form.fullName.trim(),
    gender: form.gender,
    dateOfBirth: form.dateOfBirth,
    phone: form.phone.trim(),
    email: form.email.trim(),
    role: form.role,
    department: form.department.trim(),
    contractType: form.employmentType,
    employedAt: form.dateOfEmployment,
    status: form.status,
    basicSalary: Number(form.basicSalary || 0),
    allowances: computedAllowance,
    paymentMethod: form.paymentMethod,
    accountDetails: form.paymentMethod === 'Bank' ? form.accountNumber.trim() : form.momoPhone.trim(),
    staffCode: nextStaffCode,
    photo: form.photo,
  };

  const canNext =
    (step === 1 && payload.fullName && payload.gender && payload.phone && payload.email) ||
    (step === 2 && payload.department && payload.employedAt) ||
    (step === 3 && payload.basicSalary > 0);

  return (
    <div className="fixed inset-0 z-[240]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl border border-black/10 shadow-2xl">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#000435]">Staff Registration Wizard</p>
              <h3 className="text-lg font-black text-[#000435]">Step {step} of 4</h3>
            </div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl border border-black/10 flex items-center justify-center"><X size={14} /></button>
          </div>

          <div className="p-5">
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#000435]">STEP 1: Basic Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
                  <select className="h-10 rounded-xl border border-black/10 px-3" value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}><option value="">Gender</option><option>Male</option><option>Female</option></select>
                  <input type="date" className="h-10 rounded-xl border border-black/10 px-3" value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                  <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                  <input className="h-10 rounded-xl border border-black/10 px-3 md:col-span-2" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div className="h-16 w-16 rounded-full border border-black/10 bg-white overflow-hidden flex items-center justify-center text-[10px] font-bold text-[#000435]">
                      {form.photo?.name ? form.photo.name.slice(0, 2).toUpperCase() : 'IMG'}
                    </div>
                    <input type="file" accept="image/*" className="h-10 rounded-xl border border-black/10 px-3 py-2 text-xs" onChange={(e) => setForm((p) => ({ ...p, photo: e.target.files?.[0] || null }))} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#000435]">STEP 2: Work Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="h-10 rounded-xl border border-black/10 px-3 bg-white" readOnly value={nextStaffCode} />
                  <select className="h-10 rounded-xl border border-black/10 px-3" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}><option>Teacher</option><option>Accountant</option><option>Admin</option></select>
                  <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
                  <select className="h-10 rounded-xl border border-black/10 px-3" value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}><option>Full-time</option><option>Part-time</option></select>
                  <input type="date" className="h-10 rounded-xl border border-black/10 px-3" value={form.dateOfEmployment} onChange={(e) => setForm((p) => ({ ...p, dateOfEmployment: e.target.value }))} />
                  <select className="h-10 rounded-xl border border-black/10 px-3" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option>Active</option><option>Inactive</option></select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#000435]">STEP 3: Salary Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Basic Salary" value={form.basicSalary} onChange={(e) => setForm((p) => ({ ...p, basicSalary: e.target.value.replace(/[^\d]/g, '') }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Transport" value={form.transport} onChange={(e) => setForm((p) => ({ ...p, transport: e.target.value.replace(/[^\d]/g, '') }))} />
                    <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Housing" value={form.housing} onChange={(e) => setForm((p) => ({ ...p, housing: e.target.value.replace(/[^\d]/g, '') }))} />
                  </div>
                  {extraAllowances.map((item, idx) => (
                    <div key={`other-${idx}`} className="md:col-span-2 grid grid-cols-[1fr_auto] gap-2">
                      <input className="h-10 rounded-xl border border-black/10 px-3" placeholder={`Other allowance ${idx + 1}`} value={item.amount} onChange={(e) => setExtraAllowances((prev) => prev.map((x, i) => (i === idx ? { ...x, amount: e.target.value.replace(/[^\d]/g, '') } : x)))} />
                      <button className="h-10 px-3 rounded-xl border border-black/10 text-[10px] font-black uppercase" onClick={() => setExtraAllowances((prev) => [...prev, { key: 'Other', amount: '' }])}>Add</button>
                    </div>
                  ))}
                  <select className="h-10 rounded-xl border border-black/10 px-3" value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option>Bank</option><option>Mobile Money</option></select>
                  {form.paymentMethod === 'Bank' ? (
                    <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="Account Number" value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} />
                  ) : (
                    <input className="h-10 rounded-xl border border-black/10 px-3" placeholder="MoMo Phone Number" value={form.momoPhone} onChange={(e) => setForm((p) => ({ ...p, momoPhone: e.target.value }))} />
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-2 text-sm">
                <p className="text-xs font-black uppercase tracking-widest text-[#000435]">STEP 5: Review & Submit</p>
                <p><strong>Personal Info:</strong> {payload.fullName} · {payload.gender} · {payload.phone} · {payload.email}</p>
                <p><strong>Job Info:</strong> {payload.staffCode} · {payload.role} · {payload.department} · {payload.contractType} · {payload.status}</p>
                <p><strong>Salary:</strong> {formatMoney(payload.basicSalary)} basic + {formatMoney(payload.allowances)} allowances</p>
                <p><strong>Advance Rules:</strong> Deductions will include tax, pension, absence penalties, and loan/advance where available.</p>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-black/5 flex items-center justify-between">
            <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="h-10 px-4 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest">
              Back
            </button>
            {step < 4 ? (
              <button disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="h-10 px-4 rounded-xl bg-[#000435] text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
                Next
              </button>
            ) : (
              <button onClick={() => onSubmit(payload)} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest">
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollCenter() {
  const [tab, setTab] = useState('staff');
  const [staff, setStaff] = useState(seedStaff);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [taxRate, setTaxRate] = useState('3');
  const [pensionRate, setPensionRate] = useState('6');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusMap, setStatusMap] = useState({});
  const [slipStaff, setSlipStaff] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activePayrollRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff
      .filter((s) => s.status === 'Active')
      .filter((s) => (departmentFilter === 'All' ? true : s.department === departmentFilter))
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.staffId.toLowerCase().includes(q))
      .map((s) => {
        const grossSalary = Number(s.basicSalary) + Number(s.allowances);
        const tax = Math.round((grossSalary * Number(taxRate || 0)) / 100);
        const pension = Math.round((grossSalary * Number(pensionRate || 0)) / 100);
        const absencePenalty = 0;
        const loanAdvance = 0;
        const deductions = tax + pension + absencePenalty + loanAdvance;
        const netSalary = grossSalary - deductions;
        return { ...s, grossSalary, tax, pension, absencePenalty, loanAdvance, deductions, netSalary, paymentStatus: statusMap[s.staffId] || 'Pending' };
      });
  }, [staff, departmentFilter, search, taxRate, pensionRate, statusMap]);

  const nextStaffCode = useMemo(() => {
    const seq = String(staff.length + 1).padStart(3, '0');
    return `STF-${new Date().getFullYear()}-${seq}`;
  }, [staff.length]);

  const mapStaff = (s) => ({
    staffId: s.staffCode || s.staffId || `STF-${s.id || ''}`,
    fullName: s.fullName || s.name || 'Unknown',
    role: s.role || 'Staff',
    department: s.department || s.dept || 'General',
    phone: s.phone || '',
    email: s.email || '',
    contractType: s.contractType || 'Full-time',
    basicSalary: Number(s.basicSalary ?? s.salary?.basic ?? 0),
    allowances: Number(s.allowances ?? s.salary?.allowance ?? 0),
    paymentMethod: s.paymentMethod || 'Bank',
    accountDetails: s.accountDetails || '',
    dateOfEmployment: s.dateOfEmployment || s.employedAt || '',
    status: s.status || (s.active === false ? 'Inactive' : 'Active'),
  });

  const fetchStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.allSettled([api.get('/accountant/payroll/config'), api.get('/school/staff')]);
      const fromConfig = a.status === 'fulfilled' ? (a.value.data?.data?.staff || []) : [];
      const fromSchool = b.status === 'fulfilled' ? (b.value.data?.data || b.value.data || []) : [];
      const merged = [...fromConfig, ...fromSchool];
      setStaff(merged.map(mapStaff));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitRegistration = async (payload) => {
    try {
      setError('');
      const staffPayload = {
        full_name: payload.fullName,
        gender: payload.gender,
        date_of_birth: payload.dateOfBirth,
        phone: payload.phone,
        email: payload.email,
        role_name: payload.role,
        department: payload.department,
        employment_type: payload.contractType,
        date_of_employment: payload.employedAt,
        status: payload.status,
        staff_code: payload.staffCode,
      };
      const res = await api.post('/school/staff', staffPayload);
      const staffId = res?.data?.data?.id || res?.data?.data?.staff_id;

      if (payload.photo && staffId) {
        const fd = new FormData();
        fd.append('photo', payload.photo);
        await api.put(`/school/staff/${staffId}/identity/photo`, fd, { headers: { 'Content-Type': undefined } });
      }

      await api.post('/accountant/payroll', {
        staffUserId: staffId,
        basicSalary: payload.basicSalary,
        bonus: payload.allowances,
        deduction: 0,
        month: Number(month),
        year: Number(year),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentStatus: 'pending',
        paymentMethod: payload.paymentMethod === 'Mobile Money' ? 'Mobile Money' : 'Bank Transfer',
        note: `${payload.paymentMethod}: ${payload.accountDetails || ''}`,
      });
      setRegisterOpen(false);
      await fetchStaff();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to register staff');
    }
  };

  const bulkPayAll = () => {
    const updates = {};
    activePayrollRows.forEach((row) => { updates[row.staffId] = 'Paid'; });
    setStatusMap((prev) => ({ ...prev, ...updates }));
  };

  const savePayrollRow = async (row) => {
    try {
      await api.post('/accountant/payroll', {
        staffUserId: Number(String(row.staffId).replace(/[^\d]/g, '')) || undefined,
        basicSalary: row.basicSalary,
        bonus: row.allowances,
        deduction: row.deductions,
        month: Number(month),
        year: Number(year),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentStatus: row.paymentStatus?.toLowerCase() || 'pending',
        paymentMethod: row.paymentMethod === 'Mobile Money' ? 'Mobile Money' : 'Bank Transfer',
        note: 'Generated from payroll center',
      });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to save payroll run');
    }
  };

  const exportCsv = () => {
    const header = ['Staff Name', 'Gross Salary', 'Deductions', 'Net Salary', 'Status'];
    const lines = activePayrollRows.map((r) => [r.fullName, r.grossSalary, r.deductions, r.netSalary, r.paymentStatus]);
    const csv = [header, ...lines].map((line) => line.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accountant-payroll-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdfSlip = async (row) => {
    const mod = await import('jspdf');
    const doc = new mod.jsPDF();
    doc.setFontSize(16);
    doc.text('Payroll Salary Slip', 14, 20);
    doc.setFontSize(11);
    doc.text(`Staff: ${row.fullName} (${row.staffId})`, 14, 34);
    doc.text(`Role: ${row.role} | Department: ${row.department}`, 14, 42);
    doc.text(`Month/Year: ${month}/${year}`, 14, 50);
    doc.text(`Earnings: ${formatMoney(row.grossSalary)}`, 14, 62);
    doc.text(`Deductions: ${formatMoney(row.deductions)}`, 14, 70);
    doc.text(`Net Pay: ${formatMoney(row.netSalary)}`, 14, 78);
    doc.save(`salary-slip-${row.staffId}-${month}-${year}.pdf`);
  };

  const emailSlip = async (row) => {
    try {
      await api.post('/accountant/payroll/slip/email', {
        staffId: row.staffId,
        month: Number(month),
        year: Number(year),
        to: row.email,
      });
    } catch {
      await api.post('/school/payroll/slip/email', {
        staffId: row.staffId,
        month: Number(month),
        year: Number(year),
        to: row.email,
      });
    }
  };

  return (
    <div className="min-h-screen bg-re-bg px-4 sm:px-6 lg:px-8 py-6 space-y-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="rounded-3xl bg-gradient-to-r from-[#000435] to-[#0D2644] p-6 text-white border border-[#000435]/40">
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-black">Payroll Center</p>
        <h1 className="text-2xl sm:text-3xl font-black mt-2">Modern Payroll Management</h1>
        <p className="text-xs sm:text-sm text-[#000435] mt-2 max-w-3xl">Register staff, process monthly payroll, and generate professional salary slips.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['staff', 'Staff Registration'], ['payroll', 'Payroll Management'], ['slips', 'Salary Slips']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border ${tab === key ? 'bg-[#000435] text-white border-[#000435]' : 'bg-white border-black/10 text-[#000435]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'staff' && (
        <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[#000435]">Register staff in guided steps</p>
            <button onClick={() => setRegisterOpen(true)} className="h-10 px-4 rounded-xl bg-[#000435] text-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
              <UserPlus size={13} /> Open Register Modal
            </button>
          </div>
          <p className="text-xs text-[#000435] mt-2">Uses persistent backend endpoint and auto ID format: {nextStaffCode}</p>
          {!!error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}
          {loading ? <p className="mt-3 text-xs font-bold text-[#000435]">Loading staff…</p> : null}
        </div>
      )}

      {tab === 'payroll' && (
        <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 px-3 rounded-xl border border-black/10 text-xs font-bold">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m}>{m}</option>)}</select>
            <input value={year} onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, ''))} className="h-9 w-28 px-3 rounded-xl border border-black/10 text-xs font-bold" />
            <input value={taxRate} onChange={(e) => setTaxRate(e.target.value.replace(/[^\d]/g, ''))} className="h-9 w-24 px-3 rounded-xl border border-black/10 text-xs font-bold" placeholder="Tax %" />
            <input value={pensionRate} onChange={(e) => setPensionRate(e.target.value.replace(/[^\d]/g, ''))} className="h-9 w-24 px-3 rounded-xl border border-black/10 text-xs font-bold" placeholder="Pension %" />
            <div className="relative">
              <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#000435]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff" className="h-9 pl-7 pr-3 rounded-xl border border-black/10 text-xs font-bold" />
            </div>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="h-9 px-3 rounded-xl border border-black/10 text-xs font-bold">
              {['All', ...Array.from(new Set(staff.map((s) => s.department)))].map((d) => <option key={d}>{d}</option>)}
            </select>
            <button onClick={bulkPayAll} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">Pay All</button>
            <button onClick={exportCsv} className="h-9 px-3 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"><Download size={12} /> Export CSV</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-[#000435] border-b border-black/10">
                  <th className="py-2">Staff Name</th><th>Gross Salary</th><th>Deductions</th><th>Net Salary</th><th>Status</th><th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {activePayrollRows.map((row) => (
                  <tr key={row.staffId} className="border-b border-black/5 text-sm">
                    <td className="py-2 font-bold text-[#000435]">{row.fullName}</td>
                    <td>{formatMoney(row.grossSalary)}</td>
                    <td>{formatMoney(row.deductions)}</td>
                    <td className="font-bold">{formatMoney(row.netSalary)}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${row.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => { savePayrollRow(row); setSlipStaff(row); }} className="text-xs font-bold text-[#000435] hover:underline">Generate Slip</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'slips' && (
        <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {activePayrollRows.map((row) => (
            <div key={`slip-${row.staffId}`} className="border border-black/10 rounded-xl p-3">
              <p className="font-black text-[#000435]">{row.fullName}</p>
              <p className="text-xs text-[#000435]">{row.staffId} · {row.role} · {row.department}</p>
              <p className="text-xs mt-1">Earnings: {formatMoney(row.grossSalary)}</p>
              <p className="text-xs">Deductions: {formatMoney(row.deductions)}</p>
              <p className="text-xs font-black">Net Pay: {formatMoney(row.netSalary)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => exportPdfSlip(row)} className="h-8 px-3 rounded-lg bg-[#000435] text-white text-[10px] font-black uppercase">Download PDF</button>
                <button onClick={() => emailSlip(row)} className="h-8 px-3 rounded-lg border border-black/10 text-[10px] font-black uppercase inline-flex items-center gap-1"><Mail size={12} /> Email</button>
                <button className="h-8 px-3 rounded-lg border border-black/10 text-[10px] font-black uppercase inline-flex items-center gap-1"><Printer size={12} /> Print</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {slipStaff && (
        <div className="fixed inset-0 z-[220] bg-black/45 flex items-center justify-center p-4" onClick={() => setSlipStaff(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 border border-black/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-[#000435]">Salary Slip Preview</h3>
            <p className="text-sm mt-2">{slipStaff.fullName} ({slipStaff.staffId})</p>
            <p className="text-sm">Net Pay: <strong>{formatMoney(slipStaff.netSalary)}</strong></p>
            <button onClick={() => exportPdfSlip(slipStaff)} className="mt-4 h-9 px-4 rounded-xl bg-[#000435] text-white text-[10px] font-black uppercase tracking-widest">Download PDF</button>
          </div>
        </div>
      )}

      <RegisterStaffModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmit={submitRegistration}
        nextStaffCode={nextStaffCode}
      />
    </div>
  );
}
