import { Calculator, TrendingUp } from 'lucide-react';

export function computeShuleAvanceRepayment(principal, monthlyRatePercent, months) {
  const P = Number(principal);
  const r = Number(monthlyRatePercent);
  const n = Math.max(1, Math.min(12, Math.floor(Number(months))));
  if (!Number.isFinite(P) || P <= 0) return null;
  if (!Number.isFinite(r) || r < 0) return null;
  const totalInterest = P * (r / 100) * n;
  const totalRepayment = P + totalInterest;
  const monthlyInstallment = totalRepayment / n;
  return {
    principal: P,
    monthlyRatePercent: r,
    months: n,
    totalInterest,
    totalRepayment,
    monthlyInstallment,
  };
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

export default function ShuleAvanceRepaymentCalculator({
  principal,
  monthlyRatePercent,
  months,
  title = 'Repayment estimate',
  className = '',
}) {
  const r = computeShuleAvanceRepayment(principal, monthlyRatePercent, months);
  if (!r) {
    return (
      <div className={`rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-xs font-bold text-amber-900/70 ${className}`}>
        Enter amount and term to see estimates.
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/40 p-4 shadow-inner ${className}`}
    >
      <div className="flex items-center gap-2 text-slate-900">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <Calculator className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</p>
          <p className="text-xs font-bold text-slate-600">
            Rate <span className="text-slate-900">{r.monthlyRatePercent.toFixed(2)}%</span> / month ·{' '}
            <span className="text-slate-900">{r.months}</span> months
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Est. total interest</p>
          <p className="text-sm font-black text-slate-900">{formatMoney(r.totalInterest)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Total to repay</p>
          <p className="text-sm font-black text-slate-900">{formatMoney(r.totalRepayment)}</p>
        </div>
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-900">
            <TrendingUp className="h-3 w-3" /> Monthly installment
          </p>
          <p className="text-base font-black text-slate-900">{formatMoney(r.monthlyInstallment)}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-bold leading-relaxed text-slate-500">
        Illustrative only. Simple interest: principal × monthly rate × months. Final terms follow school approval.
      </p>
    </div>
  );
}
