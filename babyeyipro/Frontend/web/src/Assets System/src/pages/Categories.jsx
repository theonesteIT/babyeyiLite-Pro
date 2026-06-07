import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Monitor, Armchair, Car, Building2, Smartphone, FlaskConical,
  Edit3, Trash2, Loader2, Boxes, Wrench, LandPlot,
} from 'lucide-react'
import assetsApi from '../../../assets_portal/services/assetsApi'
import CategoryFormModal from '../components/CategoryFormModal'

const NAVY = '#000435'
const AMBER = '#FEBF10'

const iconMap = {
  Monitor, Armchair, Car, Building2, Smartphone, FlaskConical, Boxes, Wrench, LandPlot,
}

export default function Categories() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await assetsApi.listCategories()
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Failed to load categories')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (cat) => {
    setEditing(cat)
    setModalOpen(true)
  }

  const handleSave = async (payload) => {
    setSaving(true)
    setError('')
    try {
      if (editing?.id) {
        await assetsApi.updateCategory(editing.id, payload)
      } else {
        await assetsApi.createCategory(payload)
      }
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    setError('')
    try {
      await assetsApi.deleteCategory(cat.id)
      await load()
    } catch (err) {
      setError(err?.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <CategoryFormModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: NAVY }}>Categories</h2>
          <p className="text-re-text-muted text-sm mt-1">Manage categories used when registering and editing assets</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm hover:opacity-90"
          style={{ backgroundColor: AMBER, color: NAVY }}
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 rounded-2xl border border-black/5 bg-white">
          <Loader2 size={22} className="animate-spin" style={{ color: AMBER }} />
          <span className="text-sm font-medium">Loading categories…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((cat) => {
            const Icon = iconMap[cat.icon] || Monitor
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm group hover:border-[#FEBF10]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${AMBER}33` }}
                    >
                      <Icon size={24} style={{ color: '#c87800' }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate" style={{ color: NAVY }}>{cat.name}</h3>
                      <p className="text-sm text-re-text-muted">
                        {cat.asset_count ?? cat.count ?? 0} assets
                        {cat.depreciation_rate != null && (
                          <span className="ml-2 text-[#000435]/70 font-semibold">· {cat.depreciation_rate}% dep.</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-[#FEBF10]/20"
                      style={{ color: '#c87800' }}
                      aria-label="Edit"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-sm text-re-text-muted mt-3 line-clamp-2">{cat.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !items.length && (
        <p className="text-center text-sm text-re-text-muted py-8">No categories yet. Add your first category.</p>
      )}
    </div>
  )
}
