function Cell({ value, className = '', bold = false }) {
  let display = value
  if (typeof value === 'number') display = value.toLocaleString()
  else if (value === 0) display = '0'
  else if (value == null || value === '') display = '\u00a0'
  return (
    <td className={`px-2 py-2 text-[11px] text-right tabular-nums border border-slate-200/80 ${bold ? 'font-bold text-[#000435]' : 'text-slate-700'} ${className}`}>
      {display}
    </td>
  )
}

function TextCell({ value, className = '', bold = false, align = 'left' }) {
  return (
    <td className={`px-2 py-2 text-[11px] border border-slate-200/80 ${align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${bold ? 'font-bold text-[#000435]' : 'text-slate-700'} ${className}`}>
      {value || '\u00a0'}
    </td>
  )
}

export default function StockCountSpreadsheet({ title, rows, totals = null, reportType = 'finished' }) {
  const allRows = totals ? [...rows, totals] : rows
  const primaryLabel = reportType === 'fabric' ? 'Primary qty (m)' : 'Primary qty (pcs)'

  return (
    <div id="general-stock-count-print" className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-white">
        <p className="text-sm font-bold text-[#000435] uppercase tracking-wide underline underline-offset-4 decoration-[#FEBF10]">
          {title}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full border-collapse">
          <thead>
            <tr className="bg-[#000435] text-white">
              <th rowSpan={2} className="px-2 py-2.5 text-[10px] font-bold uppercase border border-[#000435]/20 text-left w-10">No.</th>
              <th rowSpan={2} className="px-2 py-2.5 text-[10px] font-bold uppercase border border-[#000435]/20 text-left min-w-[200px]">Product names</th>
              <th colSpan={4} className="px-2 py-2 text-[10px] font-bold uppercase border border-[#000435]/20 text-center text-[#FEBF10]">Opening stock</th>
              <th colSpan={5} className="px-2 py-2 text-[10px] font-bold uppercase border border-[#000435]/20 text-center text-[#FEBF10]">Stock in</th>
              <th colSpan={5} className="px-2 py-2 text-[10px] font-bold uppercase border border-[#000435]/20 text-center text-[#FEBF10]">Stock out</th>
              <th colSpan={4} className="px-2 py-2 text-[10px] font-bold uppercase border border-[#000435]/20 text-center text-[#FEBF10]">Closing stock</th>
            </tr>
            <tr className="bg-white text-[9px] italic text-red-600">
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">{primaryLabel}</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">Total qty</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">U.price</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">Amount</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold bg-slate-200 text-slate-800 not-italic">Date in</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">{primaryLabel}</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">Total qty</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold bg-orange-200 text-slate-800 not-italic">U.price</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">Amount</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold bg-slate-200 text-slate-800 not-italic">Date out</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">{primaryLabel}</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">Total qty</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">U.price</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">Amount</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">{primaryLabel}</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-red-600">Total qty</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">U.price</th>
              <th className="px-1 py-1.5 border border-slate-200 font-semibold text-slate-600 not-italic">Amount</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => {
              const isTotal = row.productName === 'TOTAL'
              return (
                <tr key={`${row.productName}-${i}`} className={isTotal ? 'bg-[#FEBF10]/15' : 'hover:bg-slate-50/90 even:bg-slate-50/40'}>
                  <TextCell value={row.no} bold={isTotal} align="right" />
                  <TextCell value={row.productName} bold={isTotal} />
                  <Cell value={row.opening.primaryQty} bold={isTotal} />
                  <Cell value={row.opening.totalQty} bold={isTotal} />
                  <Cell value={row.opening.unitPrice} bold={isTotal} />
                  <Cell value={row.opening.amount} bold={isTotal} />
                  <TextCell value={row.stockIn.date} className="bg-slate-100 text-center font-medium" bold={isTotal} />
                  <Cell value={row.stockIn.primaryQty} bold={isTotal} />
                  <Cell value={row.stockIn.totalQty} bold={isTotal} />
                  <Cell value={row.stockIn.unitPrice} className="bg-orange-50" bold={isTotal} />
                  <Cell value={row.stockIn.amount} bold={isTotal} />
                  <TextCell value={row.stockOut.date} className="bg-slate-100 text-center font-medium" bold={isTotal} />
                  <Cell value={row.stockOut.primaryQty} bold={isTotal} />
                  <Cell value={row.stockOut.totalQty} bold={isTotal} />
                  <Cell value={row.stockOut.unitPrice} bold={isTotal} />
                  <Cell value={row.stockOut.amount} bold={isTotal} />
                  <Cell value={row.closing.primaryQty} bold={isTotal} />
                  <Cell value={row.closing.totalQty} bold={isTotal} />
                  <Cell value={row.closing.unitPrice} bold={isTotal} />
                  <Cell value={row.closing.amount} bold={isTotal} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 text-[10px] text-slate-500 grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
        <div><span className="font-bold text-slate-600">Prepared by</span><div className="border-b border-slate-400 mt-6" /></div>
        <div><span className="font-bold text-slate-600">Approved by</span><div className="border-b border-slate-400 mt-6" /></div>
        <div><span className="font-bold text-slate-600">Signature</span><div className="border-b border-slate-400 mt-6" /></div>
      </div>
    </div>
  )
}
