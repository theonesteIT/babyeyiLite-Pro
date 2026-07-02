import { motion } from 'framer-motion'

/** KPI card — HR Center / accountant ochre styling. */
export function UniformKpiCard({
  label,
  value,
  sub,
  icon: Icon,
  alert = false,
  index = 0,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white rounded-2xl border p-4 flex items-start gap-3 hover:border-[#FEBF10]/40 transition-colors min-w-0 ${
        alert ? 'border-red-200 bg-red-50/50' : 'border-black/[0.06] shadow-sm'
      } ${className}`}
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          alert ? 'bg-red-100 text-red-600' : 'text-[#c87800] bg-[#FEBF10]/15'
        }`}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xl text-[#000435] mt-0.5 tabular-nums ${alert ? 'text-red-700' : ''}`} style={{ fontWeight: 500 }}>
          {value}
        </p>
        {sub && (
          <p className={`text-[11px] mt-0.5 ${alert ? 'text-red-600' : 'text-[#c87800]'}`}>{sub}</p>
        )}
      </div>
    </motion.div>
  )
}

export function UniformKpiGrid({ children, cols = 'md:grid-cols-3 2xl:grid-cols-6', className = '' }) {
  return (
    <div className={`grid grid-cols-2 ${cols} gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function UniformSection({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.05]">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm text-[#000435] tracking-tight flex items-center gap-2" style={{ fontWeight: 500 }}>
                {Icon && <Icon size={15} className="text-[#c87800] shrink-0" strokeWidth={1.75} />}
                {title}
              </h3>
            )}
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">{subtitle}</p>}
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
    <div className={`overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function UniformTable({ headers, children, minWidth = '640px', className = '' }) {
  return (
    <UniformTableWrap className={className}>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="bg-[#000435] text-white">
            {headers.map((h) => (
              <th
                key={h.key || h}
                className={`py-3 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
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
      className={`border-b border-gray-100 hover:bg-amber-50/30 even:bg-slate-50/40 transition-colors ${className}`}
    >
      {children}
    </motion.tr>
  )
}

export function UniformTableCell({ children, align = 'left', className = '', mono = false }) {
  const alignCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <td className={`py-2.5 px-3 text-[12px] text-gray-700 tabular-nums ${alignCls} ${mono ? 'font-mono' : ''} ${className}`}>
      {children}
    </td>
  )
}

export function UniformEmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="text-center py-14 sm:py-16 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40">
      {Icon && <Icon size={36} className="mx-auto text-slate-200 mb-3" strokeWidth={1.5} />}
      <p className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>{title}</p>
      {message && <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">{message}</p>}
      {action}
    </div>
  )
}

export function UniformSlotBadge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border uppercase tracking-wide bg-sky-50 text-sky-700 border-sky-200">
      {children}
    </span>
  )
}
