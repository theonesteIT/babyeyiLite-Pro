import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  CheckCircle2, FileSpreadsheet, FileText, Loader2, Plus, Search, X,
  ChevronRight, Calculator, Banknote, Calendar, ChevronLeft, User,
  TrendingUp, AlertCircle, RefreshCw, Filter
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PortalToast from '../components/PortalToast';
import api from '../services/api';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STEP_LABELS = ['Select Staff', 'Salary Details', 'Amount to Pay', 'Review'];

const STATUS_CFG = {
  Pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  Approved: { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  Rejected: { cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  Paid: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const fmt = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v) || 0);
const toAmount = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);
const parseMaybeJson = (value) => {
  try { return Array.isArray(value) ? value : (typeof value === 'string' ? (JSON.parse(value) || []) : []); }
  catch { return []; }
};
const normalizeTerm = (t) => (String(t || '').includes('1') ? 'T1' : String(t || '').includes('3') ? 'T3' : 'T2');
const toPayrollYear = (y) => {
  const txt = String(y || '').trim();
  const m = txt.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) return Number(m[1]);
  const n = Number(txt);
  return Number.isFinite(n) ? n : new Date().getFullYear();
};
const getStaffCode = (s) => s?.staffCode || `SS-${String(s?.staffUserId || '').padStart(3, '0')}`;

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { cls: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center w-full justify-between px-2">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all duration-300 ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : active ? 'bg-[#000435] text-[#FEBF10] shadow-lg shadow-[#000435]/20'
                  : 'bg-slate-100 text-slate-400'
                }`}>
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-[8px] font-bold uppercase tracking-wider hidden sm:block ${active ? 'text-[#000435]' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 sm:mx-3 rounded-full transition-all duration-500 ${n < current ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 text-center group">
      <div className={`mb-1.5 ${accent}`}>{icon}</div>
      <p className="text-base sm:text-xl font-black text-[#000435] tracking-tight tabular-nums">{value}</p>
      <p className="text-[8px] sm:text-[9px] font-bold text-[#000435]/50 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
}

export default function PayrollConfig() {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ month: 'All', role: 'All', query: '' });
  const [loading, setLoading] = useState({ requests: false, staff: false, advance: false });
  const [toast, setToast] = useState({ type: '', message: '' });
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(1);
  const [staffList, setStaffList] = useState([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [period, setPeriod] = useState({
    month: MONTHS[new Date().getMonth()],
    term: 'T2',
    year: String(new Date().getFullYear()),
    amount: '',
  });
  const [academicSettings, setAcademicSettings] = useState({ term: 'T2', year: String(new Date().getFullYear()) });
  const [availableTerms, setAvailableTerms] = useState(['T2', 'T1', 'T3']);
  const [availableYears, setAvailableYears] = useState([String(new Date().getFullYear())]);
  const [advance, setAdvance] = useState({ monthlyDeduction: 0, deductionApplied: 0, approvedCount: 0 });
  const [detailRow, setDetailRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    window.clearTimeout(window.__payrollToast);
    window.__payrollToast = setTimeout(() => setToast({ type: '', message: '' }), 3500);
  }, []);

  // ── fetch requests ──────────────────────────────────────────
  const fetchRequests = useCallback(() => {
    setLoading((p) => ({ ...p, requests: true }));
    const params = { _ts: Date.now() };
    if (filters.month !== 'All') params.month = filters.month;
    api.get('/accountant/payroll-requests', { params })
      .then((res) => setRequests(res.data?.data || []))
      .catch((e) => notify('error', e?.response?.data?.message || 'Failed to load payroll'))
      .finally(() => setLoading((p) => ({ ...p, requests: false })));
  }, [filters.month, notify]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── handle return from SalaryPayment ───────────────────────
  useEffect(() => {
    if (!location.state?.payrollPaymentSaved) return;
    notify('success', 'Payment saved successfully.');
    navigate(location.pathname, { replace: true, state: {} });
    setLoading((p) => ({ ...p, requests: true }));
    api.get('/accountant/payroll-requests', { params: { _ts: Date.now() } })
      .then((res) => setRequests(res.data?.data || []))
      .catch(() => { })
      .finally(() => setLoading((p) => ({ ...p, requests: false })));
  }, [location.state?.payrollPaymentSaved]); // eslint-disable-line

  // ── academic settings ───────────────────────────────────────
  useEffect(() => {
    api.get('/dos/academic-calendar-settings')
      .then((res) => {
        if (res.data?.success) {
          const data = res.data.data || {};
          const raw = Array.isArray(data.active_terms) && data.active_terms.length ? data.active_terms : ['Term 2', 'Term 1', 'Term 3'];
          const terms = Array.from(new Set(raw.map(normalizeTerm)));
          const term = terms[0] || 'T2';
          const year = String(data.current_academic_year || new Date().getFullYear());
          const cur = String(new Date().getFullYear());
          const allYears = Array.from(new Set([year, cur, String(Number(cur) - 1), String(Number(cur) + 1)]));
          setAcademicSettings({ term, year });
          setAvailableTerms([term, ...['T1', 'T2', 'T3'].filter((t) => t !== term)]);
          setAvailableYears(allYears);
          setPeriod((p) => ({ ...p, term, year }));
        }
      })
      .catch(() => { });
  }, []);

  // ── staff search ────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading((p) => ({ ...p, staff: true }));
      api.get('/accountant/payroll/staff/search', { params: { query: searchStaff, limit: 50 } })
        .then((res) => setStaffList(res.data?.data || []))
        .catch(() => { })
        .finally(() => setLoading((p) => ({ ...p, staff: false })));
    }, 250);
    return () => clearTimeout(t);
  }, [searchStaff]);

  // ── computed salary ─────────────────────────────────────────
  const selectedStaff = useMemo(
    () => staffList.find((s) => String(s.staffUserId) === String(selectedStaffId)) || null,
    [staffList, selectedStaffId]
  );

  const salary = useMemo(() => {
    if (!selectedStaff) return { basic: 0, allowances: 0, deductions: 0, bonus: 0 };
    const pr = selectedStaff.payroll;
    if (pr) {
      const basic = toAmount(pick(pr.basicSalary, pr.payrollBasicSalary));
      const allowances =
        toAmount(pick(pr.transportAllowance, pr.payrollTransportAllowance)) +
        toAmount(pick(pr.housingAllowance, pr.payrollHousingAllowance)) +
        toAmount(pick(pr.mealAllowance, pr.payrollMealAllowance)) +
        parseMaybeJson(pick(pr.otherAllowances, pr.payrollOtherAllowances)).reduce((s, r) => s + toAmount(r?.amount), 0);
      const bonus = toAmount(pick(pr.bonus, pr.payrollBonus));
      const gross = basic + allowances + bonus;
      const tax = (gross * toAmount(pick(pr.taxPercent, pr.payrollTaxPercent))) / 100;
      const deductions = tax + toAmount(pick(pr.pensionAmount, pr.payrollPensionAmount)) +
        parseMaybeJson(pick(pr.otherDeductions, pr.payrollOtherDeductions)).reduce((s, r) => s + toAmount(r?.amount), 0);
      return { basic, allowances, bonus, deductions };
    }
    const basic = toAmount(selectedStaff.salary?.basic);
    const allowances = toAmount(selectedStaff.salary?.allowance);
    const bonus = toAmount(selectedStaff.salary?.bonus);
    return { basic, allowances, bonus, deductions: Math.round((basic + allowances + bonus) * 0.05) };
  }, [selectedStaff]);

  const totalEarnings = salary.basic + salary.allowances + salary.bonus;
  const advanceDeductionApplied = Number(advance.deductionApplied ?? advance.monthlyDeduction ?? 0);
  const totalDeductions = salary.deductions + advanceDeductionApplied;
  const finalPayable = Math.max(0, totalEarnings - totalDeductions);

  // FIX: parse amount correctly — strip non-numeric chars, parse as float
  const amount = useMemo(() => {
    const raw = String(period.amount || '').replace(/[^\d.]/g, '').trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }, [period.amount]);

  const payrollYear = useMemo(() => toPayrollYear(period.year), [period.year]);
  const normalizedPeriodTerm = useMemo(() => normalizeTerm(period.term), [period.term]);

  const selectedMonthRows = useMemo(() =>
    requests.filter((r) =>
      Number(r.staffUserId) === Number(selectedStaff?.staffUserId) &&
      String(r.month || '') === String(period.month || '') &&
      Number(r.year || 0) === Number(payrollYear || 0) &&
      normalizeTerm(r.term) === normalizedPeriodTerm
    ),
    [requests, selectedStaff?.staffUserId, period.month, payrollYear, normalizedPeriodTerm]);

  const alreadyPaid = selectedMonthRows.filter((r) => r.status === 'Paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const duplicateExists = selectedMonthRows.some((r) => r.status === 'Pending' || r.status === 'Approved');
  const periodFinalPayable = Math.max(finalPayable, ...selectedMonthRows.map((r) => Number(r.finalPayable || 0)));
  const remainingPayable = Math.max(0, periodFinalPayable - alreadyPaid);
  const fullyPaidExists = selectedMonthRows.length > 0 && remainingPayable <= 0;

  // ── advance check ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedStaff?.staffUserId) {
      setAdvance({ monthlyDeduction: 0, deductionApplied: 0, approvedCount: 0 });
      return;
    }
    setLoading((p) => ({ ...p, advance: true }));
    api.get(`/accountant/payroll/advance-check/${selectedStaff.staffUserId}`)
      .then((res) => {
        const approved = Array.isArray(res.data?.data?.approvedAdvances) ? res.data.data.approvedAdvances : [];
        const monthly = approved.reduce((sum, row) => sum + Number(row.monthlyPayment || 0), 0);
        setAdvance({
          monthlyDeduction: monthly,
          deductionApplied: Math.min(totalEarnings - salary.deductions, monthly),
          approvedCount: approved.length,
        });
      })
      .catch(() => setAdvance({ monthlyDeduction: 0, deductionApplied: 0, approvedCount: 0 }))
      .finally(() => setLoading((p) => ({ ...p, advance: false })));
  }, [selectedStaff?.staffUserId, totalEarnings, salary.deductions]);

  // ── filtered table ──────────────────────────────────────────
  const filtered = useMemo(() =>
    requests.filter((r) => {
      const mOk = filters.month === 'All' || r.month === filters.month;
      const roleOk = filters.role === 'All' || String(r.role || '').toLowerCase() === String(filters.role || '').toLowerCase();
      const q = String(filters.query || '').trim().toLowerCase();
      const qOk = !q || String(r.staffName || '').toLowerCase().includes(q) || String(r.staffCode || '').toLowerCase().includes(q) || String(r.role || '').toLowerCase().includes(q);
      return mOk && roleOk && qOk;
    }),
    [filters, requests]);

  const roleOptions = useMemo(() => ['All', ...Array.from(new Set(requests.map((r) => r.role).filter(Boolean)))], [requests]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    paid: requests.filter((r) => r.status === 'Paid').length,
    totalPaid: requests.filter((r) => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0),
  };

  // ── modal helpers ───────────────────────────────────────────
  const openCreate = () => {
    setOpenModal(true);
    setStep(1);
    setSearchStaff('');
    setSelectedStaffId('');
    setPeriod({
      month: MONTHS[new Date().getMonth()],
      term: academicSettings.term,
      year: academicSettings.year,
      amount: '',
    });
  };

  // FIX: step 2 → 3: compute suggested amount BEFORE setting state,
  // so the amount useMemo re-derives correctly on the very first render of step 3.
  const handleContinue = () => {
    if (step === 2) {
      const suggested = Math.max(0, Math.round(remainingPayable > 0 ? remainingPayable : finalPayable));
      // Set amount synchronously in the same state update as step change
      setPeriod((p) => ({ ...p, amount: suggested > 0 ? String(suggested) : '' }));
      setStep(3);
      return;
    }
    setStep((s) => s + 1);
  };

  const navigateToPayment = (row) => {
    navigate('/accountant/payroll/salary-payment', {
      state: { payrollDraft: row },
    });
  };

  const submitPayrollRequest = async () => {
    if (!selectedStaff) return notify('error', 'Select staff first.');
    if (!(payrollYear >= 2000 && payrollYear <= 3000)) return notify('error', 'Academic year format is invalid.');
    if (!(amount > 0)) return notify('error', 'Amount must be greater than zero.');
    if (duplicateExists) return notify('error', 'A pending or approved request already exists for this period.');
    if (fullyPaidExists) return notify('error', 'Staff is already fully paid for this period.');

    setLoading((p) => ({ ...p, requests: true }));
    try {
      await api.post('/accountant/payroll-requests', {
        staffUserId: Number(selectedStaff.staffUserId),
        staffCode: getStaffCode(selectedStaff),
        staffName: selectedStaff.fullName,
        role: selectedStaff.role || selectedStaff.position || 'STAFF',
        department: selectedStaff.department || selectedStaff.role || 'STAFF',
        month: period.month,
        term: normalizedPeriodTerm,
        year: payrollYear,
        academicYear: String(period.year || payrollYear),
        amount: amount,
        basic: salary.basic,
        allowances: salary.allowances + salary.bonus,
        deductions: salary.deductions,
        netSalary: totalEarnings - salary.deductions,
        advance: Number(advanceDeductionApplied || 0),
        finalPayable,
      });
      notify('success', 'Payroll request saved as pending.');
      setOpenModal(false);
      fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || 'Failed to save payroll request.');
      setLoading((p) => ({ ...p, requests: false }));
    }
  };

  // step-3 validation flags
  const amountErrors = useMemo(() => ({
    zero: amount <= 0,
    exceeds: amount > 0 && amount > remainingPayable && remainingPayable > 0,
    duplicate: duplicateExists,
    fullyPaid: fullyPaidExists,
  }), [amount, remainingPayable, duplicateExists, fullyPaidExists]);

  const step3HasErrors = amountErrors.zero || amountErrors.exceeds || amountErrors.duplicate || amountErrors.fullyPaid;

  // ── exports ─────────────────────────────────────────────────
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('Payroll Summary', 14, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); let y = 35;
    requests.filter((r) => r.status === 'Paid').forEach((r) => { doc.text(`${r.month}: ${fmt(r.amount)} RWF`, 14, y); y += 8; });
    if (y === 35) doc.text('No paid records found.', 14, y);
    doc.save('payroll-summary.pdf');
  };

  const exportCsv = () => {
    const rows = [['Staff', 'Staff Code', 'Role', 'Month', 'Term', 'Year', 'Amount', 'Status'],
    ...requests.map((r) => [r.staffName, r.staffCode, r.role, r.month, r.term, r.year, r.amount, r.status])];
    const csv = rows.map((l) => l.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'payroll-report.csv' }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="relative bg-[#000435] overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5" />
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-20 sm:pb-24">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-[#FEBF10]/10 border border-[#FEBF10]/20 flex items-center justify-center shrink-0">
                <Calculator size={22} className="text-[#FEBF10]" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-[#FEBF10]/80 mb-1">Finance · Payroll</p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                  Payroll <span className="text-[#FEBF10]">Management</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-white/30 mt-1 font-medium">View records & prepare staff salaries</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main card ────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-10 sm:-mt-12 pb-16 relative z-10">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-100">
              {[
                { label: 'Total Paid', value: `${fmt(stats.totalPaid)} RWF`, icon: <Banknote size={16} />, accent: 'text-emerald-500' },
                { label: 'Pending', value: String(stats.pending), icon: <AlertCircle size={16} />, accent: 'text-amber-500' },
                { label: 'Cleared', value: String(stats.paid), icon: <CheckCircle2 size={16} />, accent: 'text-blue-500' },
                { label: 'Records', value: String(stats.total), icon: <Calendar size={16} />, accent: 'text-[#000435]' },
              ].map((s, i) => (
                <div key={i} className={`${i < 3 ? 'border-r border-slate-100' : ''} ${i >= 2 ? 'sm:border-r-0' : ''}`}>
                  <StatCard {...s} />
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.query}
                  onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                  placeholder="Search staff, code, role…"
                  className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#000435]/40 focus:bg-white transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters((v) => !v)}
                className="sm:hidden h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-1.5 text-[10px] font-bold"
              >
                <Filter size={12} /> Filters
              </button>

              <div className={`flex gap-2 w-full sm:w-auto ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
                  className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                >
                  <option value="All">All Months</option>
                  {MONTHS.map((m) => <option key={m}>{m}</option>)}
                </select>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
                  className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                >
                  {roleOptions.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div className="flex gap-2 ml-auto">
                <button onClick={fetchRequests} className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all" title="Refresh">
                  <RefreshCw size={13} />
                </button>
                <button onClick={exportCsv} className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition-all">
                  <FileSpreadsheet size={12} /> CSV
                </button>
                <button onClick={exportPdf} className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition-all">
                  <FileText size={12} /> PDF
                </button>
                <button
                  onClick={openCreate}
                  className="h-9 px-4 rounded-xl bg-[#000435] text-[#FEBF10] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#000435]/90 active:scale-95 transition-all shadow-lg shadow-[#000435]/20"
                >
                  <Plus size={13} /> <span className="hidden sm:inline">Create Payment</span><span className="sm:hidden">New</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Staff', 'Role', 'Period', 'Amount', 'Status', ''].map((h, i) => (
                      <th key={i} className={`px-4 sm:px-5 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest ${i >= 4 ? 'text-right' : 'text-left'} ${i === 1 || i === 2 ? 'hidden md:table-cell' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading.requests && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Loader2 size={20} className="animate-spin mx-auto text-[#FEBF10] mb-2" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading payroll…</p>
                    </td></tr>
                  )}
                  {!loading.requests && filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Calculator size={28} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[11px] font-bold text-slate-400">No payroll records found</p>
                    </td></tr>
                  )}
                  {!loading.requests && filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => setDetailRow(row)}
                    >
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#000435]/8 flex items-center justify-center shrink-0">
                            <User size={12} className="text-[#000435]/50" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-[#000435]">{row.staffName}</p>
                            <p className="text-[9px] font-mono text-slate-400 tracking-wider">{row.staffCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3 hidden md:table-cell">
                        <span className="text-[10px] font-bold text-slate-600">{row.role || '—'}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 hidden md:table-cell">
                        <p className="text-[10px] font-bold text-[#000435]">{row.month}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{row.term} · {row.year}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <p className="text-[11px] font-black text-[#000435] tabular-nums">{fmt(row.amount)}</p>
                        <p className="text-[8px] text-slate-400 font-bold">RWF</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right">
                        {row.status === 'Approved' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigateToPayment(row); }}
                            className="h-7 px-3 mr-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailRow(row); }}
                          className="h-7 px-3 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{filtered.length} records</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ CREATE PAYMENT MODAL ══════════════════════════════════ */}
      {openModal && createPortal(
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpenModal(false)} />

          <div
            className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '95vh', borderRadius: '24px 24px 0 0' }}
          >
            {/* Modal header */}
            <div className="bg-[#000435] px-5 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEBF10]/15 border border-[#FEBF10]/25 flex items-center justify-center">
                    <Calculator size={16} className="text-[#FEBF10]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white">Process Payroll</p>
                    <p className="text-[9px] text-white/40 font-bold">Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}</p>
                  </div>
                </div>
                <button onClick={() => setOpenModal(false)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Step indicator */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 shrink-0">
              <StepIndicator current={step} />
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">

              {/* ── STEP 1: Select Staff ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                      placeholder="Search staff by name or code…"
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 outline-none focus:border-[#000435]/40 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {loading.staff ? (
                      <div className="py-10 text-center">
                        <Loader2 size={16} className="animate-spin mx-auto text-[#FEBF10] mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Searching…</p>
                      </div>
                    ) : staffList.length === 0 ? (
                      <div className="py-10 text-center">
                        <User size={24} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400">No staff found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {staffList.map((s) => (
                          <button
                            key={s.staffUserId}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50/50 transition-colors ${String(selectedStaffId) === String(s.staffUserId) ? 'bg-amber-50' : ''}`}
                            onClick={() => { setSelectedStaffId(String(s.staffUserId)); setStep(2); }}
                          >
                            <div className="w-9 h-9 rounded-full bg-[#000435]/8 flex items-center justify-center shrink-0">
                              <User size={14} className="text-[#000435]/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-black text-[#000435] truncate">{s.fullName}</p>
                              <p className="text-[9px] font-mono text-slate-400 tracking-wider">{getStaffCode(s)} · {s.role || s.position || '—'}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Salary Details ── */}
              {step === 2 && (!selectedStaff ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center text-[11px] font-bold text-red-600">
                  Please go back and select a staff member.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Staff card */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#000435]/3 border border-[#000435]/8">
                    <div className="w-10 h-10 rounded-full bg-[#000435]/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-[#000435]/60" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-[#000435]">{selectedStaff.fullName}</p>
                      <p className="text-[9px] font-mono text-slate-400 tracking-wider">{getStaffCode(selectedStaff)} · {selectedStaff.role}</p>
                    </div>
                  </div>

                  {/* Salary breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Basic', value: salary.basic, color: 'text-[#000435]' },
                      { label: 'Allowances', value: salary.allowances, color: 'text-[#000435]' },
                      { label: 'Bonuses', value: salary.bonus, color: 'text-blue-600' },
                      { label: 'Tax & Deductions', value: salary.deductions, color: 'text-red-500' },
                      { label: 'Advance Deduction', value: advanceDeductionApplied, color: 'text-orange-500' },
                      { label: 'Final Payable', value: finalPayable, color: 'text-emerald-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider leading-tight mb-1.5">{label}</p>
                        <p className={`text-[13px] font-black ${color} tabular-nums`}>{fmt(value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Payment Summary</p>
                    {[
                      { label: 'Total Earnings', value: totalEarnings, cls: 'text-[#000435]' },
                      { label: 'Total Deductions', value: totalDeductions, cls: 'text-red-500' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500">{label}</span>
                        <span className={`text-[12px] font-black tabular-nums ${cls}`}>{fmt(value)} RWF</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-black text-[#000435]">Payable Amount</span>
                      <span className="text-[14px] font-black text-emerald-600 tabular-nums">{fmt(remainingPayable)} RWF</span>
                    </div>
                  </div>

                  {/* Advance */}
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Advance Deductions</p>
                    {loading.advance ? (
                      <Loader2 size={13} className="animate-spin text-amber-500" />
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-bold">Approved Advances</span>
                          <span className="font-black text-[#000435]">{advance.approvedCount}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-bold">Monthly Deduction</span>
                          <span className="font-black text-red-500">{fmt(advance.monthlyDeduction)} RWF</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-amber-200">
                          <span className="text-slate-500 font-bold">Applied This Payroll</span>
                          <span className="font-black text-amber-600">{fmt(advanceDeductionApplied)} RWF</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* ── STEP 3: Amount to Pay ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Amount (RWF) *</label>
                        <input
                          value={period.amount}
                          onChange={(e) => setPeriod((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[14px] font-black text-[#000435] tabular-nums outline-none transition-all"
                          placeholder="0"
                          inputMode="numeric"
                        />
                        {remainingPayable > 0 && (
                          <button
                            type="button"
                            onClick={() => setPeriod((p) => ({ ...p, amount: String(Math.round(remainingPayable)) }))}
                            className="mt-1.5 text-[9px] font-bold text-[#000435]/60 hover:text-[#000435] underline underline-offset-2"
                          >
                            Fill max: {fmt(remainingPayable)} RWF
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Month</label>
                        <select
                          value={period.month}
                          onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-bold text-[#000435] outline-none cursor-pointer"
                        >
                          {MONTHS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Term</label>
                        <select
                          value={period.term}
                          onChange={(e) => setPeriod((p) => ({ ...p, term: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-bold text-[#000435] outline-none cursor-pointer"
                        >
                          {availableTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Academic Year</label>
                        <select
                          value={period.year}
                          onChange={(e) => setPeriod((p) => ({ ...p, year: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-bold text-[#000435] outline-none cursor-pointer"
                        >
                          {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Error messages */}
                  {step3HasErrors && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-1">
                      {amountErrors.zero && <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Amount must be greater than zero.</p>}
                      {amountErrors.exceeds && <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Amount exceeds remaining balance ({fmt(remainingPayable)} RWF).</p>}
                      {amountErrors.duplicate && <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> A pending or approved request already exists for this period.</p>}
                      {amountErrors.fullyPaid && <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Staff is already fully paid for this period.</p>}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Review ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-[#000435]">Ready to Submit</p>
                      <p className="text-[9px] text-slate-500 font-medium">Review the details below before confirming</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    {[
                      { label: 'Staff Name', value: selectedStaff?.fullName || '—' },
                      { label: 'Staff Code', value: selectedStaff ? getStaffCode(selectedStaff) : '—' },
                      { label: 'Role', value: selectedStaff?.role || '—' },
                      { label: 'Period', value: `${period.month} · ${normalizedPeriodTerm} · ${payrollYear}` },
                      { label: 'Final Payable', value: `${fmt(finalPayable)} RWF` },
                      { label: 'Amount to Pay', value: `${fmt(amount)} RWF`, highlight: true },
                    ].map(({ label, value, highlight }, i) => (
                      <div key={i} className={`flex justify-between items-center px-4 py-3 ${i < 5 ? 'border-b border-slate-100' : ''} ${highlight ? 'bg-[#000435]/3' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                        <span className={`text-[11px] font-black ${highlight ? 'text-[#FEBF10] text-[13px]' : 'text-[#000435]'}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* FIX: show a warning if amount is 0 so user knows why button may be disabled */}
                  {amount <= 0 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1.5">
                        <AlertCircle size={11} /> Go back to Step 3 and enter a valid amount.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={13} /> Back
              </button>

              {step < 4 ? (
                <button
                  onClick={handleContinue}
                  disabled={
                    (step === 1 && !selectedStaffId) ||
                    (step === 2 && !selectedStaff) ||
                    (step === 3 && step3HasErrors)
                  }
                  className="h-10 px-5 rounded-xl bg-[#000435] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#000435]/90 disabled:opacity-40 transition-all shadow-lg shadow-[#000435]/20"
                >
                  Continue <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={submitPayrollRequest}
                  disabled={!(amount > 0) || step3HasErrors || loading.requests}
                  className="h-10 px-5 rounded-xl bg-[#FEBF10] text-[#000435] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#FEBF10]/90 disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-[#FEBF10]/30"
                >
                  {loading.requests ? <Loader2 size={13} className="animate-spin" /> : <TrendingUp size={13} />}
                  {loading.requests ? 'Saving...' : 'Save Request'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══ DETAIL DRAWER ══════════════════════════════════════════ */}
      {detailRow && createPortal(
        <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailRow(null)} />
          <div
            className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ borderRadius: '24px 24px 0 0' }}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payroll Record</p>
                <p className="text-[13px] font-black text-[#000435] mt-0.5">{detailRow.staffName}</p>
              </div>
              <button onClick={() => setDetailRow(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
                <X size={14} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-1">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-[10px] font-bold text-slate-400">Status</span>
                <StatusBadge status={detailRow.status} />
              </div>
              {[
                ['Period', `${detailRow.month} · ${detailRow.term} · ${detailRow.year}`],
                ['Basic Salary', `${fmt(detailRow.basic)} RWF`],
                ['Allowances', `${fmt(detailRow.allowances)} RWF`],
                ['Deductions', `- ${fmt(detailRow.deductions)} RWF`],
                ['Net Salary', `${fmt(detailRow.netSalary)} RWF`],
                ['Amount Paid', `${fmt(detailRow.amount)} RWF`],
              ].map(([k, v], i) => (
                <div key={k} className={`flex justify-between py-2 ${i < 5 ? 'border-b border-slate-50' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-400">{k}</span>
                  <span className={`text-[11px] font-black ${k === 'Amount Paid' ? 'text-emerald-600' : k === 'Deductions' ? 'text-red-500' : 'text-[#000435]'}`}>{v}</span>
                </div>
              ))}
            </div>

            <div className="px-5 pb-6">
              <button onClick={() => setDetailRow(null)} className="w-full h-10 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <PortalToast toast={toast} />
    </>
  );
}