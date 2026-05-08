import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search, ClipboardCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import api from '../services/api';
import AccountantOchreHero from '../components/AccountantOchreHero';

const STEPS = [
  'Search staff',
  'Salary details',
  'Advance check',
  'Calculate net',
  'Payment amount',
  'Period setup',
  'Review & submit',
];

const fmt = (v) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(v || 0));
const money = (v) => `${fmt(v)} RWF`;

export default function PayrollHistory() {
  const [step, setStep] = useState(1);
  const [staffQuery, setStaffQuery] = useState('');
  const [staffResults, setStaffResults] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [advanceSummary, setAdvanceSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    month: '',
    year: '',
    term: '',
    academic_year: '',
  });

  const [form, setForm] = useState({
    basicSalary: '',
    bonus: '',
    deduction: '',
    paymentAmount: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    term: '',
    academicYear: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Bank Transfer',
    note: '',
  });

  const gross = useMemo(() => Number(form.basicSalary || 0) + Number(form.bonus || 0), [form.basicSalary, form.bonus]);
  const net = useMemo(() => gross - Number(form.deduction || 0), [gross, form.deduction]);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 500 };
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.month) params.month = filters.month;
      if (filters.year) params.year = filters.year;
      if (filters.term) params.term = filters.term;
      if (filters.academic_year) params.academic_year = filters.academic_year;
      const { data } = await api.get('/accountant/payroll', { params });
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Auto-load on mount and whenever filters change
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const searchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/accountant/payroll/staff/search', { params: { query: staffQuery } });
      setStaffResults(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to search staff');
    } finally {
      setLoading(false);
    }
  };

  const chooseStaff = async (s) => {
    setSelectedStaff(s);
    const basic = Number(s?.salary?.basic || 0);
    const allowance = Number(s?.salary?.allowance || 0);
    setForm((p) => ({ ...p, basicSalary: String(basic), bonus: String(allowance), paymentAmount: String(basic + allowance) }));
    try {
      const { data } = await api.get(`/accountant/payroll/advance-check/${s.staffUserId}`);
      setAdvanceSummary(data?.data || { hasActiveAdvance: false, totalOutstanding: 0, requests: [] });
    } catch {
      setAdvanceSummary({ hasActiveAdvance: false, totalOutstanding: 0, requests: [] });
    }
    setStep(2);
  };

  const submitRequest = async () => {
    const payment = Number(form.paymentAmount || 0);
    if (!selectedStaff?.staffUserId) return setError('Select staff first');
    if (payment <= 0) return setError('Payment amount must be greater than zero');
    if (payment > net) return setError('Payment amount cannot exceed net salary');
    if (!form.term || !form.academicYear) return setError('Term and academic year are required');
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.post('/accountant/payroll', {
        staffUserId: selectedStaff.staffUserId,
        basicSalary: Number(form.basicSalary || 0),
        bonus: Number(form.bonus || 0),
        deduction: Number(form.deduction || 0),
        requestedAmount: payment,
        month: Number(form.month),
        year: Number(form.year),
        term: form.term,
        academicYear: form.academicYear,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        paymentStatus: 'pending',
        note: form.note,
      });
      setSuccess('Payroll request submitted to manager for approval.');
      setStep(1);
      setSelectedStaff(null);
      setStaffResults([]);
      setStaffQuery('');
      setAdvanceSummary(null);
      await loadRows();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit payroll request');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      Payroll: r.payrollId,
      Staff: r.staffName,
      StaffCode: r.staffCode,
      Month: r.month,
      Year: r.year,
      Term: r.term || '',
      AcademicYear: r.academicYear || '',
      RequestedAmount: r.requestedAmount,
      NetSalary: r.netSalaryPaid,
      Status: r.paymentStatus,
      Date: String(r.paymentDate || '').slice(0, 10),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll-requests-${Date.now()}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text('Payroll Monthly Summary', 14, 18);
    doc.setFontSize(9);
    rows.slice(0, 28).forEach((r, i) => {
      doc.text(`${r.payrollId} | ${r.staffName} | ${r.month}/${r.year} | ${money(r.requestedAmount)} | ${r.paymentStatus}`, 14, 28 + i * 7);
    });
    doc.save(`payroll-summary-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-re-bg animate-in fade-in duration-500" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow="Accountant payroll"
        titleLine="Payroll"
        titleAccent="Requests"
        subtitle="Submit salary requests · review payroll history · export reports"
        icon={ClipboardCheck}
      />

      <div className="acct-shell-standard pb-16 space-y-4">
      <div className="acct-panel-sheet p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wider">
          {STEPS.map((s, i) => <span key={s} className={i + 1 === step ? 'text-[#000435]' : 'text-[#000435]'}>{i + 1}. {s}</span>)}
        </div>
        {error ? <p className="mt-3 text-red-600 text-xs font-medium">{error}</p> : null}
        {success ? <p className="mt-3 text-emerald-600 text-xs font-medium">{success}</p> : null}

        <div className="mt-4 space-y-3">
          {step === 1 && (
            <>
              <div className="flex gap-2">
                <input value={staffQuery} onChange={(e) => setStaffQuery(e.target.value)} placeholder="Search by full name or staff ID" className="h-10 flex-1 rounded-xl border border-black/10 px-3" />
                <button onClick={searchStaff} className="h-10 px-4 rounded-xl bg-[#000435] text-white text-[10px] font-medium uppercase inline-flex items-center gap-1"><Search size={12} /> Search</button>
              </div>
              {staffResults.map((s) => (
                <button key={s.staffUserId} onClick={() => chooseStaff(s)} className="w-full text-left p-3 rounded-xl border border-black/10 hover:bg-white">
                  <p className="text-sm font-medium text-[#000435]">{s.fullName}</p>
                  <p className="text-xs text-[#000435]">{s.staffCode} · {s.role} · Suggested: {money(s?.salary?.grossSuggested)}</p>
                </button>
              ))}
            </>
          )}

          {step >= 2 && selectedStaff ? (
            <div className="p-3 rounded-xl border border-black/10 bg-white text-xs font-medium">
              {selectedStaff.fullName} · {selectedStaff.staffCode} · {selectedStaff.role}
            </div>
          ) : null}

          {step === 2 && <input value={form.basicSalary} onChange={(e) => setForm((p) => ({ ...p, basicSalary: e.target.value.replace(/[^\d]/g, '') }))} className="h-10 w-full rounded-xl border border-black/10 px-3" placeholder="Basic salary" />}
          {step === 3 && (
            <div className="rounded-xl border border-black/10 p-3 text-sm">
              {advanceSummary?.hasActiveAdvance ? (
                <p className="font-medium text-amber-600">Active advance found: {money(advanceSummary.totalOutstanding)}</p>
              ) : (
                <p className="font-medium text-emerald-600">No active advance. Continue to payment.</p>
              )}
            </div>
          )}
          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input value={form.bonus} onChange={(e) => setForm((p) => ({ ...p, bonus: e.target.value.replace(/[^\d]/g, '') }))} className="h-10 rounded-xl border border-black/10 px-3" placeholder="Allowances / bonus" />
              <input value={form.deduction} onChange={(e) => setForm((p) => ({ ...p, deduction: e.target.value.replace(/[^\d]/g, '') }))} className="h-10 rounded-xl border border-black/10 px-3" placeholder="Deductions" />
              <div className="h-10 rounded-xl border border-black/10 px-3 flex items-center font-medium">Gross: {money(gross)}</div>
              <div className="h-10 rounded-xl border border-black/10 px-3 flex items-center font-medium">Net: {money(net)}</div>
            </div>
          )}
          {step === 5 && <input value={form.paymentAmount} onChange={(e) => setForm((p) => ({ ...p, paymentAmount: e.target.value.replace(/[^\d]/g, '') }))} className="h-10 w-full rounded-xl border border-black/10 px-3" placeholder={`Payment amount (max ${money(net)})`} />}
          {step === 6 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value.replace(/[^\d]/g, '') }))} className="h-10 rounded-xl border border-black/10 px-3" placeholder="Month" />
              <input value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3" placeholder="Term (e.g. Term 1)" />
              <input value={form.academicYear} onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))} className="h-10 rounded-xl border border-black/10 px-3" placeholder="Academic year (e.g. 2026-2027)" />
            </div>
          )}
          {step === 7 && (
            <div className="space-y-1 text-sm">
              <p><strong>Staff:</strong> {selectedStaff?.fullName}</p>
              <p><strong>Net salary:</strong> {money(net)}</p>
              <p><strong>Request amount:</strong> {money(form.paymentAmount)}</p>
              <p><strong>Period:</strong> {form.month}/{form.year} · {form.term} · {form.academicYear}</p>
              <button onClick={submitRequest} disabled={saving} className="mt-2 h-10 px-4 rounded-xl bg-emerald-600 text-white text-[10px] font-medium uppercase tracking-widest">
                {saving ? 'Submitting...' : 'Submit payroll request'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="h-9 px-4 rounded-xl border border-black/10 text-[10px] font-medium uppercase">Back</button>
          <button onClick={() => setStep((s) => Math.min(7, s + 1))} className="h-9 px-4 rounded-xl bg-[#000435] text-white text-[10px] font-medium uppercase">Next</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-4">
        <div className="flex flex-wrap gap-2">
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="h-9 rounded-xl border border-black/10 px-3 text-xs font-medium">
            <option value="all">All status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option>
          </select>
          <input value={filters.term} onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))} className="h-9 rounded-xl border border-black/10 px-3 text-xs font-medium" placeholder="Term" />
          <input value={filters.month} onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))} className="h-9 w-24 rounded-xl border border-black/10 px-3 text-xs font-medium" placeholder="Month" />
          <input value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))} className="h-9 w-28 rounded-xl border border-black/10 px-3 text-xs font-medium" placeholder="Year" />
          <input value={filters.academic_year} onChange={(e) => setFilters((p) => ({ ...p, academic_year: e.target.value }))} className="h-9 rounded-xl border border-black/10 px-3 text-xs font-medium" placeholder="Academic year" />
          <button onClick={loadRows} className="h-9 px-3 rounded-xl bg-[#000435] text-white text-[10px] font-medium uppercase">Load requests</button>
          <button onClick={exportExcel} className="h-9 px-3 rounded-xl border border-black/10 text-[10px] font-medium uppercase inline-flex items-center gap-1"><Download size={12} /> Excel</button>
          <button onClick={exportPdf} className="h-9 px-3 rounded-xl border border-black/10 text-[10px] font-medium uppercase inline-flex items-center gap-1"><FileText size={12} /> PDF</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase text-[#000435] border-b border-black/10"><th className="py-2">Payroll</th><th>Staff</th><th>Period</th><th>Requested</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.payrollId} className="border-b border-black/5 text-sm">
                  <td className="py-2 font-medium text-[#000435]">{r.payrollId}</td>
                  <td>{r.staffName}</td>
                  <td>{r.month}/{r.year} · {r.term || '-'}</td>
                  <td>{money(r.requestedAmount || r.netSalaryPaid)}</td>
                  <td>{r.paymentStatus}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={5} className="py-5 text-center text-xs text-[#000435]">No payroll requests loaded.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
