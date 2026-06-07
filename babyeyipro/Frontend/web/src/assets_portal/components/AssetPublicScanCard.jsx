import { CheckCircle2, Copy, Package, ShieldCheck } from 'lucide-react'
import { AssetHealthStatusBadge } from '../../Assets System/src/components/AssetHealthStatusMenu'

export default function AssetPublicScanCard({ asset, qrPayload, onCopy }) {
  const payload = qrPayload || asset?.qr_payload || ''
  const name = asset?.asset_name || 'Asset'
  const code = asset?.asset_code || '—'
  const category = asset?.category || ''

  const handleCopy = async () => {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
      onCopy?.()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 size={18} />
        <span className="text-sm font-semibold">QR code verified</span>
      </div>

      <div className="rounded-2xl border border-[#000435]/10 bg-gradient-to-br from-[#000435]/5 to-white p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#000435] text-[#FEBF10] flex items-center justify-center">
            <Package size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/50 mb-1">Asset name</p>
            <h3 className="text-xl font-bold text-[#000435] leading-snug">{name}</h3>
            <p className="text-sm font-mono text-[#000435]/70 mt-1">{code}</p>
            {category && (
              <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEBF10]/20 text-[#000435]">
                {category}
              </span>
            )}
            {asset?.asset_health_status && (
              <div className="mt-2">
                <AssetHealthStatusBadge value={asset.asset_health_status} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#000435]/50">Asset code</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Public view</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-[#000435] break-all leading-relaxed">
          {payload || '—'}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-xs text-blue-900">
        <ShieldCheck size={16} className="shrink-0 mt-0.5" />
        <p>Sign in as an asset manager to view full register details, depreciation, and assignment history.</p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        disabled={!payload}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#000435] text-white text-sm font-bold hover:bg-[#000435]/90 disabled:opacity-50"
      >
        <Copy size={16} />
        Copy asset code
      </button>
    </div>
  )
}
