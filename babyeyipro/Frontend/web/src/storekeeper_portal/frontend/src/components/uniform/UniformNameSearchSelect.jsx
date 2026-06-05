import { useMemo, useState } from 'react'
import { Search, Shirt, ChevronDown } from 'lucide-react'
import { UNIFORM_TYPE_GROUPS } from '../../services/finishedGoodsService'

export default function UniformNameSearchSelect({
  value,
  otherValue,
  onChange,
  onOtherChange,
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return UNIFORM_TYPE_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => !q || item.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0 || (!q && g.label))
  }, [query])

  const showOtherGroup = !query.trim() || 'other'.includes(query.trim().toLowerCase())

  const displayLabel = value === 'Other' ? (otherValue || 'Other (specify)') : value || 'Select uniform'

  const pick = (name) => {
    onChange({ target: { name: 'uniform_name', value: name } })
    if (name !== 'Other') onOtherChange({ target: { name: 'uniform_name_other', value: '' } })
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
        Uniform name *
      </label>
      <div className="relative">
        <Shirt size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none z-10" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] text-left focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none disabled:opacity-60"
      >
        <span className={`truncate ${!value ? 'text-gray-400' : ''}`}>{displayLabel}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      </div>

      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[65]" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute z-[70] mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20">
                <Search size={14} className="text-gray-300 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search uniform…"
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[#000435] placeholder:text-gray-300"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto overscroll-contain p-1">
              {filteredGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1.5 sticky top-0 bg-white">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => pick(item)}
                      className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        value === item ? 'bg-amber-50 text-amber-800' : 'text-[#000435] hover:bg-gray-50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ))}
              {showOtherGroup && (
                <button
                  type="button"
                  onClick={() => pick('Other')}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg mt-1 ${
                    value === 'Other' ? 'bg-amber-50 text-amber-800' : 'text-[#000435] hover:bg-gray-50'
                  }`}
                >
                  Other (specify below)
                </button>
              )}
              {filteredGroups.every((g) => !g.items.length) && !showOtherGroup && (
                <p className="text-xs text-gray-400 text-center py-4">No matches</p>
              )}
            </div>
          </div>
        </>
      )}

      {value === 'Other' && (
        <input
          type="text"
          name="uniform_name_other"
          value={otherValue}
          onChange={onOtherChange}
          disabled={disabled}
          placeholder="Specify uniform name…"
          className="mt-2 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
        />
      )}
    </div>
  )
}
