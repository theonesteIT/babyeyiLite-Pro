import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote, ChevronDown, FileSpreadsheet, Loader2, RefreshCw, Search,
  Trash2, CheckCircle, AlertCircle,
} from 'lucide-react';
import AccountantOchreHero from '../components/AccountantOchreHero';
import PayrollReportRegisterTable from '../components/PayrollReportRegisterTable';
import {
  registerRowsFromRunDetail,
  resolveRunReportColumns,
  sumRunReportRows,
} from '../utils/payrollReportTables';
import { downloadRunPayrollRegisterExcel } from '../utils/payrollReportExport';
import {
  getPayrollRun,
  getPayrollRuns,
  deletePayrollRun,
  markPayrollRunPaid,
  isPayrollRunDeletable,
  isPayrollRunPaid,
  payrollRunStatusLabel,
} from '../services/payrollRunService';
import {
  parseManagerAcademicSettings,
  termsForRegistryYear,
  inferCurrentTerm,
  yearOptionLabel,
  resolvePayrollCalendarYear,
} from '../utils/academicCalendarFilters';
import api from '../services/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toPayrollYear(academicYear, month) {
  return resolvePayrollCalendarYear(academicYear, month);
}

function monthToNumber(label) {
  const i = MONTHS.findIndex((m) => m.toLowerCase() === String(label || '').toLowerCase());
  return i >= 0 ? i + 1 : new Date().getMonth() + 1;
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return { label: 'Paid', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (s === 'processing' || s === 'processed') return { label: 'Processing', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (s === 'draft') return { label: 'Draft', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return { label: payrollRunStatusLabel(status), cls: 'bg-slate-100 text-slate-700 border-slate-200' };
}

function FieldSelect({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40 disabled:opacity-60 pr-10"
        >
          {options.map((o) => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}

export default function SalaryPayment() {
  const [academicYear, setAcademicYear] = useState('');
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [academicRegistry, setAcademicRegistry] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [academicLoaded, setAcademicLoaded] = useState(false);

  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const payrollYear = useMemo(() => toPayrollYear(academicYear, month), [academicYear, month]);
  const payMonthNum = useMemo(() => monthToNumber(month), [month]);

  const schoolName = useMemo(() => {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('authUser') || '{}';
      const u = JSON.parse(raw);
      return u?.school?.name || u?.school_name || 'School';
    } catch {
      return 'School';
    }
  }, []);

  const yearOptions = useMemo(() => {
    if (!availableYears.length) return [{ value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) }];
    return availableYears.map((y) => {
      const row = academicRegistry.find((r) => String(r.academic_year) === String(y));
      return { value: y, label: yearOptionLabel(row) || y };
    });
  }, [availableYears, academicRegistry]);

  useEffect(() => {
    api.get('/dos/academic-calendar-settings')
      .then((res) => {
        if (!res.data?.success) return;
        const parsed = parseManagerAcademicSettings(res.data.data || {});
        const year = parsed.currentYear || String(new Date().getFullYear());
        const years = parsed.years?.length ? parsed.years : [year];
        setAcademicRegistry(parsed.registry);
        setAvailableYears(years);
        setAcademicYear(year);
        setAcademicLoaded(true);
      })
      .catch(() => {
        const y = String(new Date().getFullYear());
        setAvailableYears([y]);
        setAcademicYear(y);
        setAcademicLoaded(true);
      });
  }, []);

  const loadRuns = useCallback(async () => {
    if (!academicYear) return;
    setLoadingRuns(true);
    try {
      const data = await getPayrollRuns({
        month,
        year: payrollYear,
        academicYear,
        limit: 100,
      });
      setRuns(data);
      setSelectedRunId((prev) => {
        if (prev != null && data.some((r) => Number(r.db_id) === Number(prev))) return prev;
        return data[0]?.db_id ?? null;
      });
    } catch {
      setRuns([]);
      setSelectedRunId(null);
    } finally {
      setLoadingRuns(false);
    }
  }, [academicYear, month, payrollYear]);

  useEffect(() => {
    if (academicLoaded) loadRuns();
  }, [academicLoaded, loadRuns]);

  const loadRunDetail = useCallback(async (id) => {
    if (id == null) {
      setRunDetail(null);
      return;
    }
    setLoadingDetail(true);
    setDetailError('');
    try {
      const [data, tplRes] = await Promise.all([
        getPayrollRun(id),
        api.get('/accountant/payroll/templates/active').catch(() => null),
      ]);
      setRunDetail(data);
      setActiveTemplate(tplRes?.data?.data || null);
      if (!data) setDetailError('Payroll run details could not be loaded.');
    } catch (e) {
      setRunDetail(null);
      setActiveTemplate(null);
      setDetailError(e?.response?.data?.message || e?.message || 'Failed to load payroll register.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRunId != null) loadRunDetail(selectedRunId);
    else setRunDetail(null);
  }, [selectedRunId, loadRunDetail]);

  const reportRows = useMemo(() => {
    if (!runDetail) return [];
    let rows = registerRowsFromRunDetail(runDetail, activeTemplate);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const reg = row.registerRow || row;
        return [reg.firstName, reg.familyName, reg.rssbNumber, reg.nationalId].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [runDetail, activeTemplate, search]);

  const runColumns = useMemo(
    () => resolveRunReportColumns(activeTemplate),
    [activeTemplate, reportRows],
  );

  const reportTotals = useMemo(
    () => (reportRows.length ? sumRunReportRows(reportRows, runColumns) : null),
    [reportRows, runColumns],
  );

  const periodLabel = useMemo(() => {
    const m = runDetail?.monthLabel || month;
    const y = runDetail?.payYear || payrollYear;
    return `PAYROLL FOR ${String(m).toUpperCase()} ${y}`;
  }, [runDetail, month, payrollYear]);

  const selectedRun = runs.find((r) => Number(r.db_id) === Number(selectedRunId));
  const badge = selectedRun ? statusBadge(selectedRun.status) : statusBadge(runDetail?.status);
  const canDelete = selectedRun && isPayrollRunDeletable(selectedRun.status);
  const canMarkPaid = selectedRun && isPayrollRunDeletable(selectedRun.status);

  const handleDeleteRun = async () => {
    if (selectedRunId == null || !canDelete) return;
    const ok = window.confirm(
      `Delete payroll for ${month} ${payrollYear} (${academicYear})?\n\n`
      + 'This permanently removes the run and all staff lines from the database.\n\nContinue?'
    );
    if (!ok) return;
    setActionBusy(true);
    setActionError('');
    setNotice('');
    try {
      await deletePayrollRun(selectedRunId);
      setNotice('Payroll run deleted.');
      setSelectedRunId(null);
      setRunDetail(null);
      await loadRuns();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete payroll run';
      setActionError(msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (selectedRunId == null || !canMarkPaid) return;
    const ok = window.confirm(
      `Mark this payroll as Paid?\n\n`
      + `${month} ${payrollYear} · Net ${(runDetail?.netTotal ?? selectedRun?.netTotal ?? 0).toLocaleString()} RWF\n\n`
      + 'Paid payroll cannot be deleted.'
    );
    if (!ok) return;
    setActionBusy(true);
    setActionError('');
    try {
      await markPayrollRunPaid(selectedRunId);
      setNotice('Payroll marked as paid.');
      await loadRuns();
      await loadRunDetail(selectedRunId);
    } catch (e) {
      setActionError(e?.response?.data?.message || 'Failed to mark payroll as paid');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow="Finance · Payroll"
        titleLine="Salary"
        titleAccent="Payment"
        subtitle="View saved payroll runs — full register with salary template columns and net final payable per staff."
        icon={Banknote}
      />

      <div className="acct-shell-wide -mt-10 relative z-10 pb-16 space-y-5 max-w-[min(100%,1920px)]">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FieldSelect
              label="Academic year"
              value={academicYear}
              onChange={setAcademicYear}
              options={yearOptions}
              disabled={!academicLoaded}
            />
            <FieldSelect label="Payroll month" value={month} onChange={setMonth} options={MONTHS} />
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
                Search staff in register
              </span>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, RSSB, National ID…"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-medium text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/40"
                />
              </div>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => loadRuns()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loadingRuns ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {detailError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-red-800 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{detailError}</span>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-red-800 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5 text-emerald-800 text-sm">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        ) : null}

        {/* Saved payroll runs — full width above stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-[#000435]">Saved payroll runs</p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
              {month} {payrollYear} · {academicYear || '—'}
            </p>
          </div>
          <div className="p-4">
            {loadingRuns ? (
              <div className="py-8 text-center text-slate-400 text-sm font-normal">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading…
              </div>
            ) : runs.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 text-center font-normal">
                No payroll saved for this period. Run payroll from Payroll Run first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {runs.map((r) => {
                  const b = statusBadge(r.status);
                  const active = Number(selectedRunId) === Number(r.db_id);
                  return (
                    <button
                      key={r.db_id}
                      type="button"
                      onClick={() => setSelectedRunId(r.db_id)}
                      className={`min-w-[200px] flex-1 max-w-sm text-left rounded-xl border px-4 py-3 transition-colors ${
                        active
                          ? 'border-[#FEBF10] bg-amber-50/90 ring-1 ring-[#FEBF10]/40'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#000435]">{r.period || r.id}</p>
                        <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${b.cls}`}>
                          {b.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-normal">
                        {r.staffCount} staff · Net {(r.netTotal || 0).toLocaleString()} RWF
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-normal">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stats row — below saved runs */}
        {selectedRun || runDetail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Status', value: badge.label, isBadge: true },
                { label: 'Staff', value: runDetail?.staffCount ?? selectedRun?.staffCount ?? 0 },
                { label: 'Gross total', value: `${(runDetail?.grossTotal ?? selectedRun?.grossTotal ?? 0).toLocaleString()} RWF` },
                { label: 'Net total', value: `${(runDetail?.netTotal ?? selectedRun?.netTotal ?? 0).toLocaleString()} RWF` },
                {
                  label: 'Final payable',
                  value: `${(reportTotals?.finalNetPay ?? runDetail?.disbursementTotal ?? selectedRun?.disbursementTotal ?? 0).toLocaleString()} RWF`,
                },
              ].map(({ label, value, isBadge }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-normal">{label}</p>
                  {isBadge ? (
                    <span className={`inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}>
                      {value}
                    </span>
                  ) : (
                    <p className="text-sm font-semibold text-[#000435] mt-1 tabular-nums">{value}</p>
                  )}
                </div>
              ))}
            </div>
            {canMarkPaid || canDelete ? (
              <div className="flex flex-wrap gap-2">
                {canMarkPaid ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={handleMarkPaid}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle size={14} /> Mark as paid
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={handleDeleteRun}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Delete payroll run
                  </button>
                ) : null}
              </div>
            ) : isPayrollRunPaid(selectedRun?.status || runDetail?.status) ? (
              <p className="text-[11px] text-slate-500 font-normal">This payroll is paid and locked — it cannot be deleted.</p>
            ) : null}
          </div>
        ) : null}

        {/* Payroll register — full width */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full">
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#000435]">{schoolName.toUpperCase()}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-normal">{periodLabel}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!reportRows.length}
                onClick={() => downloadRunPayrollRegisterExcel({
                  schoolName,
                  periodLabel,
                  rows: reportRows,
                  totalRow: reportTotals,
                  runStatus: payrollRunStatusLabel(runDetail?.status || selectedRun?.status),
                  netPayLabel: 'NET FINAL PAYABLE',
                  filename: `salary-payment-${month}-${payrollYear}.xlsx`,
                })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F59E0B] text-[#000435] text-xs font-semibold disabled:opacity-50"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto px-2 sm:px-4 pb-4">
            {loadingDetail ? (
              <div className="py-16 text-center text-slate-400 text-sm font-normal">
                <Loader2 size={22} className="animate-spin mx-auto mb-2 text-[#F59E0B]" />
                Loading register…
              </div>
            ) : selectedRunId == null ? (
              <p className="py-16 text-center text-sm text-slate-500 font-normal">Select a payroll run above to view the register.</p>
            ) : reportRows.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500 font-normal">
                No staff lines found for this run
                {(runDetail?.staffCount ?? selectedRun?.staffCount)
                  ? ` (expected ${runDetail?.staffCount ?? selectedRun?.staffCount})`
                  : ''}
                . Try refresh or re-run payroll from Payroll Run.
              </p>
            ) : (
              <PayrollReportRegisterTable
                variant="run"
                rows={reportRows}
                totalRow={reportTotals}
                runColumns={runColumns}
                runNetLabel="NET FINAL PAYABLE"
                maxHeight={640}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
