import { useEffect, useMemo, useState } from 'react'
import { X, Wrench, Users, TrendingDown, Loader2, MapPin, Pencil } from 'lucide-react'
import QRCode from '../../../assets_portal/components/AssetQrCode'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { buildAssetQrValue } from '../../../assets_portal/utils/assetsQr'
import {
  buildDepreciationSeries,
  buildMaintenanceHistory,
  buildAssignedStaff,
  formatAssetDetailRows,
} from '../../../assets_portal/utils/assetPanelData'
import { formatRwf, formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'

export default function AssetPreviewPanel({ assetId, onClose, onEdit }) {
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!assetId) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    assetsApi.getAssetPanel(assetId)
      .then((data) => { if (!cancelled) setPanel(data) })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load asset')
          assetsApi.getAsset(assetId).then((asset) => {
            if (!cancelled) {
              setPanel({
                asset,
                maintenance: buildMaintenanceHistory(asset),
                assignments: buildAssignedStaff(asset),
              })
            }
          }).catch(() => {})
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [assetId])

  const asset = panel?.asset
  const maintenance = panel?.maintenance?.length ? panel.maintenance : (asset ? buildMaintenanceHistory(asset) : [])
  const assignments = panel?.assignments ?? (asset ? buildAssignedStaff(asset) : [])
  const depSeries = useMemo(() => (asset ? buildDepreciationSeries(asset) : []), [asset])
  const details = useMemo(() => (asset ? formatAssetDetailRows(asset) : []), [asset])
  const qrValue = asset ? (asset.qr_value || buildAssetQrValue(asset)) : ''

  return (
    <>
      <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 bg-[#000435] text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]">Asset preview</p>
          <h2 className="text-lg font-bold truncate">{asset?.asset_name || asset?.name || 'Loading…'}</h2>
          <p className="text-xs text-white/60 font-mono mt-0.5">{asset?.asset_code || asset?.code || '—'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FEBF10] text-[#0B1530] text-xs font-bold hover:bg-[#FFD24D]"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-re-text-muted">
            <Loader2 className="animate-spin text-[#FEBF10]" size={22} />
            <span className="text-sm font-medium">Loading asset…</span>
          </div>
        )}

        {error && !loading && (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {asset && !loading && (
          <div className="space-y-5 p-4 pb-8">
            {/* QR + quick stats */}
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/10 bg-[#000435]/5 p-3 flex flex-col items-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#000435]/60 mb-2">QR Code</p>
                <div className="bg-white p-2 rounded-lg border border-black/10">
                  <QRCode value={qrValue} size={100} level="M" />
                </div>
                <p className="text-[9px] text-center text-re-text-muted mt-2 font-mono break-all">{asset.label_tag || 'No tag'}</p>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl bg-[#FEBF10]/30 border border-[#FEBF10]/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-[#000435]/60">Net book value</p>
                  <p className="text-lg font-bold text-[#000435] tabular-nums">RWF {formatRwf(asset.net_book_value)}</p>
                </div>
                <div className="rounded-xl bg-white border border-black/10 p-3 flex items-center gap-2 text-sm">
                  <MapPin size={14} className="text-[#000435] shrink-0" />
                  <span className="truncate text-re-text">{formatLocationValue(asset.location) || '—'}</span>
                </div>
              </div>
            </section>

            {/* Details */}
            <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-[#FEBF10]/40 border-b border-[#e5a800]/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#000435]">Asset details</h3>
              </div>
              <dl className="divide-y divide-gray-100">
                {details.map((row) => (
                  <div key={row.label} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                    <dt className="text-re-text-muted shrink-0">{row.label}</dt>
                    <dd className="font-medium text-[#000435] text-right break-all">
                      {typeof row.value === 'object' ? formatLocationValue(row.value) : row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Depreciation chart */}
            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-[#000435]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#000435]">Depreciation trend</h3>
              </div>
              {depSeries.length > 0 ? (
                <div className="w-full min-h-[176px]" style={{ height: 176 }}>
                  <ResponsiveContainer width="100%" height={176} minWidth={0}>
                    <AreaChart data={depSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`nbvGrad-${assetId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FEBF10" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#FEBF10" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                      <Tooltip formatter={(v) => [`RWF ${formatRwf(v)}`, 'NBV']} />
                      <Area type="monotone" dataKey="nbv" stroke="#000435" fill={`url(#nbvGrad-${assetId})`} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-re-text-muted text-center py-8">No depreciation data for chart.</p>
              )}
            </section>

            {/* Maintenance */}
            <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-[#000435] text-white flex items-center gap-2">
                <Wrench size={14} className="text-[#FEBF10]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Maintenance history</h3>
              </div>
              {maintenance.length === 0 ? (
                <p className="px-4 py-6 text-sm text-re-text-muted text-center">No maintenance records yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {maintenance.map((m) => (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-semibold text-[#000435]">{m.type}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{m.status}</span>
                      </div>
                      <p className="text-xs text-re-text-muted mt-1">{m.date} · {m.note}</p>
                      {m.cost != null && <p className="text-xs font-medium text-[#000435] mt-1">RWF {formatRwf(m.cost)}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Assigned staff */}
            <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-[#000435] text-white flex items-center gap-2">
                <Users size={14} className="text-[#FEBF10]" />
                <h3 className="text-xs font-bold uppercase tracking-wider">Assigned staff</h3>
              </div>
              {assignments.length === 0 ? (
                <p className="px-4 py-6 text-sm text-re-text-muted text-center">No staff assigned to this asset.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {assignments.map((s, i) => (
                    <li key={i} className="px-4 py-3 flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FEBF10] text-[#000435] font-bold flex items-center justify-center text-sm shrink-0">
                        {(s.name || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#000435]">{s.name}</p>
                        <p className="text-xs text-re-text-muted">{s.department} · {s.role}</p>
                        <p className="text-[10px] text-re-text-muted mt-0.5">Since {s.since}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  )
}
