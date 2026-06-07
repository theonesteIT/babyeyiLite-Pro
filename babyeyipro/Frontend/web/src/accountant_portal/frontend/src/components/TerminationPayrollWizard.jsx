import { useEffect, useMemo, useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, Loader2, CheckCircle, Calculator, Settings2, FileText,
} from 'lucide-react';
import { fmtRwf as termFmtRwf } from '../components/TerminationDetailPanel';
import { formatDisplayDate } from '../utils/terminationBenefitsCalc';
import {
  buildTerminatedPayrollSnapshot,
  calcTerminatedNetToGross,
} from '../utils/terminatedMonthPayroll';
import { configureTerminationPayroll } from '../services/terminationBenefitsService';
import api from '../services/api';

const STEPS = [
  { id: 'period', label: 'Period & net salary', icon: FileText },
  { id: 'calculation', label: 'Payroll breakdown', icon: Calculator },
  { id: 'confirm', label: 'Save to payroll run', icon: Settings2 },
];

function Row({ label, value, highlight, negative }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-black/[0.04] last:border-0 text-sm">
      <span className="text-[#000435]/60">{label}</span>
      <span className={`font-semibold tabular-nums ${negative ? 'text-red-600' : highlight ? 'text-emerald-700' : 'text-[#000435]'}`}>
        {value}
      </span>
    </div>
  );
}

export default function TerminationPayrollWizard({ open, record, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState(null);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [useDaysWorked, setUseDaysWorked] = useState(true);
  const [monthlyNet, setMonthlyNet] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !record) return;
    setStep(0);
    setError('');
    setUseDaysWorked(record.useDaysWorked !== false);
    setMonthlyNet(String(record.netSalary || ''));
    setLoadingTpl(true);
    api.get('/accountant/payroll/templates/active')
      .then((res) => setTemplate(res?.data?.data || null))
      .catch(() => setTemplate(null))
      .finally(() => setLoadingTpl(false));
  }, [open, record]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const calcResult = useMemo(() => {
    if (!record || !Number(monthlyNet)) return null;
    return calcTerminatedNetToGross({
      monthlyNetSalary: Number(monthlyNet),
      terminationDate: record.terminationDate,
      useDaysWorked,
      payeRates: template?.payeRates,
    });
  }, [record, monthlyNet, useDaysWorked, template]);

  const snapshot = useMemo(() => {
    if (!record || !calcResult) return null;
    return buildTerminatedPayrollSnapshot({
      record: { ...record, netSalary: Number(monthlyNet), useDaysWorked },
      template,
      useDaysWorked,
      monthlyNetSalary: Number(monthlyNet),
    });
  }, [record, calcResult, template, useDaysWorked, monthlyNet]);

  const handleSave = async () => {
    if (!record?.id || !snapshot) return;
    setSaving(true);
    setError('');
    try {
      await configureTerminationPayroll(record.id, {
        payrollSnapshot: snapshot,
        useDaysWorked,
        netSalary: Number(monthlyNet),
      });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save payroll configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#000435]/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-black/[0.06] bg-gradient-to-r from-amber-500 to-amber-600 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold">Configure Payroll</p>
              <h3 className="text-lg font-bold">{record.staffName}</h3>
              <p className="text-sm text-white/85 mt-0.5">
                Termination {formatDisplayDate(record.terminationDate)} · Final month payroll
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[#000435]/70">
                Use the employee&apos;s usual monthly net salary. Gross will be calculated with termination rules:
                base = gross, no allowances, PAYE + CSR 6%, no RAMA or maternity, then Mutuelle 0.5% removed for total payable.
              </p>
              <label className="block">
                <span className="text-xs font-semibold text-[#000435]/60">Monthly net salary (RWF)</span>
                <input
                  type="number"
                  min={0}
                  value={monthlyNet}
                  onChange={(e) => setMonthlyNet(e.target.value)}
                  className="mt-1.5 w-full py-2.5 px-3 rounded-xl border border-black/[0.08] text-sm text-[#000435]"
                />
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-black/[0.06] bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDaysWorked}
                  onChange={(e) => setUseDaysWorked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-amber-500"
                />
                <span className="text-sm text-[#000435]">
                  <span className="font-semibold block">Prorate by days worked</span>
                  Pay only for days worked in the termination month (net ÷ month days × days worked).
                </span>
              </label>
              {calcResult && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm">
                  <p className="font-semibold text-[#000435]">Target net pay (before Mutuelle): {termFmtRwf(calcResult.proratedNetPay)}</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {loadingTpl ? (
                <p className="text-sm text-[#000435]/50 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading PAYE rates…</p>
              ) : !calcResult ? (
                <p className="text-sm text-red-600">Enter a valid net salary to calculate payroll.</p>
              ) : (
                <>
                  <div className="rounded-xl border border-black/[0.06] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/45 mb-2">Earnings</p>
                    <Row label="Gross salary (= base salary)" value={termFmtRwf(calcResult.grossSalary)} highlight />
                    <Row label="Basic / housing / transport / others" value="0 (terminated)" />
                  </div>
                  <div className="rounded-xl border border-black/[0.06] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/45 mb-2">Deductions</p>
                    <Row label="PAYE" value={termFmtRwf(calcResult.paye)} negative />
                    <Row label="Employee CSR (6%)" value={termFmtRwf(calcResult.rssbEmployee)} negative />
                    <Row label="RAMA" value="—" />
                    <Row label="Maternity leave" value="—" />
                    <Row label="Net pay (before Mutuelle)" value={termFmtRwf(calcResult.netPay)} highlight />
                    <Row label="Mutuelle / CBHI (0.5%)" value={termFmtRwf(calcResult.cbhi)} negative />
                    <Row label="Total payable" value={termFmtRwf(calcResult.totalPayable)} highlight />
                  </div>
                  <div className="rounded-xl border border-black/[0.06] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/45 mb-2">Employer CSR</p>
                    <Row label="Employer CSR (6%)" value={termFmtRwf(calcResult.rssbEmployer)} />
                    <Row label="Occupational hazard (2% on base)" value={termFmtRwf(calcResult.occupationalHazard)} />
                    <Row label="CSR employer total (8%)" value={termFmtRwf(calcResult.csrEmployer8)} />
                    <Row label="Total CSR 14% (6% + 6% + 2%)" value={termFmtRwf(calcResult.totalCsr14)} highlight />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && snapshot && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
                  <p className="font-semibold">Ready for payroll run</p>
                  <p className="mt-1 text-emerald-800/90">
                    This configuration will appear on <strong>Payroll Run</strong> for{' '}
                    {snapshot.payMonth}/{snapshot.payYear} when you generate that month&apos;s payroll.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-black/[0.06] p-4 space-y-1">
                <Row label="Employee" value={record.staffName} />
                <Row label="Gross" value={termFmtRwf(snapshot.calc.grossSalary)} />
                <Row label="Net before Mutuelle" value={termFmtRwf(snapshot.calc.netPay)} />
                <Row label="Total payable (after CBHI)" value={termFmtRwf(snapshot.totalPayable)} highlight />
              </div>
              {record.payrollSnapshot && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Existing payroll configuration will be replaced.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-black/[0.06] flex items-center justify-between gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-[#000435]/60 hover:bg-white border border-black/[0.08]"
          >
            {step === 0 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!calcResult}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[#000435] text-white disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving || !snapshot}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Save & apply to payroll run
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
