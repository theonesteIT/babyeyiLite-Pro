import { formatDateDisplay } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'

export default function AssetDateInput({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  optional = false,
  className = '',
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-xs font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        {optional && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Optional</span>
        )}
      </div>
      <div className="assets-date-field">
        <input
          type="date"
          className="assets-wizard-input assets-date-input text-sm w-full"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange?.(e.target.value)}
        />
      </div>
      {value && (
        <p className="text-[10px] text-gray-400 mt-1 font-medium">
          Selected: <span style={{ color: NAVY }}>{formatDateDisplay(value)}</span>
          <span className="text-gray-300 mx-1">·</span>
          DD/MM/YYYY
        </p>
      )}
      {!value && (
        <p className="text-[10px] text-gray-400 mt-1 font-medium">Use the calendar or type DD/MM/YYYY</p>
      )}
    </div>
  )
}
