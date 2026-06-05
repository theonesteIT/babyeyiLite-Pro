import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Upload, Download, Loader2 } from 'lucide-react'
import AssetRegisterTable from '../components/AssetRegisterTable'
import AssetImportModal from '../components/AssetImportModal'
import AssetSlideDrawer from '../components/AssetSlideDrawer'
import AssetPreviewPanel from '../components/AssetPreviewPanel'
import AssetAdvancedFilterDrawer from '../components/AssetAdvancedFilterDrawer'
import AssetSearchToolbar from '../components/AssetSearchToolbar'
import assetsApi from '../../../assets_portal/services/assetsApi'
import AddAssetWizard from '../components/AddAssetWizard'
import {
  exportAssetsToExcel,
  downloadAssetImportTemplate,
} from '../../../assets_portal/utils/assetExcelRegister'
import {
  EMPTY_FILTERS,
  filtersToQueryParams,
  loadSavedFilters,
  persistSavedFilters,
  extractFilterOptions,
} from '../../../assets_portal/utils/assetFilters'
import { currentRegisterYear } from '../../../assets_portal/utils/assetFormMapper'

export default function AssetInventory() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
  const [filterOpen, setFilterOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState(() => loadSavedFilters())
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState('create')
  const [editAssetId, setEditAssetId] = useState(null)
  const [previewId, setPreviewId] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importConfirming, setImportConfirming] = useState(false)
  const [categoryNames, setCategoryNames] = useState([])

  const filterOptions = useMemo(() => ({
    ...extractFilterOptions(assets),
    categories: categoryNames.length
      ? categoryNames
      : extractFilterOptions(assets).categories,
  }), [assets, categoryNames])

  useEffect(() => {
    assetsApi.listCategories()
      .then((data) => setCategoryNames((Array.isArray(data) ? data : []).map((c) => c.name)))
      .catch(() => {})
  }, [])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await assetsApi.listAssets(filtersToQueryParams(filters))
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load assets')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(loadAssets, 300)
    return () => clearTimeout(t)
  }, [loadAssets])

  const openAddWizard = () => {
    setWizardMode('create')
    setEditAssetId(null)
    setWizardOpen(true)
  }

  const openEditWizard = (id) => {
    setPreviewId(null)
    setWizardMode('edit')
    setEditAssetId(id)
    setWizardOpen(true)
  }

  const handleWizardClose = () => {
    setWizardOpen(false)
    setEditAssetId(null)
    setWizardMode('create')
  }

  const handleSaveFilter = (name) => {
    const entry = { id: `sf-${Date.now()}`, name, filters: { ...filters } }
    const next = [entry, ...savedFilters.filter((s) => s.name !== name)].slice(0, 12)
    setSavedFilters(next)
    persistSavedFilters(next)
  }

  const handleApplySaved = (sf) => {
    setFilters({ ...EMPTY_FILTERS, ...sf.filters })
    setFilterOpen(false)
  }

  const handleDeleteSaved = (id) => {
    const next = savedFilters.filter((s) => s.id !== id)
    setSavedFilters(next)
    persistSavedFilters(next)
  }

  const handleExportExcel = () => {
    if (!assets.length) {
      setImportMsg('No assets to export.')
      return
    }
    const yr = filters.registerYear || 'all'
    exportAssetsToExcel(assets, `school-asset-register-${yr}`)
    setImportMsg(`Exported ${assets.length} assets to Excel.`)
  }

  const handleConfirmImport = async ({ rows, skipDuplicates, registerYear }) => {
    if (!rows.length) return
    setImportConfirming(true)
    try {
      const result = await assetsApi.importAssets(rows, {
        skipDuplicates,
        registerYear: registerYear || currentRegisterYear(),
      })
      setImportMsg(`Imported ${result?.created ?? 0} assets into ${registerYear} register.`)
      setImportOpen(false)
      await loadAssets()
    } catch (err) {
      setError(err?.message || 'Import failed')
    } finally {
      setImportConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      <AssetImportModal
        open={importOpen}
        onClose={() => !importConfirming && setImportOpen(false)}
        confirming={importConfirming}
        onConfirm={handleConfirmImport}
      />

      <AssetAdvancedFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        filterOptions={filterOptions}
        savedFilters={savedFilters}
        onSaveFilter={handleSaveFilter}
        onApplySaved={handleApplySaved}
        onDeleteSaved={handleDeleteSaved}
      />

      <AssetSlideDrawer open={!!previewId} onClose={() => setPreviewId(null)}>
        {previewId && (
          <AssetPreviewPanel
            assetId={previewId}
            onClose={() => setPreviewId(null)}
            onEdit={() => openEditWizard(previewId)}
          />
        )}
      </AssetSlideDrawer>

      <AddAssetWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        onSuccess={() => {
          handleWizardClose()
          loadAssets()
        }}
        mode={wizardMode}
        assetId={editAssetId}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-re-text tracking-tight">Asset Inventory</h2>
          <p className="text-re-text-muted text-sm mt-1 font-medium">
            Search by code, serial, or name · filter by register year below
          </p>
        </div>
        <button
          type="button"
          onClick={openAddWizard}
          className="inline-flex items-center gap-2 rounded-xl bg-[#FEBF10] px-4 py-2.5 text-sm font-bold text-[#0B1530] shadow-sm hover:bg-[#FFD24D]"
        >
          <Plus size={18} /> Add New Asset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setImportMsg(''); setError(''); setImportOpen(true) }}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-re-bg flex items-center gap-1.5"
        >
          <Upload size={15} /> Import Excel
        </button>
        <button type="button" onClick={handleExportExcel} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium hover:bg-re-bg flex items-center gap-1.5">
          <Download size={15} /> Export Excel
        </button>
        <button type="button" onClick={() => downloadAssetImportTemplate()} className="rounded-xl border border-[#000435]/15 bg-[#000435]/5 px-3 py-2 text-sm font-medium text-[#000435]">
          Template
        </button>
      </div>

      {importMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{importMsg}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <AssetSearchToolbar
        filters={filters}
        onChange={setFilters}
        onOpenAdvanced={() => setFilterOpen(true)}
        resultCount={assets.length}
        filterOptions={filterOptions}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 rounded-2xl border border-black/5 bg-white">
          <Loader2 size={22} className="animate-spin text-[#FEBF10]" />
          <span className="text-sm font-medium">Loading register…</span>
        </div>
      ) : (
        <AssetRegisterTable
          assets={assets}
          selectedId={previewId}
          onSelectAsset={(row) => setPreviewId(row.id)}
        />
      )}
    </div>
  )
}
