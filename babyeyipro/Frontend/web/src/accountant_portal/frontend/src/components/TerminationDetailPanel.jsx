import {
  Calculator, User, Calendar, Briefcase, CreditCard, ShieldOff,
  CheckCircle, Send, Pencil, X,
} from 'lucide-react';
import { TERMINATION_STATUSES, formatDisplayDate, normalizeTerminationRecord } from '../utils/terminationBenefitsCalc';

function fmtRwf(n) {
  return `${(Number(n) || 0).toLocaleString('en-US')} RWF`;
}

function StatusBadge({ status }) {
  const cfg = TERMINATION_STATUSES[status] || { label: status, color: 'slate' };
  const colors = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    blue: 'bg-blue-50 text-blue-800 ring-blue-200',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    red: 'bg-red-50 text-red-800 ring-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${colors[cfg.color] || colors.slate}`}>
      {cfg.label}
    </span>
  );
}

export default function TerminationDetailPanel({
  record,
  onClose,
  variant = 'accountant',
  drawerMode = false,
  onEdit,
  onRecordPayment,
  onApprove,
  onReject,
  busy = '',
}) {
  if (!record) {
    return null;
  }

  const r = normalizeTerminationRecord(record);
  const isPending = r.status === 'pending_approval';
  const isManager = variant === 'manager';

  return (
    <div className={`h-full flex flex-col bg-white overflow-hidden ${drawerMode ? '' : 'rounded-2xl border border-slate-200 shadow-sm'}`}>
      {/* Header */}
      <div className="shrink-0 px-5 py-4 pt-5 border-b border-black/[0.06] bg-white">
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StatusBadge status={r.status} />
              {['approved', 'paid'].includes(r.status) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#000435]/50">
                  <ShieldOff size={12} />
                  Login disabled
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#000435] truncate">{record.staffName}</h3>
            <p className="text-xs text-[#000435]/55 font-mono mt-0.5">{record.staffCode}</p>
          </div>
          {onClose && !drawerMode && (
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-[#000435]/50">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
        {/* Employee info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { icon: Briefcase, label: 'Position', value: record.position || '—' },
            { icon: Briefcase, label: 'Department', value: record.department || '—' },
            { icon: Calendar, label: 'Employment', value: formatDisplayDate(record.employmentDate) },
            { icon: Calendar, label: 'Terminated', value: formatDisplayDate(record.terminationDate) },
            { icon: Calculator, label: 'Net Salary', value: fmtRwf(record.netSalary) },
            { icon: User, label: 'Years Worked', value: `${record.yearsWorked} yrs (×${record.multiplier})` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl bg-slate-50/80 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#000435]/45 flex items-center gap-1">
                <Icon size={11} className="text-amber-500" /> {label}
              </p>
              <p className="text-sm font-semibold text-[#000435] mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {/* Settlement summary — matches accountant modal style */}
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 to-white p-5">
          <h4 className="text-sm font-bold text-[#000435] flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-amber-500" />
            Termination Summary
          </h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-[#000435]/55">Employee</span>
            <span className="font-semibold text-[#000435] text-right">{record.staffName}</span>
            <span className="text-[#000435]/55">Net Salary</span>
            <span className="font-medium text-[#000435] text-right tabular-nums">{fmtRwf(record.netSalary)}</span>
            <span className="text-[#000435]/55">Years Worked</span>
            <span className="font-medium text-[#000435] text-right">{record.yearsWorked} Years</span>
            <span className="text-[#000435]/55">Multiplier</span>
            <span className="font-medium text-[#000435] text-right">×{record.multiplier}</span>
            <span className="text-[#000435]/55">Severance Benefit</span>
            <span className="font-medium text-[#000435] text-right tabular-nums">{fmtRwf(r.severanceBenefit)}</span>
            <span className="text-[#000435]/55">Gross Settlement</span>
            <span className="font-semibold text-[#000435] text-right tabular-nums">{fmtRwf(r.grossSettlement)}</span>
            <p className="col-span-2 text-[11px] text-[#000435]/45">
              Severance only — final month salary is paid separately via Payroll Run.
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-amber-200/60 flex justify-between items-center">
            <span className="text-sm font-bold text-[#000435]">Total Payable</span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums">{fmtRwf(r.totalPayable)}</span>
          </div>
        </div>

        {record.terminationReason && (
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Termination Reason</p>
            <p className="text-sm text-slate-700">{record.terminationReason}</p>
          </div>
        )}

        {record.status === 'paid' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 space-y-2 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
              <CreditCard size={12} /> Payment Recorded
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-500">Date</span><span className="font-medium text-right">{formatDisplayDate(record.paymentDate)}</span>
              <span className="text-slate-500">Method</span><span className="font-medium text-right">{record.paymentMethod || '—'}</span>
              <span className="text-slate-500">Reference</span><span className="font-medium text-right">{record.paymentReference || '—'}</span>
            </div>
          </div>
        )}

        {['approved', 'paid'].includes(record.status) && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Post-termination:</strong> Employee status is Terminated in the directory.
            Payroll runs exclude this employee. Portal login and dashboard access are disabled.
          </div>
        )}
      </div>

      {/* Actions footer */}
      {(onEdit || onRecordPayment || (isManager && isPending)) && (
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap gap-2">
          {variant === 'accountant' && ['draft', 'rejected'].includes(record.status) && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {variant === 'accountant' && record.status === 'approved' && onRecordPayment && (
            <button
              type="button"
              onClick={() => onRecordPayment(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle size={14} /> Record Payment
            </button>
          )}
          {isManager && isPending && onReject && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onReject(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {isManager && isPending && onApprove && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onApprove(record)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send size={14} /> Approve
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { StatusBadge, fmtRwf };
