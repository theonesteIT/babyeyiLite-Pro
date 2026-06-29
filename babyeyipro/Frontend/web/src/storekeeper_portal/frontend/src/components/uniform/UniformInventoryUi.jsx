import { motion } from 'framer-motion'

const KPI_ACCENTS = {
  default: {
    shell: 'border-gray-100 bg-gradient-to-br from-gray-50/90 to-white',
    icon: 'bg-[#000435]/5 text-[#000435]',
    value: 'text-[#000435]',
  },
  amber: {
    shell: 'border-amber-100 bg-gradient-to-br from-amber-50/90 to-white',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
  },
  blue: {
    shell: 'border-blue-100 bg-gradient-to-br from-blue-50/80 to-white',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-[#000435]',
  },
  green: {
    shell: 'border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
  },
  purple: {
    shell: 'border-violet-100 bg-gradient-to-br from-violet-50/80 to-white',
    icon: 'bg-violet-100 text-violet-600',
    value: 'text-[#000435]',
  },
  emerald: {
    shell: 'border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
  },
  red: {
    shell: 'border-red-100 bg-gradient-to-br from-red-50/80 to-white',
    icon: 'bg-red-100 text-red-500',
    value: 'text-red-600',
  },
}

export function UniformKpiCard({ label, value, sub, icon: Icon, accent = 'default', index = 0, className = '' }) {
  const scheme = KPI_ACCENTS[accent] || KPI_ACCENTS.default
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border p-4 sm:p-5 hover:shadow-md transition-all duration-300 ${scheme.shell} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-xl sm:text-2xl font-bold mt-1.5 truncate ${scheme.value}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${scheme.icon}`}>
            <Icon size={17} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function UniformKpiGrid({ children, cols = 'sm:grid-cols-2 lg:grid-cols-3', className = '' }) {
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function UniformSection({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-amber-50/20">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
                {Icon && <Icon size={15} className="text-amber-500 shrink-0" />}
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName || 'p-4 sm:p-5'}>{children}</div>
    </div>
  )
}

export function UniformTableWrap({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function UniformTable({ headers, children, minWidth = '640px', className = '' }) {
  return (
    <UniformTableWrap className={className}>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="bg-gradient-to-r from-gray-50 to-amber-50/30 border-b border-gray-100">
            {headers.map((h) => (
              <th
                key={h.key || h}
                className={`py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                  h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : 'text-left'
                } ${h.className || ''}`}
              >
                {h.label || h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </UniformTableWrap>
  )
}

export function UniformTableRow({ children, index = 0, className = '' }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${index % 2 === 1 ? 'bg-gray-50/25' : ''} ${className}`}
    >
      {children}
    </motion.tr>
  )
}

export function UniformTableCell({ children, align = 'left', className = '', mono = false }) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <td className={`py-3 px-4 text-xs ${alignCls} ${mono ? 'font-mono' : ''} ${className}`}>
      {children}
    </td>
  )
}

export function UniformEmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-14 sm:py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/40">
      {Icon && <Icon size={36} className="mx-auto text-gray-200 mb-3" strokeWidth={1.5} />}
      <p className="text-sm font-bold text-[#000435]">{title}</p>
      {message && <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">{message}</p>}
      {action}
    </div>
  )
}

export function UniformSlotBadge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[10px] font-bold ring-1 ring-blue-100">
      {children}
    </span>
  )
}
