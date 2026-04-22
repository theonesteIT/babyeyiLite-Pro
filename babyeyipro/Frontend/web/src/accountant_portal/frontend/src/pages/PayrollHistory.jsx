import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Eye, Pencil, Plus, Printer, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import api from '../services/api';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

function monthLabel(month) {
  const m = Number(month || 0);
  if (m < 1 || m > 12) return '—';
  return new Date(2026, m - 1, 1).toLocaleString(undefined, { month: 'long' });
}

const PAYMENT_STATUSES = ['pending', 'paid', 'cancelled'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Money', 'Card', 'Other'];

function PayrollFormModal({ open, mode, initialRecord, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [staffQuery, setStaffQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [staffResults, setStaffResults] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState({
    basicSalary: '',
    bonus: '',
    deduction: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentStatus: 'paid',
    paymentMethod: 'Bank Transfer',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialRecord) {
      setSelectedStaff({
        staffUserId: initialRecord.staffUserId,
        staffId: initialRecord.staffId,
        staffCode: initialRecord.staffCode,
        fullName: initialRecord.staffName,
        role: initialRecord.role,
        department: initialRecord.department,
      });
      setForm({
        basicSalary: String(initialRecord.basicSalary ?? ''),
        bonus: String(initialRecord.bonus ?? 0),
        deduction: String(initialRecord.deduction ?? 0),
        month: String(initialRecord.month ?? ''),
        year: String(initialRecord.year ?? ''),
        paymentDate: String(initialRecord.paymentDate || '').slice(0, 10),
        paymentStatus: initialRecord.paymentStatus || 'paid',
        paymentMethod: initialRecord.paymentMethod || 'Bank Transfer',
        note: initialRecord.note || '',
      });
      setStep(2);
    } else {
      setStep(1);
      setSelectedStaff(null);
      setStaffQuery('');
      setStaffResults([]);
      setForm({
        basicSalary: '',
        bonus: '',
        deduction: '',
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        paymentDate: new Date().toISOString().slice(0, 10),
        paymentStatus: 'paid',
        paymentMethod: 'Bank Transfer',
        note: '',
      });
    }
    setError('');
  }, [open, initialRecord]);

  const netSalary = useMemo(() => {
    const basic = Number(form.basicSalary || 0);
    const bonus = Number(form.bonus || 0);
    const deduction = Number(form.deduction || 0);
    return basic + bonus - deduction;
  }, [form.basicSalary, form.bonus, form.deduction]);

  if (!open) return null;

  const runStaffSearch = async () => {
    try {
      setSearching(true);
      setError('');
      const { data } = await api.get('/accountant/payroll/staff/search', {
        params: { query: staffQuery.trim() },
      });
      setStaffResults(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to search staff');
      setStaffResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectStaff = (s) => {
    setSelectedStaff(s);
    setForm((prev) => ({
      ...prev,
      basicSalary: String(Number(s?.salary?.basic || 0)),
    }));
    setStep(2);
  };

  const validateStep2 = () => {
    if (!selectedStaff?.staffUserId) return 'Staff is required';
    if (!(Number(form.basicSalary) > 0)) return 'Salary amount must be greater than 0';
    if (!(Number(form.month) >= 1 && Number(form.month) <= 12)) return 'Month is required';
    if (!(Number(form.year) >= 2000)) return 'Year is required';
    if (!form.paymentDate) return 'Payment date is required';
    if (!(netSalary >= 0)) return 'Net salary must be 0 or greater';
    return '';
  };

  const saveRecord = async () => {
    const validationError = validateStep2();
    if (validationError) {
      setError(validationError);
      setStep(2);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        staffUserId: selectedStaff.staffUserId,
        basicSalary: Number(form.basicSalary || 0),
        bonus: Number(form.bonus || 0),
        deduction: Number(form.deduction || 0),
        month: Number(form.month),
        year: Number(form.year),
        paymentDate: form.paymentDate,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
        note: form.note?.trim() || '',
      };
      if (mode === 'edit' && initialRecord?.payrollId) {
        await api.put(`/accountant/payroll/record/${encodeURIComponent(initialRecord.payrollId)}`, payload);
      } else {
        await api.post('/accountant/payroll', payload);
      }
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to save payroll record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[230]">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-black/5 flex items-center justify-between shrink-0 bg-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Payroll Wizard</p>
            <h2 className="text-lg font-black text-[#1E3A5F]">{mode === 'edit' ? 'Edit Payroll Record' : 'Create Payroll Record'}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-3 shrink-0 bg-white">
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
            <span className={step === 1 ? 'text-[#1E3A5F]' : 'text-slate-300'}>1. Staff</span>
            <span className={step === 2 ? 'text-[#1E3A5F]' : 'text-slate-300'}>2. Payment Info</span>
            <span className={step === 3 ? 'text-[#1E3A5F]' : 'text-slate-300'}>3. Confirm</span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
          {error ? <div className="text-[12px] font-bold text-red-600">{error}</div> : null}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Search by staff name or ID</p>
              <div className="flex gap-2">
                <input
                  value={staffQuery}
                  onChange={(e) => setStaffQuery(e.target.value)}
                  placeholder="e.g. John or STF-12"
                  className="flex-1 h-10 rounded-xl border border-black/10 px-3 outline-none focus:border-[#1E3A5F]/30"
                />
                <button onClick={runStaffSearch} disabled={searching} className="h-10 px-4 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-widest">
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              <div className="space-y-2">
                {staffResults.map((s) => (
                  <button
                    key={`${s.staffUserId}-${s.staffId}`}
                    onClick={() => selectStaff(s)}
                    className="w-full text-left p-3 rounded-xl border border-black/10 hover:bg-slate-50 transition"
                  >
                    <p className="text-[12px] font-black text-[#1E3A5F]">{s.fullName}</p>
                    <p className="text-[10px] font-bold text-slate-500">{s.staffId} · {s.role} · {formatMoneyRWF(s?.salary?.basic || 0)}</p>
                  </button>
                ))}
                {!staffResults.length && <p className="text-[11px] text-slate-400">No staff results yet.</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {selectedStaff && (
                <div className="p-3 rounded-xl bg-slate-50 border border-black/5">
                  <p className="text-[12px] font-black text-[#1E3A5F]">{selectedStaff.fullName}</p>
                  <p className="text-[10px] font-bold text-slate-500">{selectedStaff.staffId} · {selectedStaff.role} · {selectedStaff.department}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.basicSalary} onChange={(e) => setForm((p) => ({ ...p, basicSalary: e.target.value.replace(/[^\d]/g, '') }))} placeholder="Basic salary" className="h-10 rounded-xl border border-black/10 px-3 outline-none" />
                <input value={form.bonus} onChange={(e) => setForm((p) => ({ ...p, bonus: e.target.value.replace(/[^\d]/g, '') }))} placeholder="Bonus" className="h-10 rounded-xl border border-black/10 px-3 outline-none" />
                <input value={form.deduction} onChange={(e) => setForm((p) => ({ ...p, deduction: e.target.value.replace(/[^\d]/g, '') }))} placeholder="Deduction" className="h-10 rounded-xl border border-black/10 px-3 outline-none" />
                <input value={formatMoneyRWF(netSalary)} readOnly className="h-10 rounded-xl border border-black/10 px-3 bg-slate-50 outline-none" />
                <select value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 outline-none">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>{m}</option>
                  ))}
                </select>
                <input value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value.replace(/[^\d]/g, '') }))} placeholder="Payment year" className="h-10 rounded-xl border border-black/10 px-3 outline-none" />
                <input type="date" value={form.paymentDate} onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 outline-none" />
                <select value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 outline-none">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={form.paymentStatus} onChange={(e) => setForm((p) => ({ ...p, paymentStatus: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3 outline-none md:col-span-2">
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Notes" className="min-h-[88px] rounded-xl border border-black/10 px-3 py-2 outline-none md:col-span-2" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-[12px]">
              <p><strong>Staff:</strong> {selectedStaff?.fullName} ({selectedStaff?.staffId})</p>
              <p><strong>Role:</strong> {selectedStaff?.role}</p>
              <p><strong>Basic Salary:</strong> {formatMoneyRWF(form.basicSalary)}</p>
              <p><strong>Bonus:</strong> {formatMoneyRWF(form.bonus)}</p>
              <p><strong>Deduction:</strong> {formatMoneyRWF(form.deduction)}</p>
              <p><strong>Net Salary:</strong> {formatMoneyRWF(netSalary)}</p>
              <p><strong>Period:</strong> {monthLabel(form.month)} {form.year}</p>
              <p><strong>Payment Date:</strong> {form.paymentDate}</p>
              <p><strong>Status:</strong> {form.paymentStatus}</p>
              <p><strong>Method:</strong> {form.paymentMethod}</p>
              <p><strong>Notes:</strong> {form.note || '—'}</p>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-black/5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 bg-white">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="h-10 px-4 rounded-xl border border-black/10 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
            Back
          </button>
          <div className="flex gap-2">
            {step < 3 ? (
              <button
                onClick={() => {
                  if (step === 2) {
                    const v = validateStep2();
                    if (v) return setError(v);
                  }
                  setError('');
                  setStep((s) => Math.min(3, s + 1));
                }}
                className="h-10 px-4 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-widest w-full sm:w-auto"
              >
                Next
              </button>
            ) : (
              <button onClick={saveRecord} disabled={saving} className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 w-full sm:w-auto">
                {saving ? 'Saving…' : 'Save Payroll'}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function PayrollHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [details, setDetails] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (query.trim()) params.query = query.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (monthFilter) params.month = monthFilter;
      if (yearFilter) params.year = yearFilter;
      const { data } = await api.get('/accountant/payroll', { params });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load payroll records');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.netSalaryPaid || 0), 0);
    return {
      total,
      pending: rows.filter((r) => r.paymentStatus === 'pending').length,
      paid: rows.filter((r) => r.paymentStatus === 'paid').length,
      cancelled: rows.filter((r) => r.paymentStatus === 'cancelled').length,
    };
  }, [rows]);

  const exportCsv = () => {
    const header = ['Payroll ID', 'Staff ID', 'Staff Name', 'Role', 'Basic Salary', 'Bonus', 'Deduction', 'Net Salary', 'Month', 'Year', 'Payment Date', 'Status', 'Method'];
    const lines = rows.map((r) => [r.payrollId, r.staffId, r.staffName, r.role, r.basicSalary, r.bonus, r.deduction, r.netSalaryPaid, r.month, r.year, r.paymentDate, r.paymentStatus, r.paymentMethod]);
    const csv = [header, ...lines].map((line) => line.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetails = async (row) => {
    try {
      const { data } = await api.get(`/accountant/payroll/record/${encodeURIComponent(row.payrollId)}`);
      setDetails(data?.data || row);
    } catch {
      setDetails(row);
    }
  };

  const deleteRecord = async (row) => {
    const ok = window.confirm(`Delete payroll record ${row.payrollId}?`);
    if (!ok) return;
    try {
      await api.delete(`/accountant/payroll/record/${encodeURIComponent(row.payrollId)}`);
      await fetchRecords();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to delete payroll record');
    }
  };

  const printSlip = (row) => {
    const html = `
      <html><head><title>${row.payrollId}</title></head><body>
      <h2>Payroll Slip</h2>
      <p><strong>Payroll ID:</strong> ${row.payrollId}</p>
      <p><strong>Staff:</strong> ${row.staffName} (${row.staffId})</p>
      <p><strong>Role:</strong> ${row.role}</p>
      <p><strong>Basic:</strong> ${formatMoneyRWF(row.basicSalary)}</p>
      <p><strong>Bonus:</strong> ${formatMoneyRWF(row.bonus)}</p>
      <p><strong>Deduction:</strong> ${formatMoneyRWF(row.deduction)}</p>
      <p><strong>Net:</strong> ${formatMoneyRWF(row.netSalaryPaid)}</p>
      <p><strong>Period:</strong> ${monthLabel(row.month)} ${row.year}</p>
      <p><strong>Date:</strong> ${String(row.paymentDate || '').slice(0, 10)}</p>
      <p><strong>Status:</strong> ${row.paymentStatus}</p>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        <div className="bg-white rounded-[28px] border border-black/5 shadow-2xl overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
            {[
              { label: 'Total Net Paid', value: formatMoneyRWF(totals.total).replace('RWF', ''), icon: <Calendar size={14} /> },
              { label: 'Paid', value: String(totals.paid), icon: <Users size={14} /> },
              { label: 'Pending', value: String(totals.pending), icon: <Users size={14} /> },
              { label: 'Cancelled', value: String(totals.cancelled), icon: <Users size={14} /> },
            ].map((s) => (
              <div key={s.label} className="p-5 text-center">
                <div className="mb-1 opacity-40 flex justify-center">{s.icon}</div>
                <p className="text-[20px] font-black text-[#1E3A5F]">{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-black/5 border-b border-black/5 bg-slate-50 flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payroll ID / staff" className="h-9 pl-8 pr-3 rounded-xl border border-black/10 outline-none text-[11px] font-bold" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-3 rounded-xl border border-black/10 text-[11px] font-bold">
              <option value="all">All status</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={monthFilter} onChange={(e) => setMonthFilter(e.target.value.replace(/[^\d]/g, ''))} placeholder="Month" className="h-9 w-24 px-3 rounded-xl border border-black/10 text-[11px] font-bold" />
            <input value={yearFilter} onChange={(e) => setYearFilter(e.target.value.replace(/[^\d]/g, ''))} placeholder="Year" className="h-9 w-28 px-3 rounded-xl border border-black/10 text-[11px] font-bold" />
            <button onClick={fetchRecords} className="h-9 w-9 rounded-xl border border-black/10 flex items-center justify-center bg-white"><RefreshCw size={13} /></button>
            <button onClick={() => { setModalMode('create'); setActiveRecord(null); }} className="h-9 px-3 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Plus size={12} /> Add Payroll</button>
            <button onClick={exportCsv} className="h-9 px-3 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Download size={12} /> Export</button>
          </div>

          {error ? <div className="px-4 py-3 text-red-600 text-[11px] font-bold border-b border-black/5">{error}</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-black/5">
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Payroll</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Staff</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Period</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Net Salary</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {!loading && !rows.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No payroll records found.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.payrollId} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-black text-[#1E3A5F]">{r.payrollId}</p>
                      <p className="text-[9px] font-bold text-slate-400">{String(r.paymentDate || '').slice(0, 10)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-black text-[#1E3A5F]">{r.staffName}</p>
                      <p className="text-[9px] font-bold text-slate-400">{r.staffId} · {r.role}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-black text-[#1E3A5F]">{monthLabel(r.month)} {r.year}</td>
                    <td className="px-4 py-3 text-right text-[12px] font-black text-[#1E3A5F]">{formatMoneyRWF(r.netSalaryPaid).replace('RWF', '')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${
                        r.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : r.paymentStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetails(r)} className="h-7 w-7 rounded-lg border border-black/10 flex items-center justify-center"><Eye size={13} /></button>
                        <button onClick={() => { setActiveRecord(r); setModalMode('edit'); }} className="h-7 w-7 rounded-lg border border-black/10 flex items-center justify-center"><Pencil size={13} /></button>
                        <button onClick={() => printSlip(r)} className="h-7 w-7 rounded-lg border border-black/10 flex items-center justify-center"><Printer size={13} /></button>
                        <button onClick={() => deleteRecord(r)} className="h-7 w-7 rounded-lg border border-red-200 text-red-600 flex items-center justify-center"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PayrollFormModal
        open={modalMode === 'create' || modalMode === 'edit'}
        mode={modalMode === 'edit' ? 'edit' : 'create'}
        initialRecord={activeRecord}
        onClose={() => { setModalMode(null); setActiveRecord(null); }}
        onSaved={fetchRecords}
      />

      {details && (
        <div className="fixed inset-0 z-[220]">
          <div className="absolute inset-0 bg-black/45" onClick={() => setDetails(null)} />
          <div className="absolute inset-y-0 right-0 w-full md:w-[430px] bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-[#1E3A5F]">Payroll Details</h3>
              <button onClick={() => setDetails(null)} className="p-2 rounded-xl hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-2 text-[12px]">
              <p><strong>ID:</strong> {details.payrollId}</p>
              <p><strong>Staff:</strong> {details.staffName} ({details.staffId})</p>
              <p><strong>Role:</strong> {details.role}</p>
              <p><strong>Department:</strong> {details.department || '—'}</p>
              <p><strong>Basic Salary:</strong> {formatMoneyRWF(details.basicSalary)}</p>
              <p><strong>Bonus:</strong> {formatMoneyRWF(details.bonus)}</p>
              <p><strong>Deduction:</strong> {formatMoneyRWF(details.deduction)}</p>
              <p><strong>Net Salary Paid:</strong> {formatMoneyRWF(details.netSalaryPaid)}</p>
              <p><strong>Month / Year:</strong> {monthLabel(details.month)} {details.year}</p>
              <p><strong>Payment Date:</strong> {String(details.paymentDate || '').slice(0, 10)}</p>
              <p><strong>Status:</strong> {details.paymentStatus}</p>
              <p><strong>Method:</strong> {details.paymentMethod || '—'}</p>
              <p><strong>Created By:</strong> {details.createdBy?.name || 'Accountant'}</p>
              <p><strong>Notes:</strong> {details.note || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

