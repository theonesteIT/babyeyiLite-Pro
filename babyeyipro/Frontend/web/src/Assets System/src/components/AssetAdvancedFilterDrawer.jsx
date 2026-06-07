import { useState } from 'react'
import { SlidersHorizontal, Bookmark, Trash2, Save, RotateCcw } from 'lucide-react'
import AssetSlideDrawer from './AssetSlideDrawer'
import { ASSET_TYPES, ASSET_STATUS_OPTIONS, ASSET_CONDITION_OPTIONS } from '../../../assets_portal/utils/assetsConstants'
import { EMPTY_FILTERS, countActiveFilters } from '../../../assets_portal/utils/assetFilters'

export default function AssetAdvancedFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  filterOptions = {},
  savedFilters = [],
  onSaveFilter,
  onApplySaved,
  onDeleteSaved,
}) {
  const [saveName, setSaveName] = useState('')
  const active = countActiveFilters(filters)

  const set = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <AssetSlideDrawer open={open} onClose={onClose} side="left" widthClass="max-w-[min(100vw,400px)]">
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-black/10 bg-[#FEBF10]/20">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-[#000435]" />
          <div>
            <h2 className="text-base font-bold text-[#000435]">Advanced filters</h2>
            <p className="text-xs text-re-text-muted">{active ? `${active} active` : 'No filters applied'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Category</label>
          <select className="assets-wizard-input" value={filters.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">All categories</option>
            {(filterOptions.categories || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Asset type</label>
          <select className="assets-wizard-input" value={filters.assetType} onChange={(e) => set('assetType', e.target.value)}>
            <option value="">All types</option>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Location</label>
          <select className="assets-wizard-input" value={filters.location} onChange={(e) => set('location', e.target.value)}>
            <option value="">All locations</option>
            {(filterOptions.locations || []).map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Asset status</label>
            <select className="assets-wizard-input" value={filters.status} onChange={(e) => set('status', e.target.value)}>
              {ASSET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Condition</label>
            <select className="assets-wizard-input" value={filters.condition} onChange={(e) => set('condition', e.target.value)}>
              {ASSET_CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Purchase year</label>
          <select className="assets-wizard-input" value={filters.purchaseYear} onChange={(e) => set('purchaseYear', e.target.value)}>
            <option value="">Any year</option>
            {(filterOptions.years || []).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70">Value range (RWF)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="assets-wizard-input"
              placeholder="Min"
              value={filters.valueMin}
              onChange={(e) => set('valueMin', e.target.value)}
            />
            <input
              type="number"
              className="assets-wizard-input"
              placeholder="Max"
              value={filters.valueMax}
              onChange={(e) => set('valueMax', e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#000435]/15 bg-[#000435]/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#000435]">
            <Bookmark size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Saved filters</h3>
          </div>
          {savedFilters.length === 0 ? (
            <p className="text-xs text-re-text-muted">Save your current filter set for quick access.</p>
          ) : (
            <ul className="space-y-2">
              {savedFilters.map((sf) => (
                <li key={sf.id} className="flex items-center gap-2 rounded-lg bg-white border border-black/10 p-2">
                  <button
                    type="button"
                    className="flex-1 text-left text-sm font-medium text-[#000435] truncate"
                    onClick={() => onApplySaved?.(sf)}
                  >
                    {sf.name}
                  </button>
                  <button type="button" onClick={() => onDeleteSaved?.(sf.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              className="assets-wizard-input flex-1"
              placeholder="Filter preset name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!saveName.trim()) return
                onSaveFilter?.(saveName.trim())
                setSaveName('')
              }}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#000435] text-[#FEBF10] text-xs font-bold"
            >
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-4 border-t border-black/10 flex gap-2 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium"
        >
          <RotateCcw size={15} /> Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-[#FEBF10] text-[#000435] text-sm font-bold"
        >
          Apply filters
        </button>
      </div>
    </AssetSlideDrawer>
  )
}
