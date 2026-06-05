import { useState, useEffect, useRef } from 'react'
import { Search, Loader2, CheckCircle2, X } from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { formatLocationValue } from '../../../assets_portal/utils/assetsCalculations'

const NAVY = '#000435'
const GOLD = '#FEBF10'

export function normalizePickerAsset(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.asset_name || row.name || 'Asset',
    code: row.asset_code || row.code || '',
    serialNumber: row.serial_number || row.serialNumber || '',
    sku: row.sku || '',
    category: row.category || row.asset_type || '—',
    location: formatLocationValue(row.location) || '—',
    status: row.status || 'Active',
  }
}

export default function AssetPickerSearch({
  value = null,
  onChange,
  disabled = false,
  error,
  label = 'Search asset',
  hint = 'Search by name, asset code, serial number, or SKU',
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (value) {
      setQuery(value.name || '')
    } else if (!query) {
      setQuery('')
    }
  }, [value?.id])

  useEffect(() => {
    if (disabled || value) {
      setResults([])
      return undefined
    }
    const q = query.trim()
    if (!q) {
      setResults([])
      return undefined
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setLoading(true)
      assetsApi.listAssets({ q, search_field: 'all', limit: 25 })
        .then((rows) => setResults((rows || []).map(normalizePickerAsset)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(timerRef.current)
  }, [query, disabled, value])

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (asset) => {
    onChange?.(asset)
    setQuery(asset.name)
    setOpen(false)
    setResults([])
  }

  const clear = () => {
    onChange?.(null)
    setQuery('')
    setResults([])
  }

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wider font-bold" style={{ color: `${NAVY}99` }}>{label}</p>
      {value ? (
        <div className="bg-white rounded-xl p-4 border-2 shadow-sm relative" style={{ borderColor: `${GOLD}88` }}>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-[#000435] hover:bg-gray-100 disabled:opacity-50"
            aria-label="Clear selected asset"
          >
            <X size={16} />
          </button>
          <p className="text-[10px] uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5" style={{ color: NAVY }}>
            <CheckCircle2 size={12} style={{ color: GOLD }} /> Selected asset
          </p>
          <p className="font-semibold text-sm pr-8" style={{ color: NAVY }}>{value.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500 font-medium">
            {value.code && <span className="font-mono">{value.code}</span>}
            {value.serialNumber && <span>Serial: {value.serialNumber}</span>}
            {value.sku && <span>SKU: {value.sku}</span>}
          </div>
        </div>
      ) : (
        <div className="relative" ref={wrapRef}>
          <div className={`flex items-center border-2 rounded-xl transition-all ${error ? 'border-red-300' : 'border-gray-200 focus-within:border-[#FEBF10]'}`}>
            <Search size={18} className="ml-3 text-gray-400 shrink-0" />
            <input
              type="text"
              disabled={disabled}
              className="w-full px-3 py-3 text-sm bg-transparent outline-none disabled:opacity-60"
              placeholder={hint}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
            {loading && <Loader2 size={16} className="mr-3 animate-spin text-gray-400" />}
          </div>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          {open && results.length > 0 && (
            <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
              {results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 border-b border-gray-50 last:border-0 transition-colors"
                  onClick={() => pick(a)}
                >
                  <p className="text-sm font-semibold" style={{ color: NAVY }}>{a.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                    {[a.code, a.serialNumber && `Serial ${a.serialNumber}`, a.sku && `SKU ${a.sku}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          )}
          {open && query.trim() && !loading && results.length === 0 && (
            <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-xs text-gray-500">
              No assets match your search.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
