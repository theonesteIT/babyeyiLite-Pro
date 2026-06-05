import { PRESET_SIZES } from '../../services/finishedGoodsService'

export default function SizeMultiSelect({
  selected = [],
  otherValue,
  onToggle,
  onOtherChange,
  single = false,
  disabled,
}) {
  const hasOther = selected.includes('Other')

  const toggle = (size) => {
    if (disabled) return
    if (single) {
      onToggle([size])
      return
    }
    if (selected.includes(size)) {
      onToggle(selected.filter((s) => s !== size))
    } else {
      onToggle([...selected, size])
    }
  }

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">
        {single ? 'Size' : 'Sizes *'}
      </label>
      <p className="text-[10px] text-gray-400 mb-2">
        {single ? 'Select one size for this entry.' : 'Select all sizes to register (one stock row per size).'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_SIZES.map((s) => {
          const active = selected.includes(s)
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => toggle(s)}
              className={`min-w-[2.25rem] px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                active
                  ? 'bg-[#000435] text-white border-[#000435]'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300'
              } disabled:opacity-50`}
            >
              {s}
            </button>
          )
        })}
        <button
          type="button"
          disabled={disabled}
          onClick={() => toggle('Other')}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
            hasOther
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300'
          } disabled:opacity-50`}
        >
          Other
        </button>
      </div>
      {hasOther && (
        <input
          type="text"
          name="size_other"
          value={otherValue}
          onChange={onOtherChange}
          disabled={disabled}
          placeholder="Specify size…"
          className="mt-2 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
        />
      )}
      {!single && selected.length > 0 && (
        <p className="text-[10px] font-medium text-amber-700 mt-2">
          {selected.filter((s) => s !== 'Other').length + (hasOther && otherValue ? 1 : 0)} size(s) selected
          {selected.includes('Other') && !otherValue ? ' — enter custom size' : ''}
        </p>
      )}
    </div>
  )
}
