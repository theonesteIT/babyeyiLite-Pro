import { Loader2 } from 'lucide-react';

const VARIANTS = {
  navy: 'bg-gradient-to-br from-[#000435] to-[#000c6e]',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-600',
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'navy',
  alert,
  loading,
  onClick,
}) {
  const bgClass = VARIANTS[color === 'amber' ? 'amber' : 'navy'] || VARIANTS.navy;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${bgClass} group relative w-full overflow-hidden rounded-2xl px-4 py-3.5 text-left shadow-[0_4px_16px_rgba(0,4,53,0.15)] transition-transform duration-150 ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99]' : 'cursor-default'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}
      />
      <div className="relative">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center justify-center rounded-xl bg-white/20 p-2">
            <Icon className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div className="flex gap-1.5">
            {alert && (
              <span className="animate-pulse rounded-full bg-white/30 px-1.5 py-0.5 text-[9px] font-black text-white">
                !
              </span>
            )}
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />}
          </div>
        </div>
        <div className="mb-0.5 text-2xl font-black tabular-nums text-white sm:text-[26px]">
          {loading ? (
            <span className="inline-block h-7 w-12 rounded-md bg-white/20" />
          ) : (
            (value ?? '—')
          )}
        </div>
        <div className="text-[11px] font-semibold text-white/85">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-white/55">{sub}</div>}
      </div>
    </button>
  );
}
