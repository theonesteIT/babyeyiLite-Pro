import { useEffect, useMemo, useState } from 'react'
import { X, Wrench, Users, Loader2, MapPin, Pencil } from 'lucide-react'
import QRCode from '../../../assets_portal/components/AssetQrCode'
import AssetDepreciationChart from './AssetDepreciationChart'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { buildAssetScanUrl } from '../../../assets_portal/utils/assetsQr'
import {
  buildDepreciationSeries,
  buildMaintenanceHistory,
  buildAssignedStaff,
  formatAssetDetailRows,
} from '../../../assets_portal/utils/assetPanelData'
import { formatRwf, formatLocationValue, computePurchaseTax } from '../../../assets_portal/utils/assetsCalculations'
import { AssetStatusBadge } from './AssetStatusMenu'
import { AssetHealthStatusBadge } from './AssetHealthStatusMenu'

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
  const details = useMemo(() => {
    if (!asset) return []
    const skip = new Set([
      'SD Number', 'Receipt Number', 'Reference No', 'Invoice',
      'Unit price (excl. tax)', 'VAT 18%', 'Price incl. tax', 'Remain (excl. tax)', 'Status',
    ])
    return formatAssetDetailRows(asset).filter((r) => !skip.has(r.label))
  }, [asset])
  const purchaseTax = useMemo(() => {
    if (!asset) return null
    if (asset.tax_amount != null) {
      return {
        base: Number(asset.unit_price) || 0,
        taxAmount: Number(asset.tax_amount) || 0,
        priceInclTax: Number(asset.price_incl_tax) || 0,
      }
    }
    return computePurchaseTax(asset.unit_price)
  }, [asset])
  const qrValue = asset ? (asset.qr_value || buildAssetScanUrl(asset)) : ''

  return (
    <>
      <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 bg-[#000435] text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]">Asset preview</p>
          <h2 className="text-lg font-bold truncate">{asset?.asset_name || asset?.name || 'Loading…'}</h2>
            <p className="text-xs text-white/60 font-mono mt-0.5">{asset?.asset_code || asset?.code || '—'}</p>
            {asset?.asset_health_status && (
              <div className="mt-2">
                <AssetHealthStatusBadge value={asset.asset_health_status} />
              </div>
            )}
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

            {/* Purchase & tax */}
            <section className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-[#000435] text-white flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider">Purchase & tax</h3>
                <AssetStatusBadge value={asset.assets_status || asset.status} />
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FEBF10]/25 border border-[#FEBF10]/40 p-3">
                    <p className="text-[10px] font-bold uppercase text-[#000435]/60">Unit price (excl. tax)</p>
                    <p className="text-sm font-bold text-[#000435] tabular-nums mt-1">RWF {formatRwf(purchaseTax?.base)}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-[10px] font-bold uppercase text-emerald-700/70">VAT 18%</p>
                    <p className="text-sm font-bold text-emerald-800 tabular-nums mt-1">RWF {formatRwf(purchaseTax?.taxAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-[#000435]/5 border border-[#000435]/15 p-3">
                    <p className="text-[10px] font-bold uppercase text-[#000435]/60">Price incl. tax</p>
                    <p className="text-sm font-bold text-[#000435] tabular-nums mt-1">RWF {formatRwf(purchaseTax?.priceInclTax)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Remain (excl. tax)</p>
                    <p className="text-sm font-bold text-[#000435] tabular-nums mt-1">RWF {formatRwf(purchaseTax?.base)}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-2 text-sm border-t border-gray-100 pt-3">
                  {[
                    { label: 'Invoice', value: asset.invoice_number },
                    { label: 'SD Number', value: asset.sd_number },
                    { label: 'Receipt Number', value: asset.receipt_number },
                    { label: 'Reference No', value: asset.reference_no },
                    { label: 'Funding source', value: asset.funding_source },
                  ].filter((r) => r.value).map((row) => (
                    <div key={row.label} className="flex justify-between gap-3">
                      <dt className="text-re-text-muted">{row.label}</dt>
                      <dd className="font-medium text-[#000435] text-right break-all">{row.value}</dd>
                    </div>
                  ))}
                </dl>
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
            <AssetDepreciationChart data={depSeries} assetId={assetId} height={200} />

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
