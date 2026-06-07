import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  History,
  ImageUp,
  Loader2,
  RotateCcw,
  ScanLine,
  X,
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useAuth } from '../../../assets_portal/context/AuthContext'
import { assetsHref } from '../../../assets_portal/config/portal'
import { parseAssetQrValue } from '../../../assets_portal/utils/assetsQr'
import { lookupPublicAssetScan } from '../../../assets_portal/services/publicAssetScanApi'
import assetTestApi from '../../../assets_portal/services/assetTestApi'
import AssetPublicScanCard from '../../../assets_portal/components/AssetPublicScanCard'
import AssetPreviewPanel from '../components/AssetPreviewPanel'

const MANAGER_ROLES = new Set([
  'ASSETS_MANAGER', 'ASSET_MANAGER', 'SCHOOL_ADMIN', 'SCHOOL_MANAGER', 'DOS', 'ACCOUNTANT',
  'SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER',
])

const ACCEPT_IMAGE = 'image/png,image/jpeg,image/webp,image/gif,image/bmp'

function isAssetsManager(staff) {
  if (!staff) return false
  const role = String(staff.role?.code || staff.role_code || '').toUpperCase()
  return MANAGER_ROLES.has(role)
}

function ScanHistoryChip({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.raw)}
      className="text-left w-full px-3 py-2 rounded-lg border border-slate-100 hover:border-[#FEBF10]/60 hover:bg-amber-50/50 transition-colors"
    >
      <p className="text-xs font-semibold text-[#000435] truncate">{item.label}</p>
      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{item.raw}</p>
    </button>
  )
}

