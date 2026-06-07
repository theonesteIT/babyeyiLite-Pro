import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserMinus, CheckCircle, XCircle, Loader2, AlertCircle,
  Users, DollarSign, Clock, Calculator, Eye,
} from 'lucide-react';
import TerminationFiltersBar from '../../shared/components/TerminationFiltersBar';
import TablePagination from '../../shared/components/TablePagination';
import { useTerminationTable } from '../../shared/utils/useTerminationTable';
import AccountantOchreHero from '../../accountant_portal/frontend/src/components/AccountantOchreHero';
import TerminationDetailDrawer from '../../accountant_portal/frontend/src/components/TerminationDetailDrawer';
import {
  listManagerTerminations,
  approveTermination,
  rejectTermination,
  getTerminationAnalytics,
} from '../../accountant_portal/frontend/src/services/terminationBenefitsService';
import {
  formatDisplayDate,
  normalizeTerminationRecord,
} from '../../accountant_portal/frontend/src/utils/terminationBenefitsCalc';
import { StatusBadge, fmtRwf } from '../../accountant_portal/frontend/src/components/TerminationDetailPanel';

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

function ReviewModal({ record, onClose, onDone, initialAction = 'approve' }) {
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const isApprove = initialAction === 'approve';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleConfirm = async () => {
    setBusy(initialAction);
    setError('');
    try {
      if (isApprove) await approveTermination(record.id, reviewNote);
      else await rejectTermination(record.id, reviewNote || 'Rejected by director');
      onDone?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || `${isApprove ? 'Approval' : 'Rejection'} failed`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#000435]/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-4 ${isApprove ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          <h3 className="text-lg font-bold">{isApprove ? 'Confirm Approval' : 'Confirm Rejection'}</h3>
          <p className="text-sm text-white/85 mt-0.5">{record.staffName} · {fmtRwf(record.totalPayable)}</p>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <p className="text-sm text-[#000435]/70">
            {isApprove
              ? 'Employee will be marked Terminated, removed from payroll, and login will be disabled.'
              : 'This termination request will be returned to the accountant for revision.'}
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#000435]/60 mb-1.5">Review Note</label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              className="w-full py-2 px-3 rounded-xl border border-black/[0.08] text-sm text-[#000435] resize-none"
              placeholder="Optional note..."
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-black/[0.06] flex gap-2 justify-end bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-[#000435]/60">Cancel</button>
          <button
            type="button"
            disabled={!!busy}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2 ${isApprove ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : isApprove ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TerminationReview() {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [listQuery, setListQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [detailRecord, setDetailRecord] = useState(null);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, stats] = await Promise.all([
        listManagerTerminations({ status: 'all' }),
        getTerminationAnalytics().catch(() => null),
      ]);
      setRecords(data);
      setAnalytics(stats);
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

  const handleApproveFromDrawer = (r) => {
    setDetailRecord(null);
    setReviewRecord(r);
    setReviewAction('approve');
  };

  const handleRejectFromDrawer = (r) => {
    setDetailRecord(null);
    setReviewRecord(r);
    setReviewAction('reject');
  };

  return (
    <div className="min-h-full bg-[#f4f6f9]">
      <AccountantOchreHero
        eyebrow="Finance Center"
        titleLine="Termination"
        titleAccent="Reports"
        subtitle="Review terminated employees, settlement amounts, and approve or reject pending requests."
        icon={UserMinus}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-12">
        {/* Stats cards under hero */}
        <div className="relative z-10 -mt-6 sm:-mt-8 pt-2 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            <KpiCard
              icon={Users}
              label="Terminated Employees"
              value={analytics?.terminatedEmployees ?? '—'}
              sub="In employee directory"
            />
            <KpiCard
              icon={DollarSign}
              label="Total Benefits Paid"
              value={analytics ? fmtRwf(analytics.totalBenefitsPaid) : '—'}
            />
            <KpiCard
              icon={Clock}
              label="Pending Payments"
              value={analytics?.pendingPayments ?? '—'}
            />
            <KpiCard
              icon={Calculator}
              label="Average Settlement"
              value={analytics ? fmtRwf(analytics.averageSettlement) : '—'}
            />
          </div>
        </div>

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

        <div className="mt-5 rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
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
                  <th className="text-right px-5 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-[#000435]/50">
                      <Loader2 className="inline animate-spin mr-2 text-amber-500" />
                      Loading...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14 text-[#000435]/50">No termination records found</td>
                  </tr>
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
                      <button
                        type="button"
                        onClick={() => setDetailRecord(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#000435] text-white hover:bg-[#000435]/90"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && <TablePagination {...paginationProps} />}
        </div>
      </div>

      <TerminationDetailDrawer
        open={!!detailRecord}
        record={detailRecord}
        variant="manager"
        onClose={() => setDetailRecord(null)}
        onApprove={handleApproveFromDrawer}
        onReject={handleRejectFromDrawer}
      />

      {reviewRecord && reviewAction && (
        <ReviewModal
          record={reviewRecord}
          initialAction={reviewAction}
          onClose={() => { setReviewRecord(null); setReviewAction(null); }}
          onDone={load}
        />
      )}
    </div>
  );
}
