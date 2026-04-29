import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, FileSpreadsheet, FileText, Loader2,
  Plus, Search, XCircle, ChevronRight, Users,
  DollarSign, TrendingUp, Clock, BadgeCheck, Ban,
} from 'lucide-react';
import PortalToast from '../components/PortalToast';
import api from '../services/api';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_CFG = {
  Pending:  { cls: 'bg-amber-100 text-amber-800 border-amber-200',  dot: 'bg-amber-500'   },
  Approved: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  Rejected: { cls: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500'     },
  Paid:     { cls: 'bg-blue-100 text-blue-800 border-blue-200',      dot: 'bg-blue-500'    },
};

const STEP_LABELS = ['Select Staff', 'Salary Check', 'Payment Details', 'Review & Submit'];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (v) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(v) || 0)} RWF`;
const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

function downloadCsv(rows, filename) {
  const csv = rows
    .map((line) => line.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

const toAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const parseMaybeJson = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null);

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${accent}`} />
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${accent} bg-opacity-20`}>
        <Icon size={18} className="text-amber-400" />
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0">
      {STEP_LABELS.map((label, i) => {
        const n       = i + 1;
        const active  = n === current;
        const done    = n < current;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all
                ${done   ? 'bg-amber-500 border-amber-500 text-white'
                : active ? 'bg-[#000435] border-amber-500 text-amber-400'
                :          'bg-white border-slate-200 text-slate-400'}`}>
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-[9px] font-bold mt-1 hidden sm:block whitespace-nowrap
                ${active ? 'text-[#000435]' : done ? 'text-amber-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-16 mx-1 transition-all ${n < current ? 'bg-amber-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function PayrollConfig() {
  /* state */
  const [requests,       setRequests]       = useState([]);
  const [staffList,      setStaffList]      = useState([]);
  const [searchStaff,    setSearchStaff]    = useState('');
  const [selectedStaffId,setSelectedStaffId]= useState('');
  const [advance,        setAdvance]        = useState({
    approvedAdvances: [],
    totalTaken: 0,
    remainingBalance: 0,
    monthlyDeduction: 0,
    deductionApplied: 0,
    carryForward: 0,
  });
  const [period,         setPeriod]         = useState({
    month: MONTHS[new Date().getMonth()], term: 'T2',
    year: String(new Date().getFullYear()), amount: '',
  });
  const [filters,        setFilters]        = useState({ month: 'All', term: 'All', year: 'All', status: 'All' });
  const [step,           setStep]           = useState(1);
  const [openModal,      setOpenModal]      = useState(false);
  const [detailRow,      setDetailRow]      = useState(null);
  const [rejectModal,    setRejectModal]    = useState({ open: false, requestId: null, reason: '' });
  const [finishModal,    setFinishModal]    = useState({ open: false, row: null, amount: '' });
  const [toast,          setToast]          = useState({ type: '', message: '' });
  const [loading,        setLoading]        = useState({ requests: false, staff: false, submit: false, advance: false });

  /* helpers */
  const notify = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(window.__payrollToast);
    window.__payrollToast = setTimeout(() => setToast({ type: '', message: '' }), 3000);
  };

  /* derived */
  const selectedStaff = useMemo(
    () => staffList.find((s) => String(s.staffUserId) === String(selectedStaffId)) || null,
    [staffList, selectedStaffId],
  );

  const salary = useMemo(() => {
    if (!selectedStaff) return { basic: 0, allowances: 0, deductions: 0 };

    // Prefer payroll setup saved from Manager HR Central exposed via accountant staff search.
    if (selectedStaff.payroll) {
      const payroll = selectedStaff.payroll;
      const basic = toAmount(pick(payroll.basicSalary, payroll.payrollBasicSalary, payroll.payroll_basic_salary));
      const fixedAllowances =
        toAmount(pick(payroll.transportAllowance, payroll.payrollTransportAllowance, payroll.payroll_transport_allowance)) +
        toAmount(pick(payroll.housingAllowance, payroll.payrollHousingAllowance, payroll.payroll_housing_allowance)) +
        toAmount(pick(payroll.mealAllowance, payroll.payrollMealAllowance, payroll.payroll_meal_allowance));
      const otherAllowances = parseMaybeJson(pick(payroll.otherAllowances, payroll.payrollOtherAllowances, payroll.payroll_other_allowances))
        .reduce((sum, row) => sum + toAmount(row?.amount), 0);
      const allowances = fixedAllowances + otherAllowances;
      const gross = basic + allowances;

      const taxPercent = toAmount(pick(payroll.taxPercent, payroll.payrollTaxPercent, payroll.payroll_tax_percent));
      const taxAmount = (gross * taxPercent) / 100;
      const pension = toAmount(pick(payroll.pensionAmount, payroll.payrollPensionAmount, payroll.payroll_pension_amount));
      const otherDeductions = parseMaybeJson(pick(payroll.otherDeductions, payroll.payrollOtherDeductions, payroll.payroll_other_deductions))
        .reduce((sum, row) => sum + toAmount(row?.amount), 0);
      const deductions = taxAmount + pension + otherDeductions;
      return { basic, allowances, deductions };
    }

    // Fallback to payroll search endpoint suggestion if staff payroll config is not found
    const basic = Number(selectedStaff.salary?.basic || 0);
    const allowances = Number(selectedStaff.salary?.allowance || 0);
    const deductions = Math.round((basic + allowances) * 0.05);
    return { basic, allowances, deductions };
  }, [selectedStaff]);

  const netSalary    = salary.basic + salary.allowances - salary.deductions;
  const advanceDeductionApplied = Number(advance.deductionApplied ?? advance.monthlyDeduction ?? 0);
  const finalPayable = Math.max(0, netSalary - advanceDeductionApplied);
  const advanceExceedsSalary = Number(advance.monthlyDeduction || 0) > netSalary;
  const amount       = Number(period.amount || 0);
  const trackerRows = useMemo(() => {
    const map = new Map();
    requests.forEach((r) => {
      const key = `${r.staffUserId}__${r.month}__${r.term}__${r.year}`;
      const cur = map.get(key) || {
        key,
        staffUserId: r.staffUserId,
        staffCode: r.staffCode,
        staffName: r.staffName,
        role: r.role,
        department: r.department,
        month: r.month,
        term: r.term,
        year: r.year,
        finalPayable: Number(r.finalPayable || 0),
        paidAmount: 0,
        remainingAmount: 0,
        hasPending: false,
        hasApproved: false,
        hasRejected: false,
        approvedRequestId: null,
        latestRequest: r,
      };
      cur.finalPayable = Math.max(cur.finalPayable, Number(r.finalPayable || 0));
      if (r.status === 'Paid') cur.paidAmount += Number(r.amount || 0);
      if (r.status === 'Pending') cur.hasPending = true;
      if (r.status === 'Approved') {
        cur.hasApproved = true;
        cur.approvedRequestId = r.id;
      }
      if (r.status === 'Rejected') cur.hasRejected = true;
      if (Number(r.id || 0) > Number(cur.latestRequest?.id || 0)) cur.latestRequest = r;
      map.set(key, cur);
    });
    return Array.from(map.values()).map((row) => {
      const remainingAmount = Math.max(0, Number(row.finalPayable || 0) - Number(row.paidAmount || 0));
      let trackerStatus = 'Pending Approval';
      if (row.hasPending) trackerStatus = 'Pending Approval';
      else if (row.hasApproved) trackerStatus = 'Approved';
      else if (remainingAmount === 0 && row.paidAmount > 0) trackerStatus = 'Fully Paid';
      else if (row.paidAmount > 0 && remainingAmount > 0) trackerStatus = 'Partially Paid';
      else if (row.hasRejected) trackerStatus = 'Rejected';
      return {
        ...row,
        remainingAmount,
        trackerStatus,
        canFinishPayment: remainingAmount > 0 && row.paidAmount > 0 && !row.hasPending && !row.hasApproved,
      };
    }).sort((a, b) => Number(b.latestRequest?.id || 0) - Number(a.latestRequest?.id || 0));
  }, [requests]);

  const selectedTrackerRow = useMemo(() => {
    if (!selectedStaff?.staffUserId) return null;
    return trackerRows.find((r) =>
      Number(r.staffUserId) === Number(selectedStaff.staffUserId) &&
      r.month === period.month &&
      r.term === period.term &&
      String(r.year) === String(period.year),
    ) || null;
  }, [trackerRows, period.month, period.term, period.year, selectedStaff]);

  const monthAlreadyFullyPaid = selectedTrackerRow?.trackerStatus === 'Fully Paid';

  const duplicateExists = useMemo(() => {
    if (!selectedStaff) return false;
    return requests.some(
      (r) =>
        Number(r.staffUserId) === Number(selectedStaff.staffUserId) &&
        r.month === period.month && r.term === period.term &&
        String(r.year) === String(period.year) && (r.status === 'Pending' || r.status === 'Approved'),
    );
  }, [period, requests, selectedStaff]);

  const filtered = useMemo(() =>
    requests.filter((r) => {
      const mOk = filters.month  === 'All' || r.month         === filters.month;
      const tOk = filters.term   === 'All' || r.term          === filters.term;
      const yOk = filters.year   === 'All' || String(r.year)  === filters.year;
      const sOk = filters.status === 'All' || r.status        === filters.status;
      return mOk && tOk && yOk && sOk;
    }),
  [filters, requests]);

  const paidByMonth = useMemo(() => {
    const map = {};
    requests.filter((r) => r.status === 'Paid').forEach((r) => {
      map[r.month] = (map[r.month] || 0) + Number(r.amount || 0);
    });
    return Object.entries(map).map(([month, total]) => ({ month, total }));
  }, [requests]);

  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter((r) => r.status === 'Pending').length,
    approved: requests.filter((r) => r.status === 'Approved').length,
    paid:     requests.filter((r) => r.status === 'Paid').length,
    totalPaid: requests.filter((r) => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0),
  }), [requests]);

  /* API calls */
  const fetchRequests = async () => {
    setLoading((p) => ({ ...p, requests: true }));
    try {
      const params = {};
      if (filters.month  !== 'All') params.month  = filters.month;
      if (filters.term   !== 'All') params.term   = filters.term;
      if (filters.year   !== 'All') params.year   = filters.year;
      if (filters.status !== 'All') params.status = filters.status;
      const res = await api.get('/accountant/payroll-requests', { params });
      setRequests(res.data?.data || []);
    } catch (e) {
      notify('error', e?.response?.data?.message || e.message || 'Failed to load payroll requests');
    } finally {
      setLoading((p) => ({ ...p, requests: false }));
    }
  };

  const fetchStaff = async (q = '') => {
    setLoading((p) => ({ ...p, staff: true }));
    try {
      const searchRes = await api.get('/accountant/payroll/staff/search', { params: { query: q, limit: 50 } });
      setStaffList(searchRes.data?.data || []);
    } catch (e) {
      notify('error', e?.response?.data?.message || e.message || 'Failed to search staff');
    } finally {
      setLoading((p) => ({ ...p, staff: false }));
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRequests(); }, [filters.month, filters.term, filters.year, filters.status]);
  useEffect(() => {
    const t = setTimeout(() => fetchStaff(searchStaff), 250);
    return () => clearTimeout(t);
  }, [searchStaff]); /* eslint-disable-line */

  useEffect(() => {
    if (!selectedStaff?.staffUserId) {
      setAdvance({
        approvedAdvances: [],
        totalTaken: 0,
        remainingBalance: 0,
        monthlyDeduction: 0,
        deductionApplied: 0,
        carryForward: 0,
      });
      return;
    }
    setLoading((p) => ({ ...p, advance: true }));
    api.get(`/accountant/payroll/advance-check/${selectedStaff.staffUserId}`)
      .then((res) => {
        const approvedAdvances = Array.isArray(res.data?.data?.approvedAdvances) ? res.data.data.approvedAdvances : [];
        const totalTaken = approvedAdvances.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
        const remainingBalance = approvedAdvances.reduce((sum, row) => sum + Number(row.remainingBalance || 0), 0);
        const monthlyDeduction = approvedAdvances.reduce((sum, row) => sum + Number(row.monthlyPayment || 0), 0);
        const deductionApplied = Math.min(netSalary, monthlyDeduction);
        const carryForward = Math.max(0, monthlyDeduction - deductionApplied);
        setAdvance({
          approvedAdvances,
          totalTaken,
          remainingBalance,
          monthlyDeduction,
          deductionApplied,
          carryForward,
        });
      })
      .catch(() =>
        setAdvance({
          approvedAdvances: [],
          totalTaken: 0,
          remainingBalance: 0,
          monthlyDeduction: 0,
          deductionApplied: 0,
          carryForward: 0,
        }))
      .finally(() => setLoading((p) => ({ ...p, advance: false })));
  }, [selectedStaff?.staffUserId, netSalary]);

  /* modal helpers */
  const closeModal = () => {
    setOpenModal(false); setStep(1); setSearchStaff(''); setSelectedStaffId('');
    setPeriod({ month: MONTHS[new Date().getMonth()], term: 'T2', year: String(new Date().getFullYear()), amount: '' });
    setAdvance({
      approvedAdvances: [],
      totalTaken: 0,
      remainingBalance: 0,
      monthlyDeduction: 0,
      deductionApplied: 0,
      carryForward: 0,
    });
  };

  /* submit */
  const submitRequest = async () => {
    if (!selectedStaff)        return notify('error', 'Select a staff member first.');
    if (amount <= 0)           return notify('error', 'Amount must be greater than zero.');
    if (amount > finalPayable) return notify('error', `Amount exceeds max payable (${fmt(finalPayable)}).`);
    if (duplicateExists)       return notify('error', 'Duplicate payment blocked for this period.');
    if (monthAlreadyFullyPaid) return notify('error', `Salary for ${period.month} is already fully paid. Please select another month.`);
    if (selectedTrackerRow?.remainingAmount > 0 && amount > selectedTrackerRow.remainingAmount) {
      return notify('error', `Amount exceeds remaining balance (${fmt(selectedTrackerRow.remainingAmount)}).`);
    }

    setLoading((p) => ({ ...p, submit: true }));
    try {
      const res = await api.post('/accountant/payroll-requests', {
        staffUserId: Number(selectedStaff.staffUserId),
        staffCode:   selectedStaff.staffCode || `STF-${selectedStaff.staffUserId}`,
        staffName:   selectedStaff.fullName,
        role:        selectedStaff.role || selectedStaff.position || 'STAFF',
        department:  selectedStaff.department || selectedStaff.role || 'STAFF',
        month: period.month, term: period.term, year: Number(period.year),
        amount, basic: salary.basic, allowances: salary.allowances,
        deductions: salary.deductions, netSalary,
        advance: Number(advanceDeductionApplied || 0), finalPayable,
      });
      notify('success', res.data?.message || 'Payroll request sent to School Manager for approval.');
      closeModal();
      await fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || e.message || 'Failed to submit request');
    } finally {
      setLoading((p) => ({ ...p, submit: false }));
    }
  };


  /* decide */
  const decide = async (id, decision, reason = '') => {
    try {
      await api.patch(`/manager/payroll-requests/${id}/decision`, { decision, reason });
      notify('success', 'Status updated successfully.');
      await fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || e.message || 'Failed to update status');
    }
  };

  const startFinishPayment = (row) => {
    setFinishModal({
      open: true,
      row,
      amount: String(Math.round(Number(row?.remainingAmount || 0))),
    });
  };

  const confirmFinishPayment = async () => {
    const row = finishModal.row;
    const payAmount = Number(finishModal.amount || 0);
    if (!row) return;
    if (payAmount <= 0) return notify('error', 'Amount must be greater than zero.');
    if (payAmount > Number(row.remainingAmount || 0)) return notify('error', `Amount exceeds remaining balance (${fmt(row.remainingAmount)}).`);
    setLoading((p) => ({ ...p, submit: true }));
    try {
      const res = await api.post('/accountant/payroll-requests/finish-payment', {
        staffUserId: row.staffUserId,
        month: row.month,
        term: row.term,
        year: Number(row.year),
        amount: payAmount,
      });
      notify('success', res.data?.message || 'Payment updated');
      setFinishModal({ open: false, row: null, amount: '' });
      await fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || e.message || 'Failed to finish payment');
    } finally {
      setLoading((p) => ({ ...p, submit: false }));
    }
  };

  /* export PDF */
  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Payroll Summary', 14, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    let y = 35;
    paidByMonth.forEach(({ month, total }) => { doc.text(`${month}: ${fmt(total)}`, 14, y); y += 8; });
    if (!paidByMonth.length) doc.text('No paid records found.', 14, y);
    doc.save('payroll-summary.pdf');
  };

  /* ── Step content ─────────────────────────────────────────────────────── */
  const stepContent = {
    1: (
      <div className="space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchStaff}
            onChange={(e) => setSearchStaff(e.target.value)}
            className="h-11 w-full pl-10 pr-4 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            placeholder="Search by name or staff ID…"
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Select</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Dept.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading.staff ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Searching…</td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No staff found.</td></tr>
              ) : staffList.map((s) => (
                <tr
                  key={s.staffUserId}
                  className={`cursor-pointer transition hover:bg-amber-50 ${String(selectedStaffId) === String(s.staffUserId) ? 'bg-amber-50' : ''}`}
                  onClick={() => setSelectedStaffId(String(s.staffUserId))}
                >
                  <td className="px-4 py-3">
                    <input
                      type="radio"
                      readOnly
                      checked={String(selectedStaffId) === String(s.staffUserId)}
                      className="accent-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.staffCode || `STF-${s.staffUserId}`}</td>
                  <td className="px-4 py-3 font-semibold text-[#000435]">{s.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.role || s.position || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.department || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),

    2: !selectedStaff ? (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">
        Please go back and select a staff member first.
      </div>
    ) : (
      <div className="space-y-4">
        {/* Salary Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Basic Salary',  value: fmt(salary.basic) },
            { label: 'Allowances',    value: fmt(salary.allowances) },
            { label: 'Deductions',    value: fmt(salary.deductions) },
            { label: 'Net Salary',    value: fmt(netSalary) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">{label}</p>
              <p className="text-base font-black text-[#000435] mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Approved Advances List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Approved Advances</p>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              Monthly installment model
            </span>
          </div>
          {loading.advance ? (
            <div className="space-y-2">
              {[1, 2].map((s) => (
                <div key={s} className="h-20 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : !advance.approvedAdvances.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 font-semibold">
              No approved advances found for this staff. Salary will be paid without advance deduction.
            </div>
          ) : (
            <div className="space-y-3">
              {advance.approvedAdvances.map((row) => (
                <div key={row.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <p className="font-black text-[#000435]">Credit #{row.id}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-100 text-emerald-800 border-emerald-200">
                        Approved
                      </span>
                      {Number(row.remainingMonths || 0) === 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-blue-100 text-blue-800 border-blue-200">
                          Advance completed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Amount</p><p className="font-black text-[#000435]">{fmt(row.totalAmount)}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Interest Rate</p><p className="font-black text-[#000435]">{Number(row.interestRate || 0).toFixed(2)}% / month</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Duration</p><p className="font-black text-[#000435]">{row.months} months</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Principal / Month</p><p className="font-black text-[#000435]">{fmt(row.principalPerMonth)}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Interest / Month</p><p className="font-black text-[#000435]">{fmt(row.interestPerMonth)}</p></div>
                    <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Monthly Deduction</p><p className="font-black text-red-700">{fmt(row.monthlyPayment)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advance Summary + Final Payable */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Advance Summary</p>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Total Monthly Advance Deduction</span><strong className="text-red-700">{fmt(advance.monthlyDeduction)}</strong></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Remaining Total Balance</span><strong className="text-[#000435]">{fmt(advance.remainingBalance)}</strong></div>
            {advance.carryForward > 0 && (
              <div className="flex justify-between text-sm"><span className="text-slate-600">Carry-forward (next payroll)</span><strong className="text-amber-700">{fmt(advance.carryForward)}</strong></div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final Salary Panel</p>
            <div className="flex justify-between"><span className="text-slate-500">Net Salary</span><strong>{fmt(netSalary)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Advance Deduction</span><strong className="text-red-600">- {fmt(advanceDeductionApplied)}</strong></div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between"><span className="font-bold text-[#000435]">Final Payable</span><strong className="text-emerald-700 text-base">{fmt(finalPayable)}</strong></div>
          </div>
        </div>

        {advanceExceedsSalary && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold space-y-1">
            <p>&#9888; Advance deductions exceed salary.</p>
            <p>Deduction is limited to salary for this month. Remaining balance is carried forward automatically.</p>
          </div>
        )}
      </div>
    ),

    3: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Advance Summary</p>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Total Monthly Advance Deduction</span><strong className="text-red-700">{fmt(advance.monthlyDeduction)}</strong></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Remaining Total Balance</span><strong className="text-[#000435]">{fmt(advance.remainingBalance)}</strong></div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Final Salary Panel</p>
            <div className="flex justify-between"><span className="text-slate-500">Net Salary</span><strong>{fmt(netSalary)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Advance Deduction</span><strong className="text-red-600">- {fmt(advanceDeductionApplied)}</strong></div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between"><span className="font-bold text-[#000435]">Final Payable</span><strong className="text-emerald-700 text-base">{fmt(finalPayable)}</strong></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Amount to Pay (RWF)</label>
            <input
              value={period.amount}
              onChange={(e) => setPeriod((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              placeholder="0"
            />
            <p className="text-[10px] text-slate-400 mt-1">Max: {fmt(finalPayable)}</p>
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Month</label>
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            >
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Term</label>
            <select
              value={period.term}
              onChange={(e) => setPeriod((p) => ({ ...p, term: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            >
              {['T1', 'T2', 'T3'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Academic Year</label>
            <input
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: e.target.value.replace(/[^\d]/g, '') }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
            />
          </div>
        </div>
        {(amount > finalPayable || duplicateExists || monthAlreadyFullyPaid || amount <= 0) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold space-y-1">
            {amount > finalPayable  && <p>&#9888; Amount exceeds final payable ({fmt(finalPayable)}).</p>}
            {duplicateExists        && <p>&#9888; Payroll for this Staff + Month + Term + Year already exists and is waiting manager action.</p>}
            {monthAlreadyFullyPaid  && <p>&#9888; Salary for {period.month} is already fully paid. Please select another month.</p>}
            {amount <= 0            && <p>&#9888; Amount must be greater than zero.</p>}
            {(selectedTrackerRow?.remainingAmount > 0 && amount > selectedTrackerRow.remainingAmount) && (
              <p>&#9888; Amount exceeds remaining balance ({fmt(selectedTrackerRow.remainingAmount)}).</p>
            )}
          </div>
        )}
        {selectedTrackerRow?.trackerStatus === 'Pending Approval' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-semibold">
            This payroll request is pending manager approval for {period.month}. Please wait for approve or reject.
          </div>
        )}
      </div>
    ),

    4: (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3 text-sm">
          {[
            ['Staff',            selectedStaff ? `${selectedStaff.fullName} (${selectedStaff.staffCode || `STF-${selectedStaff.staffUserId}`})` : '—'],
            ['Role / Dept.',     selectedStaff ? `${selectedStaff.role || '—'} / ${selectedStaff.department || '—'}` : '—'],
            ['Basic + Allowances – Deductions', `${fmt(salary.basic)} + ${fmt(salary.allowances)} − ${fmt(salary.deductions)}`],
            ['Advance Deduction', fmt(advanceDeductionApplied)],
            ['Carry-forward',    fmt(advance.carryForward)],
            ['Payment Amount',   fmt(amount)],
            ['Period',           `${period.month} / ${period.term} / ${period.year}`],
            ['Status on Submit', 'Pending Approval (School Manager)'],
          ].map(([key, val]) => (
            <div key={key} className="flex flex-wrap justify-between gap-1 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-500 font-semibold">{key}</span>
              <span className="font-black text-[#000435] text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen bg-slate-100 px-3 sm:px-6 lg:px-8 py-6 space-y-5"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <PortalToast toast={toast} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#000435] p-6 sm:p-8 text-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full mb-3">
              Accountant Portal
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
              Payroll Configuration<br />
              <span className="text-amber-400">&amp; Approval Flow</span>
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-lg">
              Submit requests as accountant. Manager reviews, approves, rejects, and marks payments as paid — all persisted with full audit trail.
            </p>
          </div>
          <button
            onClick={() => { setOpenModal(true); fetchStaff(''); }}
            className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#000435] text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 transition shadow-lg shadow-amber-500/30 active:scale-95"
          >
            <Plus size={15} /> Add Payroll
          </button>
        </div>

        {/* stats */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}      label="Total Requests" value={stats.total}               accent="bg-blue-500"   />
          <StatCard icon={Clock}      label="Pending"        value={stats.pending}              accent="bg-amber-500"  />
          <StatCard icon={BadgeCheck} label="Approved"       value={stats.approved}             accent="bg-emerald-500"/>
          <StatCard icon={TrendingUp} label="Total Paid"     value={fmt(stats.totalPaid)}       accent="bg-purple-500" />
        </div>
      </div>

      {/* ── Manager Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">School Manager</p>
            <h2 className="text-base font-black text-[#000435]">Payroll Requests</h2>
          </div>
          {/* filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'month',  opts: ['All', ...MONTHS] },
              { key: 'term',   opts: ['All', 'T1', 'T2', 'T3'] },
              { key: 'year',   opts: ['All', '2024', '2025', '2026', '2027', '2028'] },
              { key: 'status', opts: ['All', 'Pending', 'Approved', 'Rejected', 'Paid'] },
            ].map(({ key, opts }) => (
              <select
                key={key}
                value={filters[key]}
                onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))}
                className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 capitalize"
              >
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Staff</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading.requests ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-1" /> Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No records match the selected filters.</td>
                </tr>
              ) : filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[#000435]">{row.staffName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{row.staffCode}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-700">{row.month} {row.year}</p>
                    <p className="text-[11px] text-slate-400">{row.term}</p>
                  </td>
                  <td className="px-4 py-3.5 font-black text-[#000435]">{fmt(row.amount)}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => setDetailRow(row)}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                      >
                        View
                      </button>
                      <button
                        disabled={row.status === 'Rejected' || row.status === 'Paid'}
                        onClick={() => decide(row.id, 'approve')}
                        className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
                      >
                        Approve
                      </button>
                      <button
                        disabled={row.status === 'Rejected' || row.status === 'Paid'}
                        onClick={() => setRejectModal({ open: true, requestId: row.id, reason: '' })}
                        className="h-8 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
                      >
                        Reject
                      </button>
                      <button
                        disabled={row.status !== 'Approved'}
                        onClick={() => decide(row.id, 'pay')}
                        className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
                      >
                        Mark Paid
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reporting ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analytics</p>
            <h2 className="text-base font-black text-[#000435]">Reporting</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadCsv(
                [['Staff', 'Month', 'Term', 'Year', 'Amount', 'Status'], ...requests.map((r) => [r.staffName, r.month, r.term, r.year, r.amount, r.status])],
                'payroll-report.csv',
              )}
              className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <FileSpreadsheet size={13} /> Export CSV
            </button>
            <button
              onClick={exportPdf}
              className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <FileText size={13} /> Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* paid by month */}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Total Paid per Month</p>
            {paidByMonth.length ? paidByMonth.map(({ month, total }) => (
              <div key={month} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
                <span className="text-slate-600 font-semibold">{month}</span>
                <strong className="text-[#000435]">{fmt(total)}</strong>
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-4">No paid payroll yet.</p>
            )}
          </div>

          {/* history */}
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Payment History</p>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {requests.length ? requests.map((r) => (
                <div key={`h-${r.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-bold text-[#000435] text-xs">{r.staffName}</p>
                    <p className="text-[10px] text-slate-400">{r.month} {r.year} · {r.term}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-[#000435]">{fmt(r.amount)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-400 text-center py-4">No records yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Payroll Modal ────────────────────────────────────────────── */}
      {openModal && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full sm:max-w-4xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col">
            {/* modal header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-3xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Create Payroll Payment</p>
                <h3 className="text-lg font-black text-[#000435]">Payroll Stepper</h3>
              </div>
              <button
                onClick={closeModal}
                className="h-9 w-9 rounded-xl border border-slate-200 inline-flex items-center justify-center hover:bg-slate-50 transition"
              >
                <XCircle size={16} className="text-slate-400" />
              </button>
            </div>

            {/* step indicator */}
            <div className="px-5 py-4 border-b border-slate-100 flex justify-center overflow-x-auto">
              <StepIndicator current={step} />
            </div>

            {/* step body */}
            <div className="flex-1 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                Step {step} — {STEP_LABELS[step - 1]}
              </p>
              {stepContent[step]}
            </div>

            {/* modal footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="h-10 px-5 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Back
              </button>
              {step < 4 ? (
                <button
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  disabled={
                    (step === 1 && !selectedStaff) ||
                    (step === 3 && (amount <= 0 || amount > finalPayable || duplicateExists || monthAlreadyFullyPaid))
                  }
                  className="h-10 px-5 rounded-xl bg-[#000435] text-white text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-40 hover:bg-[#000f7a] transition active:scale-95"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={submitRequest}
                  disabled={loading.submit}
                  className="h-10 px-5 rounded-xl bg-amber-500 text-[#000435] text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50 hover:bg-amber-400 transition active:scale-95 shadow-lg shadow-amber-500/30"
                >
                  {loading.submit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Submit Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accountant</p>
          <h2 className="text-base font-black text-[#000435]">Payroll Payment Tracker</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Staff</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Final Payable</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading.requests ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400"><Loader2 size={20} className="animate-spin mx-auto mb-1" /> Loading tracker…</td></tr>
              ) : trackerRows.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No payroll payments yet.</td></tr>
              ) : trackerRows.map((r) => (
                <tr key={`pay-${r.key}`} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[#000435]">{r.staffName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{r.staffCode}</p>
                  </td>
                  <td className="px-4 py-3.5">{r.month} {r.year} · {r.term}</td>
                  <td className="px-4 py-3.5 font-black text-emerald-700">{fmt(r.finalPayable)}</td>
                  <td className="px-4 py-3.5 font-black text-blue-700">{fmt(r.paidAmount)}</td>
                  <td className="px-4 py-3.5 font-black text-orange-600">{fmt(r.remainingAmount)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      r.trackerStatus === 'Fully Paid'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : r.trackerStatus === 'Pending Approval'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : r.trackerStatus === 'Approved'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : r.trackerStatus === 'Partially Paid'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                      {r.trackerStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDetailRow(r.latestRequest || null)}
                        className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                      >
                        View
                      </button>
                      {r.hasApproved && r.approvedRequestId && (
                        <button
                          onClick={() => decide(r.approvedRequestId, 'pay')}
                          className="h-8 px-3 rounded-lg bg-[#000435] hover:bg-[#000f7a] text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                        >
                          Mark Paid
                        </button>
                      )}
                      {r.canFinishPayment && (
                        <button
                          onClick={() => startFinishPayment(r)}
                          className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#000435] text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                        >
                          Finish Payment
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal (Accountant View) ──────────────────────────────── */}
      {detailRow && (
        <div className="fixed inset-0 z-[255] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setDetailRow(null)} />
          <div className="relative w-full sm:max-w-2xl max-h-[95dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between rounded-t-3xl">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payroll Request Detail</p>
                <h3 className="text-lg font-black text-[#000435]">{detailRow.staffName}</h3>
                <p className="text-xs text-slate-500">{detailRow.staffCode} · {detailRow.role} · {detailRow.department}</p>
              </div>
              <button onClick={() => setDetailRow(null)} className="h-8 w-8 rounded-xl border border-slate-200 inline-flex items-center justify-center hover:bg-slate-50">
                <XCircle size={14} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  ['Basic Salary', fmt(detailRow.basic)],
                  ['Allowances', `+ ${fmt(detailRow.allowances)}`],
                  ['Deductions', `- ${fmt(detailRow.deductions)}`],
                  ['Net Salary', fmt(detailRow.netSalary)],
                  ['Advance Deduction', `- ${fmt(detailRow.advance)}`],
                  ['Final Payable', fmt(detailRow.finalPayable)],
                  ['Amount Requested', fmt(detailRow.amount)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-slate-100 last:border-0">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-black text-[#000435]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Trail</p>
                <p>
                  <span className="text-slate-500">Submitted by:</span>{' '}
                  <span className="font-semibold">
                    {detailRow.submittedBy || 'Accountant'}
                    {detailRow.submittedByRole ? ` (${detailRow.submittedByRole})` : ''}
                  </span>{' '}
                  <span className="text-slate-400">at {fmtDateTime(detailRow.submittedAt || detailRow.createdAt)}</span>
                </p>
                {detailRow.approvedBy ? (
                  <p><span className="text-slate-500">Approved by:</span> <span className="font-semibold">{detailRow.approvedBy}{detailRow.approvedByRole ? ` (${detailRow.approvedByRole})` : ''}</span> <span className="text-slate-400">at {fmtDateTime(detailRow.approvedAt)}</span></p>
                ) : null}
                {detailRow.paidBy ? (
                  <p><span className="text-slate-500">Paid by:</span> <span className="font-semibold">{detailRow.paidBy}{detailRow.paidByRole ? ` (${detailRow.paidByRole})` : ''}</span> <span className="text-slate-400">at {fmtDateTime(detailRow.paidAt)}</span></p>
                ) : null}
                {detailRow.rejectedReason ? (
                  <p><span className="text-slate-500">Rejected reason:</span> <span className="font-semibold text-red-700">{detailRow.rejectedReason}</span></p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ─────────────────────────────────────────────────── */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setRejectModal({ open: false, requestId: null, reason: '' })}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 inline-flex items-center justify-center flex-shrink-0">
                <Ban size={16} className="text-red-600" />
              </div>
              <div>
                <p className="font-black text-[#000435]">Reject Request</p>
                <p className="text-xs text-slate-500 mt-0.5">This reason will be visible to the accountant.</p>
              </div>
            </div>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition resize-none"
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
              placeholder="Enter rejection reason…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectModal({ open: false, requestId: null, reason: '' })}
                className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rejectModal.reason.trim()) return notify('error', 'Rejection reason is required.');
                  await decide(rejectModal.requestId, 'reject', rejectModal.reason.trim());
                  setRejectModal({ open: false, requestId: null, reason: '' });
                }}
                className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase transition active:scale-95"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {finishModal.open && finishModal.row && (
        <div className="fixed inset-0 z-[265] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setFinishModal({ open: false, row: null, amount: '' })} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Finish Payment</p>
            <h3 className="text-lg font-black text-[#000435] mt-1">{finishModal.row.staffName}</h3>
            <p className="text-xs text-slate-500">{finishModal.row.month} / {finishModal.row.term} / {finishModal.row.year}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Final Payable</span><strong className="text-emerald-700">{fmt(finishModal.row.finalPayable)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><strong className="text-blue-700">{fmt(finishModal.row.paidAmount)}</strong></div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between"><span className="font-semibold text-slate-700">Remaining</span><strong className="text-orange-600">{fmt(finishModal.row.remainingAmount)}</strong></div>
            </div>
            <div className="mt-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Pay Amount (RWF)</label>
              <input
                value={finishModal.amount}
                onChange={(e) => setFinishModal((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                placeholder="0"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setFinishModal({ open: false, row: null, amount: '' })}
                className="h-10 px-4 rounded-xl border border-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinishPayment}
                disabled={loading.submit}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50 transition active:scale-95"
              >
                {loading.submit ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
