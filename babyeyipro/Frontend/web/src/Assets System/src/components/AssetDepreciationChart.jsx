import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { TrendingDown } from 'lucide-react'
import { formatRwf } from '../../../assets_portal/utils/assetsCalculations'

const NAVY = '#000435'
const GOLD = '#FEBF10'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const nbv = payload.find((p) => p.dataKey === 'nbv')?.value
  const annual = payload.find((p) => p.dataKey === 'annual')?.value
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-[#000435] mb-1">{label}</p>
      {nbv != null && (
        <p className="text-emerald-700 tabular-nums">
          Net book: <span className="font-bold">RWF {formatRwf(nbv)}</span>
        </p>
      )}
      {annual != null && annual > 0 && (
        <p className="text-amber-700 tabular-nums mt-0.5">
          Annual dep: <span className="font-bold">RWF {formatRwf(annual)}</span>
        </p>
      )}
    </div>
  )
}

export default function AssetDepreciationChart({ data = [], assetId = 'asset', height = 220, title = 'Depreciation trend' }) {
  const gradId = `nbvGrad-${assetId}`
  const lastNbv = data.length ? data[data.length - 1]?.nbv : 0
  const firstNbv = data.length ? data[0]?.nbv : 0
  const decline = firstNbv > 0 ? Math.round(((firstNbv - lastNbv) / firstNbv) * 100) : 0

  return (
    <section className="rounded-2xl border border-black/10 bg-gradient-to-br from-white to-slate-50/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#000435] flex items-center justify-center">
            <TrendingDown size={16} className="text-[#FEBF10]" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#000435]">{title}</h3>
            {data.length > 1 && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Projected decline: <span className="font-bold text-amber-700">{decline}%</span>
              </p>
            )}
          </div>
        </div>
        {lastNbv > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Closing NBV</p>
            <p className="text-sm font-bold text-emerald-700 tabular-nums">RWF {formatRwf(lastNbv)}</p>
          </div>
        )}
      </div>
      <div className="p-4">
        {data.length > 0 ? (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height={height} minWidth={0}>
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.55} />
                    <stop offset="50%" stopColor={GOLD} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={NAVY} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                {firstNbv > 0 && (
                  <ReferenceLine y={firstNbv} stroke="#94a3b8" strokeDasharray="6 4" strokeOpacity={0.6} />
                )}
                <Area
                  type="monotone"
                  dataKey="nbv"
                  stroke={NAVY}
                  fill={`url(#${gradId})`}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: GOLD, stroke: NAVY, strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: GOLD, stroke: NAVY, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-10">No depreciation data for chart.</p>
        )}
      </div>
    </section>
  )
}
