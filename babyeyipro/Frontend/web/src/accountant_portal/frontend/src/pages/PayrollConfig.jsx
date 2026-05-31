import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  CheckCircle2, Loader2, Plus, Search, X,
  ChevronRight, Calculator, Banknote, Calendar, ChevronLeft, ChevronDown, User,
  TrendingUp, AlertCircle, RefreshCw, Filter
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PortalToast from '../components/PortalToast';
import AccountantOchreHero from '../components/AccountantOchreHero';
import api from '../services/api';
import PayrollExportBar from '../../../../shared/payroll/PayrollExportBar';
import PayrollPaymentTrackerPanel from '../../../../shared/payroll/PayrollPaymentTrackerPanel';
import PayrollWorkspaceTabs from '../../../../shared/payroll/PayrollWorkspaceTabs';
import PayrollInvoiceDetailPanel from '../../../../shared/payroll/PayrollInvoiceDetailPanel';
import PayrollInvoiceSlideModal from '../../../../shared/payroll/PayrollInvoiceSlideModal';
import { collectAcademicYears, findPayrollPeriodTemplate } from '../../../../shared/payroll/payrollHelpers';
import { buildPayrollInvoiceBreakdown, payrollInvoiceMeta } from '../../../../shared/payroll/payrollInvoiceBreakdown';
import { exportPayrollRequestsExcel, exportPayrollRequestsPdf } from '../../../../shared/payroll/payrollExport';
import {
  parseManagerAcademicSettings,
  termsForRegistryYear,
  inferCurrentTerm,
  yearOptionLabel,
} from '../utils/academicCalendarFilters';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STEP_LABELS = ['Select Staff', 'Salary Details', 'Amount to Pay', 'Review'];
const PAYROLL_PAGE_SIZE = 12;

const DEFAULT_FILTERS = {
  month: 'All',
  role: 'All',
  query: '',
  term: 'All',
  academicYear: 'All',
  status: 'All',
  dateFrom: '',
  dateTo: '',
  dateField: 'submitted',
};

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
const normalizeTerm = (t) => (String(t || '').includes('1') ? 'Term 1' : String(t || '').includes('3') ? 'Term 3' : 'Term 2');
const toPayrollYear = (y) => {
  const txt = String(y || '').trim();
  const m = txt.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) return Number(m[1]);
  const n = Number(txt);
  return Number.isFinite(n) ? n : new Date().getFullYear();
};
const getStaffCode = (s) => s?.staffCode || `SS-${String(s?.staffUserId || '').padStart(3, '0')}`;

