import { useState, useEffect } from 'react'
import { X, Loader2, Boxes } from 'lucide-react'

const NAVY = '#000435'
const AMBER = '#FEBF10'

const ICON_OPTIONS = [
  'Monitor', 'Armchair', 'Car', 'Building2', 'Smartphone', 'FlaskConical', 'Boxes', 'Wrench', 'LandPlot',
]

export default function CategoryFormModal({
  open,
  onClose,
  onSave,
  saving = false,
  initial = null,
  iconOptions = ICON_OPTIONS,
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Monitor')
  const [description, setDescription] = useState('')
  const [depreciationRate, setDepreciationRate] = useState('5')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initial?.name || '')
    setIcon(initial?.icon || 'Monitor')
    setDescription(initial?.description || '')
    const rate = initial?.depreciation_rate ?? initial?.depreciationRate
    setDepreciationRate(rate != null && rate !== '' ? String(rate) : '5')
    setError('')
  }, [open, initial])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Category name is required')
      return
    }
    const rate = Number(depreciationRate)
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Depreciation rate must be between 0 and 100')
      return
    }
    onSave?.({
      name: name.trim(),
      icon,
      description: description.trim(),
      depreciation_rate: rate,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-black/10 overflow-hidden"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: AMBER }}>
              <Boxes size={20} style={{ color: NAVY }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{initial?.id ? 'Edit Category' : 'Add Category'}</h2>
              <p className="text-xs text-white/60">Available in asset register wizard</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-2 rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#000435]/70 mb-1.5">Category name *</label>
            <input
              type="text"
              className="assets-wizard-input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT Equipment"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#000435]/70 mb-1.5">Icon</label>
            <select className="assets-wizard-input w-full" value={icon} onChange={(e) => setIcon(e.target.value)} disabled={saving}>
              {iconOptions.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#000435]/70 mb-1.5">
              Depreciation rate (%) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="assets-wizard-input w-full pr-8"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
                placeholder="e.g. 5"
                disabled={saving}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-re-text-muted">%</span>
            </div>
            <p className="text-[11px] text-re-text-muted mt-1">Applied automatically when this category is selected in the asset wizard.</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#000435]/70 mb-1.5">Description</label>
            <textarea
              className="assets-wizard-input w-full resize-none h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of assets in this category"
              disabled={saving}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl border border-black/10 text-sm font-medium">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: AMBER, color: NAVY }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {initial?.id ? 'Save changes' : 'Add category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export { ICON_OPTIONS }
