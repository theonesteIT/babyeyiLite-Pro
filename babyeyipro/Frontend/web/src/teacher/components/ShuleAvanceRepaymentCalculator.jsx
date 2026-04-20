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
      <div className={`rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-xs font-bold text-re-text-muted ${className}`}>
        Enter amount and term to see estimates.
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-re-orange/25 bg-gradient-to-br from-white to-re-bg/80 p-4 shadow-inner ${className}`}
    >
      <div className="flex items-center gap-2 text-re-text">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-re-orange/15 text-re-orange">
          <Calculator className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">{title}</p>
          <p className="text-xs font-bold text-re-text-muted">
            Rate <span className="text-re-text">{r.monthlyRatePercent.toFixed(2)}%</span> / month ·{' '}
            <span className="text-re-text">{r.months}</span> months
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-black/5 bg-white/90 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-re-text-muted">Est. total interest</p>
          <p className="text-sm font-black text-re-text">{formatMoney(r.totalInterest)}</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white/90 px-3 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-re-text-muted">Total to repay</p>
          <p className="text-sm font-black text-re-text">{formatMoney(r.totalRepayment)}</p>
        </div>
        <div className="rounded-xl border border-re-orange/30 bg-re-orange/5 px-3 py-2 sm:col-span-1">
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-re-orange">
            <TrendingUp className="h-3 w-3" /> Monthly installment
          </p>
          <p className="text-base font-black text-re-text">{formatMoney(r.monthlyInstallment)}</p>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-bold leading-relaxed text-re-text-muted/90">
        Illustrative only. Simple interest model. Final terms follow school approval.
      </p>
    </div>
  );
}