function termMatchesFilter(rowTerm, filterTerm) {
  if (!filterTerm || filterTerm === 'All') return true;
  const a = normalizeTerm(rowTerm).toLowerCase().replace(/\s/g, '');
  const b = normalizeTerm(filterTerm).toLowerCase().replace(/\s/g, '');
  return a === b || a.includes(b.replace('term', '')) || b.includes(a.replace('term', ''));
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { cls: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-widest border ${cfg.cls}`}>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-300 ${done ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : active ? 'bg-[#000435] text-[#FEBF10] shadow-lg shadow-[#000435]/20'
                  : 'bg-slate-100 text-slate-400'
                }`}>
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-[8px] font-medium uppercase tracking-wider hidden sm:block ${active ? 'text-[#000435]' : done ? 'text-emerald-500' : 'text-slate-400'}`}>
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
      <p className="text-base sm:text-xl font-medium text-[#000435] tracking-tight tabular-nums">{value}</p>
      <p className="text-[8px] sm:text-[9px] font-medium text-[#000435]/50 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  );
}

export default function PayrollConfig() {
  const navigate = useNavigate();
  const location = useLocation();

  const [requests, setRequests] = useState([]);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState({ requests: false, staff: false, advance: false, action: false });
  const [paymentRequestModal, setPaymentRequestModal] = useState({ open: false, row: null, amount: '' });
  const [toast, setToast] = useState({ type: '', message: '' });
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(1);
  const [staffList, setStaffList] = useState([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [period, setPeriod] = useState({
    month: MONTHS[new Date().getMonth()],
    term: '',
    year: '',
    amount: '',
  });
  const [academicSettings, setAcademicSettings] = useState({
    term: '',
    year: '',
    loaded: false,
  });
  const [academicRegistry, setAcademicRegistry] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [advance, setAdvance] = useState({ monthlyDeduction: 0, deductionApplied: 0, approvedCount: 0 });
  const [selectedRow, setSelectedRow] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceExtras, setInvoiceExtras] = useState({ staff: null, advance: null, details: null });
  const [showFilters, setShowFilters] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('requests');

  const schoolName = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.school?.name || u?.school_name || '';
    } catch {
      return '';
    }
  }, []);

  const trackerYearOptions = useMemo(
    () => collectAcademicYears(requests, availableYears),
    [requests, availableYears],
  );

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
    if (filters.term !== 'All') params.term = filters.term;
    if (filters.academicYear !== 'All') {
      params.academic_year = filters.academicYear;
      const y = toPayrollYear(filters.academicYear);
      if (y >= 2000 && y <= 3000) params.year = y;
    }
    if (filters.dateFrom) {
      params.date_from = filters.dateFrom;
      params.date_field = filters.dateField || 'submitted';
    }
    if (filters.dateTo) {
      params.date_to = filters.dateTo;
      params.date_field = filters.dateField || 'submitted';
    }
    const q = String(filters.query || '').trim();
    if (q) params.query = q;

    api.get('/accountant/payroll-requests', { params })
      .then((res) => {
        if (res.data?.success === false) throw new Error(res.data?.message || 'Failed to load payroll');
        setRequests(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch((e) => notify('error', e?.response?.data?.message || e?.message || 'Failed to load payroll'))
      .finally(() => setLoading((p) => ({ ...p, requests: false })));
  }, [filters.month, filters.term, filters.academicYear, filters.dateFrom, filters.dateTo, filters.dateField, filters.query, notify]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [filters.month, filters.role, filters.query, filters.term, filters.academicYear, filters.status, filters.dateFrom, filters.dateTo, filters.dateField]);

  useEffect(() => {
    if (workspaceTab !== 'requests') setShowFilters(false);
  }, [workspaceTab]);

  useEffect(() => {
    if (!showFilters) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowFilters(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFilters]);

  useEffect(() => {
    if (!selectedRow?.staffUserId) {
      setInvoiceExtras({ staff: null, advance: null, details: null });
      return undefined;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    const reqId = Number(selectedRow.id);
    Promise.all([
      reqId ? api.get(`/accountant/payroll-requests/${reqId}/details`).catch(() => null) : Promise.resolve(null),
      api.get(`/accountant/payroll/advance-check/${selectedRow.staffUserId}`).catch(() => null),
      api.get('/accountant/payroll/staff/search', {
        params: { query: selectedRow.staffCode || selectedRow.staffName || '', limit: 15 },
      }).catch(() => null),
    ])
      .then(([detailsRes, advanceRes, staffRes]) => {
        if (cancelled) return;
        const staffList = Array.isArray(staffRes?.data?.data) ? staffRes.data.data : [];
        const staff =
          staffList.find((s) => Number(s.staffUserId) === Number(selectedRow.staffUserId)) || staffList[0] || null;
        setInvoiceExtras({
          details: detailsRes?.data?.data || null,
          advance: advanceRes?.data?.data || null,
          staff,
        });
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedRow?.id, selectedRow?.staffUserId, selectedRow?.staffCode, selectedRow?.staffName]);

  const enrichedRow = useMemo(() => {
    if (!selectedRow) return null;
    const d = invoiceExtras.details;
    return d ? { ...selectedRow, ...d } : selectedRow;
  }, [selectedRow, invoiceExtras.details]);

  const invoiceBreakdown = useMemo(() => {
    if (!enrichedRow) return {};
    return buildPayrollInvoiceBreakdown(enrichedRow, invoiceExtras.staff, invoiceExtras.advance);
  }, [enrichedRow, invoiceExtras.staff, invoiceExtras.advance]);

  const payrollInvoice = useMemo(() => (enrichedRow ? payrollInvoiceMeta(enrichedRow) : null), [enrichedRow]);

  useEffect(() => {
    if (!selectedRow?.id) return;
    const fresh = requests.find((r) => Number(r.id) === Number(selectedRow.id));
    if (fresh) setSelectedRow(fresh);
  }, [requests]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── handle return from SalaryPayment ───────────────────────
  useEffect(() => {
    if (!location.state?.payrollPaymentSaved) return;
    notify('success', 'Payment saved successfully.');
    navigate(location.pathname, { replace: true, state: {} });
    setLoading((p) => ({ ...p, requests: true }));
    api.get('/accountant/payroll-requests', { params: { _ts: Date.now() } })
      .then((res) => {
        if (res.data?.success !== false) {
          setRequests(Array.isArray(res.data?.data) ? res.data.data : []);
        }
      })
      .catch(() => { })
      .finally(() => setLoading((p) => ({ ...p, requests: false })));
  }, [location.state?.payrollPaymentSaved]); // eslint-disable-line

  // ── Manager preferences: Settings → Preferences (academic calendar) ──
  useEffect(() => {
    api.get('/dos/academic-calendar-settings')
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const year = parsed.currentYear || String(new Date().getFullYear());
        const term = parsed.defaultTerm || inferCurrentTerm(parsed.defaultTerms);
        const years = parsed.years?.length ? parsed.years : [year];

        setAcademicRegistry(parsed.registry);
        setAcademicSettings({ term, year, loaded: true });
        setAvailableYears(years);
        setPeriod((p) => ({
          ...p,
          term,
          year,
        }));
      })
      .catch(() => { });
  }, []);

  const periodTermOptions = useMemo(() => {
    const y = period.year || academicSettings.year;
    const terms = termsForRegistryYear(academicRegistry, y);
    return terms.length ? terms : ['Term 1', 'Term 2', 'Term 3'];
  }, [academicRegistry, period.year, academicSettings.year]);

  const applyManagerPeriodDefaults = useCallback(() => {
    if (!academicSettings.loaded) return;
    const terms = termsForRegistryYear(academicRegistry, academicSettings.year);
    const term = terms.includes(academicSettings.term)
      ? academicSettings.term
      : inferCurrentTerm(terms);
    setPeriod((p) => ({
      ...p,
      term,
      year: academicSettings.year,
    }));
  }, [academicSettings, academicRegistry]);

  const handlePeriodYearChange = (year) => {
    const terms = termsForRegistryYear(academicRegistry, year);
    const nextTerm = terms.includes(period.term) ? period.term : inferCurrentTerm(terms);
    setPeriod((p) => ({ ...p, year, term: nextTerm }));
  };

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

  // ── filtered table (client refinements on server-filtered list) ──
  const filtered = useMemo(() =>
    requests.filter((r) => {
      const roleOk = filters.role === 'All' || String(r.role || '').toLowerCase() === String(filters.role || '').toLowerCase();
      const statusOk = filters.status === 'All' || r.status === filters.status;
      const termOk = termMatchesFilter(r.term, filters.term);
      return roleOk && statusOk && termOk;
    }),
    [filters.role, filters.status, filters.term, requests]);

  const pagination = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAYROLL_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAYROLL_PAGE_SIZE;
    return {
      totalPages,
      safePage,
      paginated: filtered.slice(start, start + PAYROLL_PAGE_SIZE),
      start: filtered.length === 0 ? 0 : start + 1,
      end: Math.min(safePage * PAYROLL_PAGE_SIZE, filtered.length),
    };
  }, [filtered, page]);

  useEffect(() => {
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [page, pagination.totalPages]);

  const roleOptions = useMemo(() => ['All', ...Array.from(new Set(requests.map((r) => r.role).filter(Boolean)))], [requests]);

  const termFilterOptions = useMemo(() => {
    const yearForTerms = filters.academicYear !== 'All' ? filters.academicYear : academicSettings.year;
    const terms = termsForRegistryYear(academicRegistry, yearForTerms);
    return ['All', ...(terms.length ? terms : ['Term 1', 'Term 2', 'Term 3'])];
  }, [academicRegistry, filters.academicYear, academicSettings.year]);

  const academicYearFilterOptions = useMemo(
    () => ['All', ...trackerYearOptions],
    [trackerYearOptions],
  );

  const dateFilterActive = Boolean(filters.dateFrom || filters.dateTo);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.term !== 'All') n += 1;
    if (filters.academicYear !== 'All') n += 1;
    if (filters.month !== 'All') n += 1;
    if (filters.status !== 'All') n += 1;
    if (filters.role !== 'All') n += 1;
    if (dateFilterActive) n += 1;
    return n;
  }, [filters.term, filters.academicYear, filters.month, filters.status, filters.role, dateFilterActive]);

  const clearPayrollFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
  };

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((r) => r.status === 'Pending').length,
    paid: filtered.filter((r) => r.status === 'Paid').length,
    totalPaid: filtered.filter((r) => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0),
  }), [filtered]);

  // ── modal helpers ───────────────────────────────────────────
  const openCreate = () => {
    setOpenModal(true);
    setStep(1);
    setSearchStaff('');
    setSelectedStaffId('');
    setPeriod({
      month: MONTHS[new Date().getMonth()],
      term: academicSettings.term || '',
      year: academicSettings.year || '',
      amount: '',
    });
  };

  // FIX: step 2 → 3: compute suggested amount BEFORE setting state,
  // so the amount useMemo re-derives correctly on the very first render of step 3.
  const handleContinue = () => {
    if (step === 2) {
      const suggested = Math.max(0, Math.round(remainingPayable > 0 ? remainingPayable : finalPayable));
      const terms = termsForRegistryYear(academicRegistry, academicSettings.year || period.year);
      const term = academicSettings.loaded
        ? (terms.includes(academicSettings.term) ? academicSettings.term : inferCurrentTerm(terms))
        : period.term;
      setPeriod((p) => ({
        ...p,
        amount: suggested > 0 ? String(suggested) : '',
        term,
        year: academicSettings.year || p.year,
      }));
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

  const openPaymentRequestModal = (trackerRow) => {
    setPaymentRequestModal({
      open: true,
      row: trackerRow,
      amount: String(Math.round(Number(trackerRow?.remaining || 0))),
    });
  };

  const confirmPaymentRequest = async () => {
    const trackerRow = paymentRequestModal.row;
    const payAmount = Number(paymentRequestModal.amount || 0);
    if (!trackerRow) return;
    if (!(payAmount > 0)) return notify('error', 'Amount must be greater than zero.');
    if (payAmount > Number(trackerRow.remaining || 0)) {
      return notify('error', `Amount exceeds remaining balance (${fmt(trackerRow.remaining)} RWF).`);
    }

    const template = findPayrollPeriodTemplate(requests, trackerRow);
    const finalPayable = Number(trackerRow.finalPayable || template?.finalPayable || payAmount);

    setLoading((p) => ({ ...p, action: true }));
    try {
      const res = await api.post('/accountant/payroll-requests', {
        staffUserId: Number(trackerRow.staffUserId),
        staffCode: trackerRow.staffCode || template?.staffCode,
        staffName: trackerRow.staffName || template?.staffName,
        role: template?.role || 'STAFF',
        department: template?.department || template?.role || 'STAFF',
        month: trackerRow.month,
        term: trackerRow.term,
        year: Number(trackerRow.year),
        academicYear: String(trackerRow.academicYear || trackerRow.year),
        amount: payAmount,
        basic: Number(template?.basic || 0),
        allowances: Number(template?.allowances || 0),
        deductions: Number(template?.deductions || 0),
        netSalary: Number(template?.netSalary || finalPayable),
        advance: Number(template?.advance || 0),
        finalPayable,
      });
      notify('success', res.data?.message || 'Payment request sent to school manager for approval.');
      setPaymentRequestModal({ open: false, row: null, amount: '' });
      fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || e?.message || 'Failed to submit payment request');
    } finally {
      setLoading((p) => ({ ...p, action: false }));
    }
  };

  const submitPayrollRequest = async () => {
    if (!selectedStaff) return notify('error', 'Select staff first.');
    if (!period.term || !period.year) {
      return notify('error', 'Academic term and year are required. Ensure the manager has set preferences in Settings.');
    }
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

  const exportRequestsExcel = () => exportPayrollRequestsExcel({
    rows: filtered,
    portalLabel: 'Accountant — Payroll requests',
    filename: `accountant-payroll-requests-${Date.now()}.xlsx`,
  });

  const exportRequestsPdf = () => exportPayrollRequestsPdf({
    rows: filtered,
    portalLabel: 'Accountant — Payroll requests',
    schoolName,
    filename: `accountant-payroll-requests-${Date.now()}.pdf`,
  });

  return (
    <>
      <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>

        <AccountantOchreHero
          eyebrow="Finance · Payroll"
          titleLine="Payroll"
          titleAccent="Management"
          subtitle="View records & prepare staff salaries"
          icon={Calculator}
        />

        {/* ── Main card ────────────────────────────────────── */}
        <div className="acct-shell-standard pb-16">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">

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
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={filters.query}
                    onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                    placeholder="Search staff, code, role…"
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#000435]/40 focus:bg-white transition-all"
                  />
                </div>
                {workspaceTab === 'requests' && (
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    aria-expanded={showFilters}
                    aria-controls="payroll-filters-panel"
                    className={`h-10 px-4 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 transition-all ${
                      showFilters
                        ? 'bg-[#000435] text-[#FEBF10] border-[#000435] shadow-md shadow-[#000435]/15'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#000435]/30 hover:text-[#000435]'
                    }`}
                  >
                    <Filter size={13} />
                    <span>{showFilters ? 'Close filters' : 'Filters'}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`}
                    />
                    {!showFilters && activeFilterCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-[#000435] text-[#FEBF10]">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )}
                <PayrollWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} className="w-full lg:w-auto shrink-0" />
              </div>

              {workspaceTab === 'requests' && showFilters && (
                <div
                  id="payroll-filters-panel"
                  className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar size={14} className="text-[#000435]/50 shrink-0" />
                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#000435]/50">Filters</span>
                    <div className="ml-auto flex items-center gap-2">
                      {(dateFilterActive || filters.term !== 'All' || filters.academicYear !== 'All' || filters.status !== 'All' || filters.month !== 'All' || filters.role !== 'All') && (
                        <button
                          type="button"
                          onClick={clearPayrollFilters}
                          className="text-[8px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#000435] flex items-center gap-1"
                        >
                          Clear all
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-[#000435] transition-colors"
                        aria-label="Close filters"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <label className="col-span-2 sm:col-span-1">
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Term</span>
                      <select
                        value={filters.term}
                        onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                      >
                        {termFilterOptions.map((t) => <option key={t} value={t}>{t === 'All' ? 'All terms' : t}</option>)}
                      </select>
                    </label>
                    <label className="col-span-2 sm:col-span-1">
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Academic year</span>
                      <select
                        value={filters.academicYear}
                        onChange={(e) => setFilters((p) => ({ ...p, academicYear: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                      >
                        {academicYearFilterOptions.map((y) => <option key={y} value={y}>{y === 'All' ? 'All years' : y}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Month</span>
                      <select
                        value={filters.month}
                        onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                      >
                        <option value="All">All</option>
                        {MONTHS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Status</span>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                      >
                        <option value="All">All</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </label>
                    <label>
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Role</span>
                      <select
                        value={filters.role}
                        onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 outline-none focus:border-[#000435]/40 cursor-pointer"
                      >
                        {roleOptions.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400">Date range</span>
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
                        {[
                          { id: 'submitted', label: 'Submitted' },
                          { id: 'paid', label: 'Paid' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFilters((p) => ({ ...p, dateField: opt.id }))}
                            className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-colors ${
                              filters.dateField === opt.id ? 'bg-[#000435] text-[#FEBF10]' : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">From</span>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                          className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50 focus:border-[#000435]/40 outline-none"
                        />
                      </label>
                      <label>
                        <span className="text-[7px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">To</span>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                          min={filters.dateFrom || undefined}
                          className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50 focus:border-[#000435]/40 outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center justify-end">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button type="button" onClick={fetchRequests} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all" title="Refresh">
                    <RefreshCw size={13} />
                  </button>
                  {workspaceTab === 'requests' && (
                    <PayrollExportBar
                      compact
                      disabled={!filtered.length}
                      onExportExcel={exportRequestsExcel}
                      onExportPdf={exportRequestsPdf}
                    />
                  )}
                  {workspaceTab === 'requests' && (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="h-10 px-4 rounded-xl bg-[#000435] text-[#FEBF10] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#000435]/90 active:scale-95 transition-all shadow-lg shadow-[#000435]/20"
                    >
                      <Plus size={13} /> <span className="hidden sm:inline">Create Payment</span><span className="sm:hidden">New</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {workspaceTab === 'tracker' && (
              <PayrollPaymentTrackerPanel
                requests={requests}
                loading={loading.requests}
                portalLabel="Accountant — Payment tracker"
                schoolName={schoolName}
                academicYearOptions={trackerYearOptions}
                showFinishAction
                canFinishPayment
                finishActionLabel="Request payment"
                finishActionHint="No remaining balance"
                onFinishPayment={openPaymentRequestModal}
              />
            )}

            {workspaceTab === 'requests' && (
            <>
            <div className="flex w-full min-h-0 flex-col">
            <div className="w-full min-w-0 overflow-x-auto">
              <table className="w-full table-fixed sm:table-auto border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="w-[38%] sm:w-auto px-3 sm:px-5 py-3 text-left text-[8px] font-medium text-slate-400 uppercase tracking-widest">Staff</th>
                    <th className="hidden md:table-cell px-4 sm:px-5 py-3 text-left text-[8px] font-medium text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="hidden lg:table-cell px-4 sm:px-5 py-3 text-left text-[8px] font-medium text-slate-400 uppercase tracking-widest">Period</th>
                    <th className="w-[22%] sm:w-auto px-3 sm:px-5 py-3 text-right text-[8px] font-medium text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="w-[18%] sm:w-auto px-3 sm:px-5 py-3 text-left sm:text-center text-[8px] font-medium text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="w-[22%] sm:w-auto px-2 sm:px-5 py-3 text-right text-[8px] font-medium text-slate-400 uppercase tracking-widest"> </th>
                  </tr>
                </thead>
                <tbody>
                  {loading.requests && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Loader2 size={20} className="animate-spin mx-auto text-[#FEBF10] mb-2" />
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Loading payroll…</p>
                    </td></tr>
                  )}
                  {!loading.requests && filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-16 text-center">
                      <Calculator size={28} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-[11px] font-medium text-slate-400">No payroll records found</p>
                    </td></tr>
                  )}
                  {!loading.requests && pagination.paginated.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        selectedRow?.id === row.id ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-200/80' : ''
                      }`}
                      onClick={() => setSelectedRow(row)}
                    >
                      <td className="px-3 sm:px-5 py-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#000435]/8 flex items-center justify-center shrink-0">
                            <User size={12} className="text-[#000435]/50" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[#000435] truncate">{row.staffName}</p>
                            <p className="text-[8px] font-mono text-slate-400 tracking-wider truncate">{row.staffCode}</p>
                            <p className="md:hidden text-[8px] text-slate-500 font-medium truncate mt-0.5">
                              {row.role || '—'} · {row.month}
                            </p>
                            <p className="hidden md:block lg:hidden text-[8px] text-slate-500 font-medium mt-0.5 truncate">
                              {row.month} · {row.term} · {row.year}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-5 py-3 align-middle">
                        <span className="text-[10px] font-medium text-slate-600">{row.role || '—'}</span>
                      </td>
                      <td className="hidden lg:table-cell px-4 sm:px-5 py-3 align-middle">
                        <p className="text-[10px] font-medium text-[#000435]">{row.month}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{row.term} · {row.year}</p>
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-right align-middle">
                        <p className="text-[11px] font-medium text-[#000435] tabular-nums">{fmt(row.amount)}</p>
                        <p className="text-[7px] text-slate-400 font-medium uppercase">RWF</p>
                      </td>
                      <td className="px-3 sm:px-5 py-3 align-middle">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-2 sm:px-5 py-3 text-right align-middle">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1 sm:gap-1.5">
                          {row.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigateToPayment(row); }}
                              className="h-8 sm:h-7 px-2.5 sm:px-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 text-[8px] sm:text-[9px] font-medium uppercase tracking-wider hover:bg-emerald-100 transition-all whitespace-nowrap"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedRow(row); }}
                            className="h-8 sm:h-7 px-2.5 sm:px-3 rounded-lg bg-[#000435] text-[#FEBF10] text-[8px] sm:text-[9px] font-medium uppercase tracking-wider hover:bg-[#000435]/90 transition-all whitespace-nowrap shadow-sm"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-center sm:text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">
                  {filtered.length} records · tap row for invoice
                </span>
              </div>

              {filtered.length > 0 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.safePage <= 1}
                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-white shadow-sm transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 tabular-nums min-w-[140px] text-center">
                    Page {pagination.safePage} of {pagination.totalPages}
                    <span className="text-slate-300 mx-1">·</span>
                    {pagination.start}–{pagination.end} of {filtered.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.safePage >= pagination.totalPages}
                    className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-white shadow-sm transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* ══ CREATE PAYMENT MODAL ══════════════════════════════════ */}
      {openModal && createPortal(
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpenModal(false)} />

          <div
            className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-sm flex flex-col overflow-hidden"
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
                    <p className="text-[11px] font-medium text-white">Process Payroll</p>
                    <p className="text-[9px] text-white/40 font-medium">Step {step} of {STEP_LABELS.length} — {STEP_LABELS[step - 1]}</p>
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
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Searching…</p>
                      </div>
                    ) : staffList.length === 0 ? (
                      <div className="py-10 text-center">
                        <User size={24} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-medium text-slate-400">No staff found</p>
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
                              <p className="text-[12px] font-medium text-[#000435] truncate">{s.fullName}</p>
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
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-center text-[11px] font-medium text-red-600">
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
                      <p className="text-[13px] font-medium text-[#000435]">{selectedStaff.fullName}</p>
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
                        <p className="text-[8px] text-slate-400 font-medium uppercase tracking-wider leading-tight mb-1.5">{label}</p>
                        <p className={`text-[13px] font-medium ${color} tabular-nums`}>{fmt(value)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2.5">
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Payment Summary</p>
                    {[
                      { label: 'Total Earnings', value: totalEarnings, cls: 'text-[#000435]' },
                      { label: 'Total Deductions', value: totalDeductions, cls: 'text-red-500' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-slate-500">{label}</span>
                        <span className={`text-[12px] font-medium tabular-nums ${cls}`}>{fmt(value)} RWF</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-medium text-[#000435]">Payable Amount</span>
                      <span className="text-[14px] font-medium text-emerald-600 tabular-nums">{fmt(remainingPayable)} RWF</span>
                    </div>
                  </div>

                  {/* Advance */}
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                    <p className="text-[9px] font-medium text-amber-600 uppercase tracking-widest mb-2">Advance Deductions</p>
                    {loading.advance ? (
                      <Loader2 size={13} className="animate-spin text-amber-500" />
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Approved Advances</span>
                          <span className="font-medium text-[#000435]">{advance.approvedCount}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Monthly Deduction</span>
                          <span className="font-medium text-red-500">{fmt(advance.monthlyDeduction)} RWF</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 border-t border-amber-200">
                          <span className="text-slate-500 font-medium">Applied This Payroll</span>
                          <span className="font-medium text-amber-600">{fmt(advanceDeductionApplied)} RWF</span>
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
                        <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">Amount (RWF) *</label>
                        <input
                          value={period.amount}
                          onChange={(e) => setPeriod((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[14px] font-medium text-[#000435] tabular-nums outline-none transition-all"
                          placeholder="0"
                          inputMode="numeric"
                        />
                        {remainingPayable > 0 && (
                          <button
                            type="button"
                            onClick={() => setPeriod((p) => ({ ...p, amount: String(Math.round(remainingPayable)) }))}
                            className="mt-1.5 text-[9px] font-medium text-[#000435]/60 hover:text-[#000435] underline underline-offset-2"
                          >
                            Fill max: {fmt(remainingPayable)} RWF
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">Month</label>
                        <select
                          value={period.month}
                          onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-medium text-[#000435] outline-none cursor-pointer"
                        >
                          {MONTHS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                     
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">
                          Term {academicSettings.loaded && period.term === academicSettings.term ? '(current)' : ''}
                        </label>
                        <select
                          value={period.term}
                          onChange={(e) => setPeriod((p) => ({ ...p, term: e.target.value }))}
                          disabled={!academicSettings.loaded}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-medium text-[#000435] outline-none cursor-pointer disabled:opacity-60"
                        >
                          {periodTermOptions.map((t) => (
                            <option key={t} value={t}>{t}{t === academicSettings.term ? ' — current' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-2">
                          Academic year {academicSettings.loaded && period.year === academicSettings.year ? '(current)' : ''}
                        </label>
                        <select
                          value={period.year}
                          onChange={(e) => handlePeriodYearChange(e.target.value)}
                          disabled={!academicSettings.loaded}
                          className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 focus:border-[#000435]/50 text-[11px] font-medium text-[#000435] outline-none cursor-pointer disabled:opacity-60"
                        >
                          {availableYears.map((y) => {
                            const row = academicRegistry.find((r) => String(r.academic_year) === String(y));
                            return (
                              <option key={y} value={y}>
                                {yearOptionLabel(row) || y}{y === academicSettings.year ? ' — current' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Error messages */}
                  {step3HasErrors && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-1">
                      {amountErrors.zero && <p className="text-[10px] font-medium text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Amount must be greater than zero.</p>}
                      {amountErrors.exceeds && <p className="text-[10px] font-medium text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Amount exceeds remaining balance ({fmt(remainingPayable)} RWF).</p>}
                      {amountErrors.duplicate && <p className="text-[10px] font-medium text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> A pending or approved request already exists for this period.</p>}
                      {amountErrors.fullyPaid && <p className="text-[10px] font-medium text-red-600 flex items-center gap-1.5"><AlertCircle size={11} /> Staff is already fully paid for this period.</p>}
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
                      <p className="text-[12px] font-medium text-[#000435]">Ready to Submit</p>
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
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
                        <span className={`text-[11px] font-medium ${highlight ? 'text-[#FEBF10] text-[13px]' : 'text-[#000435]'}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* FIX: show a warning if amount is 0 so user knows why button may be disabled */}
                  {amount <= 0 && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <p className="text-[10px] font-medium text-amber-700 flex items-center gap-1.5">
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
                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5 hover:bg-white disabled:opacity-30 transition-all"
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
                  className="h-10 px-5 rounded-xl bg-[#000435] text-white text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#000435]/90 disabled:opacity-40 transition-all shadow-lg shadow-[#000435]/20"
                >
                  Continue <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={submitPayrollRequest}
                  disabled={!(amount > 0) || step3HasErrors || loading.requests}
                  className="h-10 px-5 rounded-xl bg-[#FEBF10] text-[#000435] text-[10px] font-medium uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#FEBF10]/90 disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-[#FEBF10]/30"
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

      {selectedRow && enrichedRow && payrollInvoice && (
        <PayrollInvoiceSlideModal open onClose={() => setSelectedRow(null)}>
          <PayrollInvoiceDetailPanel
            row={enrichedRow}
            invoice={payrollInvoice}
            breakdown={invoiceBreakdown}
            schoolName={schoolName || 'School'}
            loading={invoiceLoading}
            onClose={() => setSelectedRow(null)}
            onPay={navigateToPayment}
          />
        </PayrollInvoiceSlideModal>
      )}

      {paymentRequestModal.open && paymentRequestModal.row && (
        <div className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setPaymentRequestModal({ open: false, row: null, amount: '' })}
          />
          <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white border border-slate-200 shadow-xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Request payment</p>
            <h3 className="text-lg font-semibold text-[#000435] mt-1">{paymentRequestModal.row.staffName}</h3>
            <p className="text-xs text-slate-500">
              {paymentRequestModal.row.month} · {paymentRequestModal.row.term} · {paymentRequestModal.row.year}
            </p>
            <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
              This sends a <strong>pending</strong> payroll request to the school manager. After they approve it, they can mark it as paid to release the funds.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Final payable</span>
                <strong className="text-emerald-700">{fmt(paymentRequestModal.row.finalPayable)} RWF</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already paid</span>
                <strong className="text-blue-700">{fmt(paymentRequestModal.row.paidAmount)} RWF</strong>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">Remaining</span>
                <strong className="text-orange-600">{fmt(paymentRequestModal.row.remaining)} RWF</strong>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Amount to request (RWF)</label>
              <input
                value={paymentRequestModal.amount}
                onChange={(e) => setPaymentRequestModal((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 focus:bg-white transition"
                placeholder="0"
              />
            </div>
            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentRequestModal({ open: false, row: null, amount: '' })}
                className="h-10 px-4 rounded-xl border border-slate-200 text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPaymentRequest}
                disabled={loading.action}
                className="h-10 px-4 rounded-xl bg-[#000435] text-[#FEBF10] text-[11px] font-semibold uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-50 transition active:scale-95"
              >
                {loading.action ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Send to manager
              </button>
            </div>
          </div>
        </div>
      )}

      <PortalToast toast={toast} />
    </>
  );
}