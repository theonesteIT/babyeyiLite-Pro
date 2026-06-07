import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  X, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Copy,
  ChevronLeft, ChevronRight, Calendar, Download, Layers, TrendingUp,
} from 'lucide-react'
import assetTestApi from '../../../assets_portal/services/assetTestApi'
import { formatRwfPlain, yearOptionsFrom1900 } from '../../../assets_portal/utils/financialYearUtils'
import {
  parseAssetTestExcelFile,
  buildAssetTestImportPreview,
  downloadAssetTestImportTemplate,
  ASSET_TEST_IMPORT_HEADERS,
} from '../../../assets_portal/utils/assetTestExcelImport'

const NAVY = '#000435'
const AMBER = '#FEBF10'

const STATUS_STYLES = {
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  duplicate: 'bg-amber-100 text-amber-900 border-amber-200',
  invalid: 'bg-red-100 text-red-800 border-red-200',
}

export default function AssetTestImportModal({ open, onClose, onSuccess, confirming = false }) {
  const fileInputRef = useRef(null)
  const [phase, setPhase] = useState('year')
  const [isFirstEntry, setIsFirstEntry] = useState(true)
  const [selectedYear, setSelectedYear] = useState('')
  const [financialYears, setFinancialYears] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [file, setFile] = useState(null)
  const [previewRows, setPreviewRows] = useState([])
  const [openingByCategory, setOpeningByCategory] = useState({})
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [parseError, setParseError] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  const legacyYears = useMemo(() => yearOptionsFrom1900(), [])
  const activeYears = useMemo(() => financialYears.filter((y) => y.status === 'Active'), [financialYears])
  const selectedFinYear = useMemo(
    () => financialYears.find((y) => String(y.year) === String(selectedYear)),
    [financialYears, selectedYear]
  )
  const yearValid = isFirstEntry ? selectedFinYear?.status === 'Active' : Boolean(selectedYear)

  useEffect(() => {
    if (!open) return
    setPhase('year')
    setIsFirstEntry(true)
    setSelectedYear('')
    setFile(null)
    setPreviewRows([])
    setOpeningByCategory({})
    setParseError('')
    setLoadingMeta(true)
    assetTestApi.getMeta()
      .then((meta) => {
        const yrList = meta?.financial_years ?? []
        const cats = meta?.categories ?? []
        const active = meta?.active_financial_year ?? null
        setFinancialYears(Array.isArray(yrList) ? yrList : [])
        setCategories(Array.isArray(cats) ? cats : [])
        const defaultYear = active?.year ?? yrList.find((y) => y.status === 'Active')?.year ?? ''
        setSelectedYear(defaultYear ? String(defaultYear) : '')
      })
      .catch(() => {
        setFinancialYears([])
        setCategories([])
      })
      .finally(() => setLoadingMeta(false))
  }, [open])

  const depRateByCategory = useMemo(() => {
    const map = {}
    categories.forEach((c) => {
      if (c?.name) map[c.name] = Number(c.depreciation_rate) || 5
    })
    return map
  }, [categories])

  const loadOpeningContexts = useCallback(async (year, rows, firstTime) => {
    const cats = [...new Set(rows.map((r) => r.category).filter(Boolean))]
    const openings = {}
    await Promise.all(
      cats.map(async (cat) => {
        try {
          const ctx = await assetTestApi.getOpening(year, cat, {
            firstTime,
            entryMode: firstTime ? 'year_setup' : 'legacy',
          })
          openings[cat] = ctx
        } catch {
          openings[cat] = { effective_opening: 0, effective_accumulated_depreciation: 0, depreciation_rate: depRateByCategory[cat] ?? 5 }
        }
      })
    )
    return openings
  }, [depRateByCategory])

  const parseFile = async (selectedFile) => {
    if (!selectedFile || !selectedYear) return
    setFile(selectedFile)
    setLoadingPreview(true)
    setParseError('')
    setPreviewRows([])
    try {
      const parsed = await parseAssetTestExcelFile(selectedFile)
      if (!parsed.rows.length) {
        throw new Error('No data rows found. Check column headers match the template.')
      }
      const [openings, identifiers] = await Promise.all([
        loadOpeningContexts(selectedYear, parsed.rows, isFirstEntry),
        assetTestApi.getIdentifiers(selectedYear).catch(() => ({ skus: [] })),
      ])
      setOpeningByCategory(openings)
      const existingSkus = new Set(
        (identifiers?.skus ?? []).map((s) => String(s).trim().toUpperCase()).filter(Boolean)
      )
      const preview = buildAssetTestImportPreview(
        parsed.rows,
        openings,
        depRateByCategory,
        existingSkus
      )
      setPreviewRows(preview)
      setPhase('preview')
    } catch (err) {
      setParseError(err?.message || 'Failed to read Excel file')
      setPhase('file')
    } finally {
      setLoadingPreview(false)
    }
  }

  const summary = useMemo(() => {
    const ready = previewRows.filter((r) => r.status === 'ready').length
    const duplicate = previewRows.filter((r) => r.status === 'duplicate').length
    const invalid = previewRows.filter((r) => r.status === 'invalid').length
    return { ready, duplicate, invalid, total: previewRows.length, toImport: ready }
  }, [previewRows])

  const categoryOpeningSummary = useMemo(() => {
    return Object.entries(openingByCategory).map(([cat, ctx]) => ({
      category: cat,
      opening: Number(ctx?.effective_opening ?? ctx?.year_setup_opening ?? ctx?.year_opening_balance ?? 0),
      accumulated: Number(
        ctx?.effective_accumulated_depreciation
        ?? ctx?.year_setup_accumulated_depreciation
        ?? ctx?.accumulated_depreciation
        ?? 0
      ),
      source: ctx?.source_label || ctx?.source || 'auto',
      priorAssetName: ctx?.prior_asset_name || null,
      priorAssetCode: ctx?.prior_asset_code || null,
      assetsInYear: Number(ctx?.assets_in_year ?? 0),
    }))
  }, [openingByCategory])

  const handleYearContinue = () => {
    if (!yearValid) return
    setPhase('file')
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (selected) parseFile(selected)
  }

  const handleConfirm = () => {
    const rows = previewRows.filter((r) => r.status === 'ready').map((r) => r.payload)
    onSuccess?.({
      rows,
      skipDuplicates,
      registerYear: Number(selectedYear),
      entryMode: isFirstEntry ? 'year_setup' : 'legacy',
      firstTime: isFirstEntry,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm py-6">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
      <div
        className="relative w-full max-w-6xl mx-4 bg-[#F8F9FC] rounded-2xl shadow-2xl border border-gray-100 my-auto flex flex-col max-h-[92vh]"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="sticky top-0 z-10 rounded-t-2xl px-6 py-4 flex items-center justify-between text-white shrink-0" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AMBER }}>
              <FileSpreadsheet size={20} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Import Assets from Excel</h2>
              <p className="text-xs text-white/60">
                {phase === 'year' && 'Step 1 · Register year & opening context'}
                {phase === 'file' && `Step 2 · Upload file · FY ${selectedYear}`}
                {phase === 'preview' && `Step 3 · Review · ${summary.total} rows · FY ${selectedYear}`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={confirming} className="p-1.5 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {phase === 'year' && (
          <div className="p-6 space-y-5 overflow-y-auto">
            {loadingMeta ? (
              <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
                <Loader2 className="animate-spin" size={22} /> Loading financial years…
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Calendar size={14} /> Register mode
                  </p>
                  <div className="flex items-center justify-between px-3 py-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium" style={{ color: NAVY }}>
                        {isFirstEntry ? 'First time (Year Setup)' : 'Not first time (any year)'}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {isFirstEntry
                          ? 'Active financial year from Year Setup.'
                          : 'Any year 1900–now. Opening from last year’s last asset per category.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFirstEntry((v) => {
                          const next = !v
                          if (next) {
                            const active = financialYears.find((y) => y.status === 'Active')
                            setSelectedYear(active ? String(active.year) : '')
                          } else if (!selectedYear) {
                            setSelectedYear(String(new Date().getFullYear()))
                          }
                          return next
                        })
                      }}
                      className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${isFirstEntry ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isFirstEntry ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {isFirstEntry ? 'Financial year (Active) *' : 'Register year *'}
                    </label>
                    {isFirstEntry ? (
                      <select
                        className="assets-wizard-input w-full text-sm font-semibold"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        <option value="">Choose year…</option>
                        {financialYears.map((y) => (
                          <option key={y.id} value={y.year} disabled={y.status === 'Closed'}>
                            {y.year} / {y.year + 1} — {y.status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className="assets-wizard-input w-full text-sm font-semibold"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        <option value="">Choose year…</option>
                        {legacyYears.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5 mb-2">
                    <Layers size={14} /> How opening works on import
                  </p>
                  <ul className="text-xs text-blue-900/80 space-y-1 list-disc list-inside">
                    <li>First row per category uses year-start opening + accumulated depreciation.</li>
                    <li>Next rows: <strong>Opening</strong> = prior row TOTAL BALANCE · <strong>Acc. dep.</strong> = prior TOTAL DEPRECIATION · <strong>Annual dep.</strong> = total balance × depreciation rate.</li>
                    <li>Required columns: <strong>name</strong>, <strong>type</strong>, <strong>sku</strong>, <strong>purchase_unit_price</strong>.</li>
                    <li>Duplicate <strong>SKU</strong> in the selected year is flagged and can be skipped.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => downloadAssetTestImportTemplate(`asset-import-fy-${selectedYear || 'template'}`)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#000435]"
                  >
                    <Download size={16} /> Download template
                  </button>
                  <button
                    type="button"
                    onClick={handleYearContinue}
                    disabled={!yearValid}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                    style={{ background: AMBER, color: NAVY }}
                  >
                    Continue to upload <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'file' && (
          <div className="flex flex-col items-center justify-center py-14 px-6 min-h-[280px]">
            {loadingPreview ? (
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <Loader2 size={28} className="animate-spin text-amber-500" />
                <span className="text-sm font-medium">Parsing & calculating depreciation…</span>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center mb-4 bg-white">
                  <Upload size={32} className="text-gray-300" />
                </div>
                <p className="text-sm font-bold" style={{ color: NAVY }}>Register year: {selectedYear}</p>
                <p className="text-sm text-gray-500 mb-2 text-center max-w-lg">
                  Upload Excel (.xlsx, .xls, .csv). Columns: {ASSET_TEST_IMPORT_HEADERS.slice(0, 6).join(', ')}…
                </p>
                {parseError && (
                  <div className="mb-4 w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {parseError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:scale-[1.02] transition-transform"
                  style={{ background: AMBER, color: NAVY }}
                >
                  <Upload size={18} /> Select Excel file
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('year')}
                  className="mt-4 text-sm text-gray-500 hover:text-[#000435] inline-flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Change year
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'preview' && (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3 text-sm shrink-0 bg-white">
              <button type="button" onClick={() => setPhase('file')} className="text-xs font-semibold hover:underline inline-flex items-center gap-1" style={{ color: NAVY }}>
                <ChevronLeft size={14} /> Change file
              </button>
              <span className="text-gray-400 truncate max-w-[180px]">{file?.name}</span>
              <span className="font-bold" style={{ color: NAVY }}>{summary.total} rows</span>
              <span className="text-emerald-700 font-medium">{summary.ready} ready</span>
              <span className="text-amber-700 font-medium">{summary.duplicate} duplicates</span>
              <span className="text-red-700 font-medium">{summary.invalid} invalid</span>
              <label className="ml-auto flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="rounded" />
                Skip duplicate SKUs
              </label>
            </div>

            {categoryOpeningSummary.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-emerald-50/50 shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  {categoryOpeningSummary.some((c) => c.assetsInYear > 0)
                    ? `Continues from last register asset (FY ${selectedYear})`
                    : `Year-start opening by category (FY ${selectedYear})`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categoryOpeningSummary.map((c) => (
                    <div key={c.category} className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-[10px] min-w-[160px]">
                      <p className="font-bold truncate" style={{ color: NAVY }}>{c.category}</p>
                      {c.priorAssetName && (
                        <p className="text-emerald-800 mt-0.5 truncate">
                          After: <strong>{c.priorAssetName}</strong>
                          {c.priorAssetCode ? ` (${c.priorAssetCode})` : ''}
                        </p>
                      )}
                      <p className="text-gray-600 mt-0.5">Opening: RWF {formatRwfPlain(c.opening)}</p>
                      <p className="text-red-700/80">Acc. dep: RWF {formatRwfPlain(c.accumulated)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full text-[11px] min-w-[1280px]">
                <thead className="sticky top-0 z-10" style={{ background: NAVY }}>
                  <tr>
                    {['#', 'Status', 'Name', 'Type', 'SKU', 'Location', 'Purchase', 'Opening', 'Acc. Dep.', 'TOTAL BAL.', 'TOTAL DEP.', 'NET BOOK', 'Notes'].map((h) => (
                      <th key={h} className="px-2 py-2.5 text-left font-bold uppercase tracking-wide text-[10px] text-white whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {previewRows.map((row) => (
                    <tr key={row.rowIndex} className="hover:bg-amber-50/30">
                      <td className="px-2 py-2 tabular-nums">{row.rowIndex}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${STATUS_STYLES[row.status]}`}>
                          {row.status === 'ready' && <CheckCircle2 size={10} />}
                          {row.status === 'duplicate' && <Copy size={10} />}
                          {row.status === 'invalid' && <AlertTriangle size={10} />}
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-medium max-w-[120px] truncate">{row.name || '—'}</td>
                      <td className="px-2 py-2">{row.category || '—'}</td>
                      <td className="px-2 py-2 font-mono">{row.sku || '—'}</td>
                      <td className="px-2 py-2 max-w-[90px] truncate">{row.location}</td>
                      <td className="px-2 py-2 font-mono tabular-nums">{row.unit_price != null ? formatRwfPlain(row.unit_price) : '—'}</td>
                      <td className="px-2 py-2 font-mono tabular-nums text-gray-600">{row.opening_amount != null ? formatRwfPlain(row.opening_amount) : '—'}</td>
                      <td className="px-2 py-2 font-mono tabular-nums text-red-600/90">{row.accumulated_depreciation != null ? formatRwfPlain(row.accumulated_depreciation) : '—'}</td>
                      <td className="px-2 py-2 font-mono tabular-nums font-bold">{row.total_balance != null ? formatRwfPlain(row.total_balance) : '—'}</td>
                      <td className="px-2 py-2 font-mono tabular-nums text-red-700">{row.total_dep != null ? formatRwfPlain(row.total_dep) : '—'}</td>
                      <td className="px-2 py-2 font-mono tabular-nums font-bold text-emerald-800">{row.net_book_value != null ? formatRwfPlain(row.net_book_value) : '—'}</td>
                      <td className="px-2 py-2 text-red-700 max-w-[160px] text-[10px]">{row.issues?.length ? row.issues.join('; ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3 shrink-0 bg-white rounded-b-2xl">
              <button type="button" onClick={onClose} disabled={confirming} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Import <strong style={{ color: NAVY }}>{summary.toImport}</strong> into FY {selectedYear}
                </span>
                <button
                  type="button"
                  disabled={loadingPreview || confirming || summary.toImport === 0}
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm import
                </button>
              </div>
            </div>
          </>
        )}

        {phase !== 'preview' && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
