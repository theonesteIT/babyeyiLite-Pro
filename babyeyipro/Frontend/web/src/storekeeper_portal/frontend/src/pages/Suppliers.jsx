import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Phone, Mail, MapPin, Truck, X, Building2, User, Hash, Globe,
  BadgeCheck, Loader2, Edit2, Trash2, RefreshCw, AlertCircle,Package ,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import {
  EMPTY_SUPPLIER_FORM,
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../services/suppliersService'

function FormField({ icon: Icon, label, placeholder, type = 'text', value, onChange, name }) {
  return (
    <div className="group">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-300 group-focus-within:text-amber-500 transition-colors">
          {Icon && <Icon size={15} />}
        </div>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] placeholder:text-gray-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
        />
      </div>
    </div>
  )
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_SUPPLIER_FORM)

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await fetchSuppliers()
      setSuppliers(rows)
    } catch (e) {
      setError(e.message || 'Could not load suppliers')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.tin.toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_SUPPLIER_FORM)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setEditing(s)
    setForm({
      name: s.name,
      contact: s.contact,
      phone: s.phone,
      email: s.email,
      tin: s.tin,
      website: s.website,
      address: s.address,
      status: s.status,
      note: s.note,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_SUPPLIER_FORM)
  }

  const onFieldChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editing?.id) await updateSupplier(editing.id, form)
      else await createSupplier(form)
      setShowModal(false)
      setEditing(null)
      setForm(EMPTY_SUPPLIER_FORM)
      await loadSuppliers()
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return
    setSaving(true)
    setError('')
    try {
      await deleteSupplier(deleteTarget.id)
      setDeleteTarget(null)
      await loadSuppliers()
    } catch (e) {
      setError(e.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <StorekeeperPageShell
      titleLine="Suppliers"
      subtitle="Manage your suppliers and vendors"
      icon={Truck}
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadSuppliers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/15 transition-all disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-400/25 transition-all active:scale-95"
          >
            <Plus size={14} /> Add Supplier
          </button>
        </div>
      }
    >
      <div className="store-panel-sheet p-4 sm:p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 w-full max-w-sm shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
            <Search size={15} className="text-gray-300" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-[#000435] placeholder:text-gray-300 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm font-medium">Loading suppliers…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">No suppliers found</p>
            <button type="button" onClick={openCreate} className="mt-3 text-xs font-bold text-amber-600 hover:underline">
              + Add your first supplier
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-amber-200/50 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                      <Building2 size={18} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-[#000435] text-sm truncate">{s.name}</h3>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                        <User size={11} /> {s.contact || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {s.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition"
                      aria-label="Edit supplier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(s)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                      aria-label="Delete supplier"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400 min-w-0">
                    <Phone size={13} className="shrink-0" />
                    <span className="text-[#000435] font-medium text-xs truncate">{s.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 min-w-0">
                    <Mail size={13} className="shrink-0" />
                    <span className="text-[#000435] font-medium text-xs truncate">{s.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 min-w-0">
                    <MapPin size={13} className="shrink-0" />
                    <span className="text-[#000435] font-medium text-xs truncate">{s.address || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 min-w-0">
                    <Hash size={13} className="shrink-0" />
                    <span className="text-[#000435] font-medium text-xs truncate">TIN: {s.tin || '—'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
              className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto pointer-events-none"
            >
              <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 pointer-events-auto overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                      <Truck size={18} className="text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#000435]">
                        {editing ? 'Edit Supplier' : 'Add Supplier'}
                      </h2>
                      <p className="text-[11px] font-medium text-gray-400">Saved to your school database</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField icon={Building2} label="Supplier Name *" name="name" placeholder="e.g. Fabric World Ltd" value={form.name} onChange={onFieldChange} />
                    <FormField icon={User} label="Contact Person" name="contact" placeholder="e.g. John Kamau" value={form.contact} onChange={onFieldChange} />
                    <FormField icon={Phone} label="Phone Number" name="phone" placeholder="+255 XXX XXX XXX" value={form.phone} onChange={onFieldChange} />
                    <FormField icon={Mail} label="Email Address" type="email" name="email" placeholder="email@example.com" value={form.email} onChange={onFieldChange} />
                    <FormField icon={Hash} label="TIN Number" name="tin" placeholder="123-456-789" value={form.tin} onChange={onFieldChange} />
                    <FormField icon={Globe} label="Website (optional)" name="website" placeholder="https://" value={form.website} onChange={onFieldChange} />
                  </div>

                  <div className="group">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Address</label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none text-gray-300 group-focus-within:text-amber-500 transition-colors">
                        <MapPin size={15} />
                      </div>
                      <input
                        name="address"
                        value={form.address}
                        onChange={onFieldChange}
                        placeholder="Street, City, Region"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] placeholder:text-gray-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={onFieldChange}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/50 rounded-2xl border border-amber-200/50">
                    <BadgeCheck size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] font-medium text-amber-700">
                      Records are stored per school and can be edited or removed anytime.
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="px-5 py-2.5 text-[11px] font-bold text-gray-500 hover:bg-white rounded-xl transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-white bg-[#000435] hover:bg-[#0a116b] rounded-xl transition-all uppercase tracking-wider disabled:opacity-50 shadow-lg shadow-[#000435]/20"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} className="opacity-70" />}
                    {editing ? 'Update Supplier' : 'Save Supplier'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-[60]"
              onClick={() => !saving && setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <h3 className="font-bold text-[#000435] mb-2">Remove &quot;{deleteTarget.name}&quot;?</h3>
                <p className="text-sm text-gray-500 mb-6">This supplier will be removed from your school records.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </StorekeeperPageShell>
  )
}
