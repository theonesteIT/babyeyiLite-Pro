import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, UserMinus, Calculator, Send, CheckCircle, Clock, DollarSign,
  Users, Loader2, Plus, X, Settings, ChevronRight, AlertCircle, RefreshCw,
  Settings2,
} from 'lucide-react';
import AccountantOchreHero from '../../components/AccountantOchreHero';
import {
  TERMINATION_STATUSES,
  PAYMENT_METHODS,
  DEFAULT_SEVERANCE_RATES,
  formatDisplayDate,
  calcTerminationSettlement,
  normalizeTerminationRecord,
} from '../../utils/terminationBenefitsCalc';
import {
  getTerminationAnalytics,
  getSeveranceRates,
  saveSeveranceRates,
  searchTerminationStaff,
  listTerminations,
  createTermination,
  updateTermination,
  submitTermination,
  markTerminationPaid,
} from '../../services/terminationBenefitsService';

import TerminationDetailDrawer from '../../components/TerminationDetailDrawer';
import TerminationPayrollWizard from '../../components/TerminationPayrollWizard';
import { buildTerminatedPayrollSnapshot } from '../../utils/terminatedMonthPayroll';
import api from '../../services/api';
import { StatusBadge as TermStatusBadge, fmtRwf as termFmtRwf } from '../../components/TerminationDetailPanel';
import TerminationFiltersBar from '../../../../../shared/components/TerminationFiltersBar';
import TablePagination from '../../../../../shared/components/TablePagination';
import { useTerminationTable } from '../../../../../shared/utils/useTerminationTable';

function fmtRwf(n) {
  return termFmtRwf(n);
}

function StatusBadge({ status }) {
  return <TermStatusBadge status={status} />;
}

function KpiCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="relative pt-4">
      <div className="absolute -top-1 left-5 z-10 w-11 h-11 rounded-xl bg-white border border-black/[0.06] shadow-md flex items-center justify-center">
        <Icon size={20} className="text-amber-500" strokeWidth={1.75} />
      </div>
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm px-5 pt-9 pb-5 min-h-[120px]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/55">{label}</p>
        <p className="text-2xl font-bold text-[#000435] mt-1.5 truncate tabular-nums">{value}</p>
        {sub ? <p className="text-xs text-[#000435]/50 mt-1">{sub}</p> : null}
      </div>
    </div>
  );
}

function SummaryCard({ employee, calc, netSalary }) {
  if (!employee || !calc) return null;
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white p-5 space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Calculator size={16} className="text-amber-600" />
        Termination Summary
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <span className="text-slate-500">Employee</span>
        <span className="font-semibold text-slate-900 text-right">{employee.fullName}</span>
        <span className="text-slate-500">Net Salary</span>
        <span className="font-medium text-right">{fmtRwf(netSalary)}</span>
        <span className="text-slate-500">Years Worked</span>
        <span className="font-medium text-right">{calc.yearsWorked} Years</span>
        <span className="text-slate-500">Multiplier</span>
        <span className="font-medium text-right">×{calc.multiplier}</span>
        <span className="text-slate-500">Severance Benefit</span>
        <span className="font-medium text-right">{fmtRwf(calc.severanceBenefit)}</span>
        <span className="text-slate-500">Gross Settlement</span>
        <span className="font-semibold text-right">{fmtRwf(calc.grossSettlement)}</span>
        <p className="col-span-2 text-[11px] text-slate-400">
          Severance only — final month salary is paid separately via Payroll Run.
        </p>
      </div>
      <div className="pt-3 border-t border-amber-200/60 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-800">Total Payable</span>
        <span className="text-lg font-bold text-emerald-700">{fmtRwf(calc.totalPayable)}</span>
      </div>
    </div>
  );
}

