import { useMemo, useRef, useState, useEffect } from 'react'
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Copy, ChevronLeft } from 'lucide-react'
import { QRCode } from 'react-qr-code'
import assetsApi from '../../../assets_portal/services/assetsApi'
import { parseAssetsExcelFile, buildImportPreview } from '../../../assets_portal/utils/assetExcelRegister'
import { currentRegisterYear } from '../../../assets_portal/utils/assetFormMapper'
import RegisterYearPickStep from './RegisterYearPickStep'

const STATUS_STYLES = {
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  duplicate: 'bg-amber-100 text-amber-900 border-amber-200',
  invalid: 'bg-red-100 text-red-800 border-red-200',
}

export default function AssetImportModal({
  open,
  onClose,
  onConfirm,
  confirming = false,
}) {
  const fileInputRef = useRef(null)
  const [phase, setPhase] = useState('year')
  const [registerYear, setRegisterYear] = useState(String(currentRegisterYear()))
  const [file, setFile] = useState(null)
  const [previewRows, setPreviewRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)

  useEffect(() => {
    if (!open) return
    setPhase('year')
    setRegisterYear(String(currentRegisterYear()))
    setFile(null)
    setPreviewRows([])
    setParseError('')
    setLoading(false)
  }, [open])

  const summary = useMemo(() => {
    const ready = previewRows.filter((r) => r.status === 'ready').length
    const duplicate = previewRows.filter((r) => r.status === 'duplicate').length
    const invalid = previewRows.filter((r) => r.status === 'invalid').length
    return { ready, duplicate, invalid, toImport: ready, total: previewRows.length }
  }, [previewRows])

  const parseFile = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setLoading(true)
    setParseError('')
    setPreviewRows([])
    try {
      const [parsed, identifiers] = await Promise.all([
        parseAssetsExcelFile(selectedFile),
        assetsApi.getIdentifiers({ register_year: registerYear }).catch(() => ({
          asset_codes: [],
          label_tags: [],
          serial_numbers: [],
        })),
      ])
      setPreviewRows(buildImportPreview(parsed.payloads, identifiers))
      setPhase('preview')
    } catch (err) {
      setParseError(err?.message || 'Failed to read Excel file')
      setPhase('file')
    } finally {
      setLoading(false)
    }
  }

  const handleYearContinue = () => {
    setPhase('file')
    setTimeout(() => fileInputRef.current?.click(), 50)
  }

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (selected) parseFile(selected)
  }

  const handleBackToYear = () => {
    setPhase('year')
    setFile(null)
    setPreviewRows([])
    setParseError('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-black/10">
        <div className="flex items-center justify-between px-5 py-4 bg-[#000435] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FEBF10] flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-[#000435]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Import Assets from Excel</h2>
              <p className="text-xs text-white/70">
                {phase === 'year' && 'Step 1 · Choose register year'}
                {phase === 'file' && 'Step 2 · Select Excel file'}
                {phase === 'preview' && `Step 3 · Review · ${registerYear} register`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={confirming} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {phase === 'year' && (
          <RegisterYearPickStep
            value={registerYear}
            onChange={setRegisterYear}
            onContinue={handleYearContinue}
            continueLabel="Continue to select file"
            title="Which register year are you importing into?"
            subtitle="Pick the calendar year for this batch. Duplicate codes, tags, and serials are only checked within the same register year."
          />
        )}

        {phase === 'file' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 min-h-[280px]">
            {loading ? (
              <div className="flex items-center gap-2 text-re-text-muted">
                <Loader2 size={22} className="animate-spin text-[#FEBF10]" />
                <span className="text-sm font-medium">Parsing {file?.name || 'file'}…</span>
              </div>
            ) : (
              <>
                <Upload size={40} className="text-[#000435]/30 mb-4" />
                <p className="text-sm font-semibold text-[#000435] mb-1">Register year: {registerYear}</p>
                <p className="text-sm text-re-text-muted mb-6 text-center max-w-md">
                  Choose an Excel file (.xlsx, .xls, .csv) to import into the {registerYear} register.
                </p>
                {parseError && (
                  <div className="mb-4 w-full max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {parseError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FEBF10] text-[#000435] text-sm font-bold hover:bg-[#FFD24D]"
                >
                  <Upload size={18} /> Select Excel file
                </button>
                <button
                  type="button"
                  onClick={handleBackToYear}
                  className="mt-4 text-sm text-re-text-muted hover:text-[#000435] inline-flex items-center gap-1"
                >
                  <ChevronLeft size={16} /> Change register year
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'preview' && (
          <>
            <div className="px-5 py-3 border-b border-black/5 flex flex-wrap items-center gap-3 text-sm shrink-0">
              {loading ? (
                <span className="flex items-center gap-2 text-re-text-muted">
                  <Loader2 size={16} className="animate-spin" /> Parsing file…
                </span>
              ) : (
                <>
                  <button type="button" onClick={handleBackToYear} className="text-xs font-semibold text-[#000435] hover:underline inline-flex items-center gap-1">
                    <ChevronLeft size={14} /> {registerYear} register
                  </button>
                  <span className="text-re-text-muted truncate max-w-[200px]">{file?.name}</span>
                  <span className="font-semibold text-[#000435]">{summary.total} rows</span>
                  <span className="text-emerald-700 font-medium">{summary.ready} ready</span>
                  <span className="text-amber-700 font-medium">{summary.duplicate} duplicates</span>
                  <span className="text-red-700 font-medium">{summary.invalid} invalid</span>
                  <label className="ml-auto flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-re-text-muted">Skip duplicates in {registerYear}</span>
                  </label>
                </>
              )}
            </div>

            <p className="px-5 py-2 text-xs text-re-text-muted border-b border-black/5 shrink-0">
              Duplicates are checked against the <strong>{registerYear}</strong> register only.
              The same code/tag/serial may exist in a different register year.
            </p>

            <div className="flex-1 overflow-auto min-h-0">
              {previewRows.length > 0 && (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#FEBF10] text-[#000435] z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-bold">#</th>
                      <th className="px-2 py-2 text-left font-bold">Status</th>
                      <th className="px-2 py-2 text-left font-bold">Name</th>
                      <th className="px-2 py-2 text-left font-bold">Code</th>
                      <th className="px-2 py-2 text-left font-bold">Tag</th>
                      <th className="px-2 py-2 text-left font-bold">Serial</th>
                      <th className="px-2 py-2 text-left font-bold">Type</th>
                      <th className="px-2 py-2 text-left font-bold">Location</th>
                      <th className="px-2 py-2 text-center font-bold">QR</th>
                      <th className="px-2 py-2 text-left font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.rowIndex} className="border-b border-gray-100 hover:bg-amber-50/30">
                        <td className="px-2 py-2 tabular-nums">{row.rowIndex}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${STATUS_STYLES[row.status] || ''}`}>
                            {row.status === 'ready' && <CheckCircle2 size={10} />}
                            {row.status === 'duplicate' && <Copy size={10} />}
                            {row.status === 'invalid' && <AlertTriangle size={10} />}
                            {row.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-medium max-w-[120px] truncate">{row.name || '—'}</td>
                        <td className="px-2 py-2 font-mono">{row.asset_code || <span className="text-gray-400">auto</span>}</td>
                        <td className="px-2 py-2">{row.label_tag || '—'}</td>
                        <td className="px-2 py-2 font-mono">{row.serial_number || '—'}</td>
                        <td className="px-2 py-2">{row.type || '—'}</td>
                        <td className="px-2 py-2 max-w-[100px] truncate">{row.location || '—'}</td>
                        <td className="px-2 py-2">
                          <div className="flex justify-center bg-white p-1 rounded border border-gray-200">
                            <QRCode value={row.qr_value || 'CODE:|TAG:|SN:'} size={40} level="M" />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-red-700 max-w-[180px]">
                          {row.issues?.length ? row.issues.join('; ') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-5 py-4 border-t border-black/10 flex flex-wrap justify-between items-center gap-3 shrink-0 bg-gray-50">
              <button type="button" onClick={onClose} disabled={confirming} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-white">
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-re-text-muted">
                  Will import <strong className="text-[#000435]">{summary.toImport}</strong> into {registerYear}
                </span>
                <button
                  type="button"
                  disabled={loading || confirming || summary.toImport === 0}
                  onClick={() => {
                    const importable = previewRows
                      .filter((r) => r.status === 'ready')
                      .map((r) => r.payload)
                    onConfirm?.({ rows: importable, skipDuplicates, registerYear: Number(registerYear) })
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FEBF10] text-[#000435] text-sm font-bold hover:bg-[#FFD24D] disabled:opacity-50"
                >
                  {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm import
                </button>
              </div>
            </div>
          </>
        )}

        {phase !== 'preview' && (
          <div className="px-5 py-4 border-t border-black/10 shrink-0 bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-white">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
