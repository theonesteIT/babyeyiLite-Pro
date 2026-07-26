import { formatCellValue } from '../../utils/reportBuilders'

function ResultBadge({ row, label }) {
  const tone = row.tone || (Number(row.profit_loss ?? row.total_profit) > 0
    ? 'profit'
    : Number(row.profit_loss ?? row.total_profit) < 0 ? 'loss' : 'neutral')
  const classes = tone === 'profit'
    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
    : tone === 'loss'
      ? 'bg-red-100 text-red-800 ring-red-200'
      : 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${classes}`}>
      {row.resultEmoji ? `${row.resultEmoji} ` : ''}{label}
    </span>
  )
}

export default function ReportDataTable({
  columns,
  rows,
  emptyMessage,
  placeholderMessage,
  variant = 'default',
}) {
  if (!columns.length) return null
  const message = placeholderMessage || emptyMessage || 'No records found for the selected filters.'
  const modern = variant === 'profitLoss' || variant === 'modern'

  return (
    <div className={`overflow-x-auto ${modern ? 'rounded-2xl border border-slate-200/80 shadow-sm' : 'rounded-xl border border-gray-200'} bg-white`}>
      <table className={`w-full text-sm ${modern ? 'min-w-[1100px]' : 'min-w-[760px]'}`}>
        <thead>
          <tr className="bg-[#000435] text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.key === 'result' && modern ? 'text-[#FEBF10]' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 px-4 text-center text-gray-400 text-sm">
                {message}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const isSubtotal = row._isSubtotal
              return (
                <tr
                  key={i}
                  className={
                    isSubtotal
                      ? 'bg-[#FEBF10]/12 border-t-2 border-[#FEBF10]/40'
                      : 'border-b border-gray-100 hover:bg-amber-50/30 even:bg-slate-50/40 transition-colors'
                  }
                >
                  {columns.map((col) => {
                    const raw = row[col.key]
                    const isStatus = col.key === 'status' && row.statusEmoji
                    const isResult = col.key === 'result'
                    const isPlAmount = col.key === 'profit_loss' || col.key === 'total_profit'
                    let display = isStatus
                      ? `${row.statusEmoji} ${raw || ''}`.trim()
                      : formatCellValue(raw, col.format)
                    if (isResult && row.resultEmoji && !modern) {
                      display = `${row.resultEmoji} ${raw || ''}`.trim()
                    }
                    let toneClass = ''
                    if (isResult || isPlAmount) {
                      if (row.tone === 'profit' || (isPlAmount && Number(raw) > 0)) {
                        toneClass = 'text-emerald-700 font-bold'
                      } else if (row.tone === 'loss' || (isPlAmount && Number(raw) < 0)) {
                        toneClass = 'text-red-700 font-bold'
                      } else if (row.tone === 'neutral' || (isPlAmount && Number(raw) === 0)) {
                        toneClass = 'text-slate-500 font-semibold'
                      }
                    }
                    if (isSubtotal) toneClass = `${toneClass} font-bold`.trim()

                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 px-3 text-[12px] text-gray-700 tabular-nums ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${col.key === 'status' || isResult ? 'font-semibold' : ''} ${toneClass}`}
                      >
                        {isResult && modern && raw ? (
                          <ResultBadge row={row} label={raw} />
                        ) : (
                          display
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