export default function AssetDetailQRScan() {
  const { staff, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const manager = isAssetsManager(staff)

  const [tab, setTab] = useState('upload')
  const [previewUrl, setPreviewUrl] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [rawValue, setRawValue] = useState('')
  const [publicAsset, setPublicAsset] = useState(null)
  const [managerAssetId, setManagerAssetId] = useState(null)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)

  const scannerRef = useRef(null)
  const fileInputRef = useRef(null)
  const processingRef = useRef(false)
  const urlScannedRef = useRef(false)

  const pushHistory = useCallback((raw, label) => {
    const text = String(raw || '').trim()
    if (!text) return
    setHistory((prev) => {
      const next = [{ raw: text, label: label || text.slice(0, 48), at: Date.now() }, ...prev.filter((h) => h.raw !== text)]
      return next.slice(0, 8)
    })
  }, [])

  const resolveScan = useCallback(async (raw) => {
    const text = String(raw || '').trim()
    if (!text || processingRef.current) return
    processingRef.current = true
    setScanning(true)
    setStatus('scanning')
    setError('')
    setPublicAsset(null)
    setManagerAssetId(null)
    setRawValue(text)

    const parsed = parseAssetQrValue(text)
    const lookupId = parsed.id || undefined
    const lookupCode = parsed.code || undefined

    try {
      if (manager) {
        try {
          const panel = await assetTestApi.lookupScanAsset({ id: lookupId, code: lookupCode })
          if (panel?.asset?.id) {
            setManagerAssetId(panel.asset.id)
            pushHistory(text, panel.asset.asset_name || panel.asset.asset_code)
            setStatus('manager')
            return
          }
        } catch {
          /* fall through to public lookup */
        }
      }

      const data = await lookupPublicAssetScan({ id: lookupId, code: lookupCode })
      setPublicAsset(data)
      pushHistory(text, data.asset_name || data.asset_code)
      setStatus('public')
    } catch (err) {
      setError(err?.message || 'Could not find an asset for this QR code')
      setStatus('error')
    } finally {
      setScanning(false)
      processingRef.current = false
    }
  }, [manager, pushHistory])

  const stopCamera = useCallback(async () => {
    try {
      const inst = scannerRef.current
      if (inst?.isScanning) await inst.stop()
      if (inst) await inst.clear().catch(() => {})
    } catch {
      /* ignore */
    } finally {
      scannerRef.current = null
      setCameraActive(false)
    }
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    setTab('webcam')
    try {
      await stopCamera()
      setCameraActive(true)
      await new Promise((r) => setTimeout(r, 60))
      const reader = new Html5Qrcode('asset-qr-reader')
      scannerRef.current = reader
      await reader.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => resolveScan(decoded),
        () => {}
      )
    } catch (err) {
      setCameraError(err?.message || 'Could not open camera')
      setCameraActive(false)
      scannerRef.current = null
    }
  }, [resolveScan, stopCamera])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setTab('upload')
    await stopCamera()
    const url = URL.createObjectURL(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    setScanning(true)
    setStatus('scanning')
    setError('')
    try {
      const decoded = await Html5Qrcode.scanFile(file, false)
      await resolveScan(decoded)
    } catch {
      setError('No QR code found in this image. Try another photo with better lighting.')
      setStatus('error')
      setScanning(false)
    }
  }, [resolveScan, stopCamera])

  const clearResult = useCallback(() => {
    setStatus('idle')
    setError('')
    setRawValue('')
    setPublicAsset(null)
    setManagerAssetId(null)
    setCopied(false)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [])

  const copyRaw = useCallback(async () => {
    if (!rawValue) return
    try {
      await navigator.clipboard.writeText(rawValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [rawValue])

  useEffect(() => {
    if (authLoading || urlScannedRef.current) return undefined
    const assetParam = searchParams.get('asset') || searchParams.get('id')
    const codeParam = searchParams.get('code')
    if (!assetParam && !codeParam) return undefined
    urlScannedRef.current = true
    if (assetParam) {
      resolveScan(
        `https://local/assets/scan?asset=${encodeURIComponent(assetParam)}${codeParam ? `&code=${encodeURIComponent(codeParam)}` : ''}`
      )
    } else {
      resolveScan(`CODE:${codeParam}|TAG:|SN:|ID:`)
    }
    return undefined
  }, [authLoading, searchParams, resolveScan])

  useEffect(() => () => {
    stopCamera()
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [stopCamera])

  useEffect(() => {
    if (tab !== 'webcam') stopCamera()
  }, [tab, stopCamera])

  return (
    <div className="assets-portal-root min-h-screen bg-[#F1F4FB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10] mb-1">Assets Portal</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000435]">Scan QR Code</h1>
          <p className="text-sm text-slate-500 mt-1">Drop an image or use your webcam to scan an asset tag.</p>
          {manager && (
            <p className="text-xs text-emerald-700 mt-2 font-medium">Signed in — full asset details will appear after scan.</p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'upload' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'}`}
              >
                <ImageUp size={16} /> Upload Image
              </button>
              <button
                type="button"
                onClick={() => { setTab('webcam'); if (!cameraActive) startCamera() }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'webcam' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-500'}`}
              >
                <Camera size={16} /> Use Webcam
              </button>
            </div>
            <p className="text-xs text-slate-400">Supports PNG, JPG, WEBP, GIF, BMP</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-100">
            <div className="p-5 sm:p-6">
              {tab === 'upload' ? (
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click() }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFile(file)
                  }}
                  className="min-h-[280px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#FEBF10]/60 hover:bg-amber-50/30 transition-colors"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Uploaded QR" className="max-h-52 max-w-full object-contain rounded-lg" />
                  ) : (
                    <>
                      <ImageUp size={40} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">Drop image here or click to upload</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_IMAGE}
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className="relative min-h-[280px] rounded-2xl overflow-hidden bg-[#000435]"
                    style={{ border: `2px solid ${cameraActive ? '#FEBF10' : '#E2E8F0'}` }}
                  >
                    <div id="asset-qr-reader" className="absolute inset-0" />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40">
                        <Camera size={36} />
                        <p className="text-xs font-semibold uppercase tracking-wider">Camera off</p>
                      </div>
                    )}
                  </div>
                  {cameraError && (
                    <p className="text-sm text-red-600">{cameraError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => (cameraActive ? stopCamera() : startCamera())}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#000435] text-white hover:bg-[#000435]/90"
                  >
                    {cameraActive ? 'Stop camera' : 'Start camera'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 flex flex-col min-h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#000435]">Scanned Result</h2>
                {history.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <History size={14} /> History
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>

              {scanning && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 className="animate-spin text-[#FEBF10]" size={32} />
                  <p className="text-sm font-medium text-slate-500">Looking up asset…</p>
                </div>
              )}

              {!scanning && status === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ScanLine size={36} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">Scan a QR code to see asset information here.</p>
                  {history.length > 0 && (
                    <div className="w-full mt-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">Recent</p>
                      {history.slice(0, 4).map((item) => (
                        <ScanHistoryChip key={item.at} item={item} onSelect={resolveScan} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!scanning && status === 'error' && (
                <div className="space-y-4">
                  <p className="text-sm text-red-700 rounded-xl border border-red-200 bg-red-50 px-4 py-3">{error}</p>
                  {rawValue && (
                    <div className="rounded-xl border bg-slate-50 px-3 py-2 font-mono text-xs break-all text-slate-600">{rawValue}</div>
                  )}
                  <button type="button" onClick={clearResult} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <RotateCcw size={14} /> Try again
                  </button>
                </div>
              )}

              {!scanning && status === 'public' && publicAsset && (
                <div className="flex-1 overflow-y-auto">
                  <AssetPublicScanCard asset={publicAsset} qrPayload={publicAsset.qr_payload} onCopy={() => setCopied(true)} />
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={copyRaw} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold text-[#000435] hover:bg-slate-50">
                      <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button" onClick={clearResult} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold text-red-600 hover:bg-red-50">
                      <X size={14} /> Clear
                    </button>
                  </div>
                </div>
              )}

              {!scanning && status === 'manager' && managerAssetId && (
                <div className="flex-1 flex flex-col min-h-0 -mx-2">
                  <div className="flex items-center gap-2 text-emerald-600 mb-3 px-2">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-semibold">Asset found — full register view</span>
                  </div>
                  <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 flex flex-col max-h-[520px]">
                    <AssetPreviewPanel assetId={managerAssetId} onClose={clearResult} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 px-2">
                    <Link
                      to={`${assetsHref('asset-add-test')}?asset=${managerAssetId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#000435] text-white text-sm font-bold hover:bg-[#000435]/90"
                    >
                      <ExternalLink size={14} /> Open in register
                    </Link>
                    <button type="button" onClick={clearResult} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold text-red-600 hover:bg-red-50">
                      <X size={14} /> Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