function TerminationModal({
  open,
  onClose,
  onSaved,
  editRecord,
  severanceRates,
}) {
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [terminationDate, setTerminationDate] = useState('');
  const [useDaysWorked, setUseDaysWorked] = useState(true);
  const [outstandingDeductions, setOutstandingDeductions] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [payrollTemplate, setPayrollTemplate] = useState(null);

  useEffect(() => {
    if (!open) return;
    api.get('/accountant/payroll/templates/active')
      .then((res) => setPayrollTemplate(res?.data?.data || null))
      .catch(() => setPayrollTemplate(null));
    if (editRecord) {
      setSelected({
        staffUserId: editRecord.staffUserId,
        staffCode: editRecord.staffCode,
        fullName: editRecord.staffName,
        position: editRecord.position,
        department: editRecord.department,
        employmentDate: editRecord.employmentDate,
        employmentStatus: 'Active',
        netSalary: editRecord.netSalary,
      });
      setTerminationDate(editRecord.terminationDate || '');
      setUseDaysWorked(editRecord.useDaysWorked !== false);
      setOutstandingDeductions(String(editRecord.outstandingDeductions || ''));
      setTerminationReason(editRecord.terminationReason || '');
      setNotes(editRecord.notes || '');
    } else {
      setSelected(null);
      setTerminationDate('');
      setUseDaysWorked(true);
      setOutstandingDeductions('');
      setTerminationReason('');
      setNotes('');
    }
    setError('');
  }, [open, editRecord?.id]);

  const runSearch = useCallback(async () => {
    setSearching(true);
    try {
      const data = await searchTerminationStaff({
        query: query.trim(),
        department: deptFilter.trim(),
        position: positionFilter.trim(),
        limit: 20,
      });
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, deptFilter, positionFilter]);

  useEffect(() => {
    if (!open || selected) return;
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [open, selected, query, deptFilter, positionFilter, runSearch]);

  const localCalc = useMemo(() => {
    if (!selected?.employmentDate || !terminationDate) return null;
    return calcTerminationSettlement({
      netSalary: selected.netSalary,
      employmentDate: selected.employmentDate,
      terminationDate,
      useDaysWorked,
      outstandingDeductions: Number(outstandingDeductions) || 0,
      rateTable: severanceRates?.length ? severanceRates : DEFAULT_SEVERANCE_RATES,
    });
  }, [selected?.employmentDate, selected?.netSalary, terminationDate, useDaysWorked, outstandingDeductions, severanceRates]);

  const handleSave = async (andSubmit = false) => {
    if (!selected || !terminationDate || !localCalc) {
      setError('Select employee and termination date first');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const draftRecord = {
        id: editRecord?.id,
        staffUserId: selected.staffUserId,
        staffName: selected.fullName,
        staffCode: selected.staffCode,
        terminationDate,
        useDaysWorked,
        netSalary: selected.netSalary,
      };
      const payrollSnapshot = buildTerminatedPayrollSnapshot({
        record: draftRecord,
        template: payrollTemplate,
        useDaysWorked,
        monthlyNetSalary: selected.netSalary,
      });
      const payload = {
        staffUserId: selected.staffUserId,
        terminationDate,
        useDaysWorked,
        outstandingDeductions: Number(outstandingDeductions) || 0,
        terminationReason,
        notes,
        netSalary: selected.netSalary,
        payrollSnapshot,
      };
      let record;
      if (editRecord?.id) {
        record = await updateTermination(editRecord.id, payload);
      } else {
        record = await createTermination(payload);
      }
      if (andSubmit && record?.id) {
        record = await submitTermination(record.id);
      }
      onSaved?.(record);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {editRecord ? 'Edit Termination' : 'New Termination Settlement'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Prepared by Accountant — severance & final payroll settlement</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        >
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!selected ? (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">Step 1 — Select Employee</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Code or name..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <input
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  placeholder="Department"
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-sm"
                />
                <input
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  placeholder="Position"
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              {searching ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-600" /></div>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y max-h-64 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-slate-500 p-4 text-center">No active employees found</p>
                  ) : searchResults.map((emp) => (
                    <button
                      key={emp.staffUserId}
                      type="button"
                      onClick={() => { setSelected(emp); setSearchResults([]); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50/60 text-left transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{emp.fullName}</p>
                        <p className="text-xs text-slate-500">{emp.staffCode} · {emp.position} · {emp.department}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden flex-1">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        ['Employee Name', selected.fullName],
                        ['Employee Code', selected.staffCode],
                        ['Position', selected.position || '—'],
                        ['Department', selected.department || '—'],
                        ['Employment Date', formatDisplayDate(selected.employmentDate)],
                        ['Current Net Salary', fmtRwf(selected.netSalary)],
                        ['Status', selected.employmentStatus || 'Active'],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 text-slate-500 bg-slate-50/80 w-2/5 font-medium">{k}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!editRecord && (
                  <button type="button" onClick={() => setSelected(null)} className="text-xs text-amber-700 font-semibold hover:underline shrink-0">
                    Change employee
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Termination Date</label>
                  <input
                    type="date"
                    value={terminationDate}
                    onChange={(e) => setTerminationDate(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Outstanding Deductions (RWF)</label>
                  <input
                    type="number"
                    min="0"
                    value={outstandingDeductions}
                    onChange={(e) => setOutstandingDeductions(e.target.value)}
                    placeholder="0"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Prorate by Days Worked</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Applies to final-month payroll (Configure Payroll), not severance benefit.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useDaysWorked}
                  onClick={() => setUseDaysWorked((v) => !v)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${useDaysWorked ? 'bg-amber-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${useDaysWorked ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Termination Reason</label>
                <textarea
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  rows={2}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm resize-none"
                  placeholder="Optional reason for termination..."
                />
              </div>

              <SummaryCard employee={selected} calc={localCalc} netSalary={selected.netSalary} />
            </>
          )}
        </div>

        {selected && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap gap-3 justify-end bg-slate-50/50">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200/60">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !localCalc}
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving || !localCalc}
              onClick={() => handleSave(true)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit for Approval
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentModal({ record, onClose, onPaid }) {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentBank, setPaymentBank] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await markTerminationPaid(record.id, {
        paymentDate,
        paymentMethod,
        paymentBank,
        paymentAccountNumber,
        paymentReference,
      });
      onPaid?.(updated);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Payment recording failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
        <p className="text-sm text-slate-600">{record.staffName} — {fmtRwf(record.totalPayable)}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full py-2 px-3 rounded-xl border text-sm" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full py-2 px-3 rounded-xl border text-sm">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input placeholder="Bank" value={paymentBank} onChange={(e) => setPaymentBank(e.target.value)} className="w-full py-2 px-3 rounded-xl border text-sm" />
          <input placeholder="Account Number" value={paymentAccountNumber} onChange={(e) => setPaymentAccountNumber(e.target.value)} className="w-full py-2 px-3 rounded-xl border text-sm" />
          <input placeholder="Reference Number" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full py-2 px-3 rounded-xl border text-sm" />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600">Cancel</button>
          <button type="button" disabled={saving} onClick={handlePay} className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeveranceSettingsPanel({ rates, onSaved }) {
  const [localRates, setLocalRates] = useState(rates);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { setLocalRates(rates); }, [rates]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSeveranceRates(localRates);
      onSaved?.(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Settings size={16} className="text-amber-600" />
          Severance Rate Table (System Settings)
        </span>
        <ChevronRight size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="pb-2">Years Worked</th>
                <th className="pb-2">Multiplier</th>
              </tr>
            </thead>
            <tbody>
              {localRates.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{r.label || `${r.minYears}–${r.maxYears ?? '∞'}`}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      value={r.multiplier}
                      onChange={(e) => {
                        const next = [...localRates];
                        next[i] = { ...next[i], multiplier: Number(e.target.value) };
                        setLocalRates(next);
                      }}
                      className="w-20 py-1 px-2 rounded-lg border text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Rates'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function TerminationBenefits() {
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [severanceRates, setSeveranceRates] = useState(DEFAULT_SEVERANCE_RATES);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [payRecord, setPayRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);
  const [listQuery, setListQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [payrollWizardRecord, setPayrollWizardRecord] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, list, rates] = await Promise.all([
        getTerminationAnalytics(),
        listTerminations({}),
        getSeveranceRates(),
      ]);
      setAnalytics(a);
      setRecords(list);
      if (rates?.length) setSeveranceRates(rates);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tableFilters = useMemo(() => ({
    query: listQuery,
    year: yearFilter,
    month: monthFilter,
    department: departmentFilter,
    contractType: contractFilter,
    status: statusFilter,
  }), [listQuery, yearFilter, monthFilter, departmentFilter, contractFilter, statusFilter]);

  const { paginated, paginationProps } = useTerminationTable(records, tableFilters, 10);
  const displayRecords = useMemo(
    () => paginated.map((r) => normalizeTerminationRecord(r)),
    [paginated]
  );

  return (
    <div className="min-h-full bg-[#f4f6f9]">
      <AccountantOchreHero
        eyebrow="Payroll"
        titleLine="Termination"
        titleAccent="Benefits"
        subtitle="Manage employee termination, severance calculation, final payroll settlement, and payment approval."
        icon={UserMinus}
        rightSlot={
          <button
            type="button"
            onClick={() => { setEditRecord(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold border border-white/20 backdrop-blur-sm"
          >
            <Plus size={16} />
            New Termination
          </button>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
        {/* KPI cards — directly under hero */}
        <div className="relative z-10 -mt-6 sm:-mt-8 pt-2 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <KpiCard icon={Users} label="Terminated Employees" value={analytics?.terminatedEmployees ?? '—'} sub="In employee directory" />
            <KpiCard icon={DollarSign} label="Total Benefits Paid" value={analytics ? fmtRwf(analytics.totalBenefitsPaid) : '—'} />
            <KpiCard icon={Clock} label="Pending Payments" value={analytics?.pendingPayments ?? '—'} />
            <KpiCard icon={Calculator} label="Average Settlement" value={analytics ? fmtRwf(analytics.averageSettlement) : '—'} />
          </div>
        </div>

        <div className="space-y-5">
          <SeveranceSettingsPanel rates={severanceRates} onSaved={setSeveranceRates} />

          <TerminationFiltersBar
            listQuery={listQuery}
            onListQueryChange={setListQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            yearFilter={yearFilter}
            onYearFilterChange={setYearFilter}
            monthFilter={monthFilter}
            onMonthFilterChange={setMonthFilter}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            contractFilter={contractFilter}
            onContractFilterChange={setContractFilter}
            records={records}
            onRefresh={load}
            loading={loading}
          />

          {/* Termination Reports — table */}
          <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <h2 className="text-sm font-bold text-[#000435]">Termination Reports</h2>
              <p className="text-xs text-[#000435]/50 mt-0.5">Click a row to view full settlement details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-[#000435]/50">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">Employee</th>
                    <th className="text-left px-3 py-3 font-bold">Code</th>
                    <th className="text-left px-3 py-3 font-bold">Department</th>
                    <th className="text-left px-3 py-3 font-bold">Termination Date</th>
                    <th className="text-right px-3 py-3 font-bold">Years</th>
                    <th className="text-right px-3 py-3 font-bold">Total Payable</th>
                    <th className="text-left px-3 py-3 font-bold">Status</th>
                    <th className="text-right px-5 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-14 text-[#000435]/50"><Loader2 className="inline animate-spin mr-2 text-amber-500" />Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-14 text-[#000435]/50">No termination records found</td></tr>
                  ) : displayRecords.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setDetailRecord(r)}
                      className="border-t border-black/[0.04] hover:bg-amber-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#000435]">{r.staffName}</p>
                        <p className="text-xs text-[#000435]/50">{r.position || '—'}</p>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-xs text-[#000435]/70">{r.staffCode}</td>
                      <td className="px-3 py-3.5 text-[#000435]/70">{r.department || '—'}</td>
                      <td className="px-3 py-3.5 text-[#000435]">{formatDisplayDate(r.terminationDate)}</td>
                      <td className="px-3 py-3.5 text-right text-[#000435] tabular-nums">{r.yearsWorked}</td>
                      <td className="px-3 py-3.5 text-right font-bold text-[#000435] tabular-nums">{fmtRwf(r.totalPayable)}</td>
                      <td className="px-3 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {r.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => setPayrollWizardRecord(r)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#000435] hover:text-amber-600 mr-2"
                          >
                            <Settings2 size={12} />
                            {r.payrollSnapshot ? 'Edit Payroll' : 'Configure Payroll'}
                          </button>
                        )}
                        {r.payrollSnapshot && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase mr-2">
                            Payroll set
                          </span>
                        )}
                        {['draft', 'rejected'].includes(r.status) && (
                          <button type="button" onClick={() => { setEditRecord(r); setModalOpen(true); }} className="text-xs font-semibold text-amber-600 hover:underline mr-2">Edit</button>
                        )}
                        {r.status === 'approved' && (
                          <button type="button" onClick={() => setPayRecord(r)} className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1">
                            <CheckCircle size={12} /> Pay
                          </button>
                        )}
                        <button type="button" onClick={() => setDetailRecord(r)} className="text-xs font-semibold text-[#000435]/60 hover:text-[#000435] ml-2">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && <TablePagination {...paginationProps} />}
          </div>
        </div>
      </div>

      <TerminationDetailDrawer
        open={!!detailRecord}
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onEdit={(r) => { setDetailRecord(null); setEditRecord(r); setModalOpen(true); }}
        onRecordPayment={(r) => { setDetailRecord(null); setPayRecord(r); }}
      />

      <TerminationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        onSaved={load}
        editRecord={editRecord}
        severanceRates={severanceRates}
      />

      {payRecord && (
        <PaymentModal
          record={payRecord}
          onClose={() => setPayRecord(null)}
          onPaid={() => { setPayRecord(null); load(); }}
        />
      )}

      <TerminationPayrollWizard
        open={!!payrollWizardRecord}
        record={payrollWizardRecord}
        onClose={() => setPayrollWizardRecord(null)}
        onSaved={load}
      />
    </div>
  );
}
