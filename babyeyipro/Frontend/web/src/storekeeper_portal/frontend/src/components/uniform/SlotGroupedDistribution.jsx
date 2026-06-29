import { Fragment, useMemo, useState } from 'react'
import { Users, Search, X } from 'lucide-react'
import {
  buildIssueSlotMatrix,
  formatMatrixQty,
  formatMatrixAmount,
  slotColumnHeaderLabel,
} from '../../utils/uniformIssueSlotGroups'
import { UniformSection, UniformTableWrap } from './UniformInventoryUi'

function filterStudentsByQuery(students, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return students
  return students.filter(
    (st) =>
      String(st.code || '').toLowerCase().includes(q) ||
      String(st.name || '').toLowerCase().includes(q)
  )
}

function totalsForStudents(students, columns) {
  const colTotals = columns.map((col) => ({ key: col.key, totalQty: 0, totalAmount: 0 }))
  let grandTotalQty = 0
  let grandTotalAmount = 0

  for (const st of students) {
    grandTotalQty += Number(st.rowTotalQty) || 0
    grandTotalAmount += Number(st.rowTotalAmount) || 0
    columns.forEach((col, i) => {
      const cell = st.cells[col.key]
      if (cell) {
        colTotals[i].totalQty += Number(cell.qty) || 0
        colTotals[i].totalAmount += Number(cell.amount) || 0
      }
    })
  }

  return { colTotals, grandTotalQty, grandTotalAmount }
}

export default function SlotGroupedDistribution({ detail }) {
  const [studentFilter, setStudentFilter] = useState('')
  const { columns, students, grandTotalQty, grandTotalAmount } = buildIssueSlotMatrix(detail)

  const filteredStudents = useMemo(
    () => filterStudentsByQuery(students, studentFilter),
    [students, studentFilter]
  )

  const displayTotals = useMemo(() => {
    if (!studentFilter.trim()) {
      return {
        colTotals: columns.map((c) => ({ key: c.key, totalQty: c.totalQty, totalAmount: c.totalAmount })),
        grandTotalQty,
        grandTotalAmount,
      }
    }
    return totalsForStudents(filteredStudents, columns)
  }, [studentFilter, filteredStudents, columns, grandTotalQty, grandTotalAmount])

  if (!columns.length || !students.length) return null

  const isFiltered = studentFilter.trim().length > 0
  const subtitle = isFiltered
    ? `Showing ${filteredStudents.length} of ${students.length} students · ${columns.length} slot${columns.length === 1 ? '' : 's'}`
    : `${students.length} students · ${columns.length} slot${columns.length === 1 ? '' : 's'} — quantity & amount per column`

  return (
    <UniformSection
      title="Student distribution"
      subtitle={subtitle}
      icon={Users}
      action={
        <div className="flex items-center gap-2 min-w-[200px] sm:min-w-[260px]">
          <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-amber-200/60 focus-within:border-amber-300">
            <Search size={14} className="text-gray-300 shrink-0" />
            <input
              type="search"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              placeholder="Filter by name or code…"
              className="flex-1 text-xs outline-none bg-transparent min-w-0 text-[#000435] placeholder:text-gray-400"
            />
            {studentFilter && (
              <button
                type="button"
                onClick={() => setStudentFilter('')}
                className="text-gray-300 hover:text-gray-500 shrink-0"
                title="Clear filter"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      }
      bodyClassName="p-0"
    >
      {filteredStudents.length === 0 ? (
        <div className="py-12 text-center px-4">
          <p className="text-sm font-medium text-gray-500">No students match &ldquo;{studentFilter}&rdquo;</p>
          <button
            type="button"
            onClick={() => setStudentFilter('')}
            className="mt-3 text-xs font-bold uppercase text-amber-600 hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <UniformTableWrap className="border-0 shadow-none rounded-none max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: `${320 + columns.length * 140}px` }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-gradient-to-r from-[#000435] to-[#1a2876] text-white">
                <th
                  rowSpan={2}
                  className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 sticky left-0 z-30 bg-[#000435]"
                >
                  Code
                </th>
                <th
                  rowSpan={2}
                  className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider border-r border-white/10 sticky left-[88px] z-30 bg-[#000435] min-w-[160px]"
                >
                  Student name
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    colSpan={2}
                    className="text-center py-2.5 px-2 text-[10px] font-bold uppercase tracking-wider border-r border-white/10"
                  >
                    <span className="text-[#FEBF10]">{slotColumnHeaderLabel(col)}</span>
                  </th>
                ))}
                <th
                  colSpan={2}
                  className="text-center py-2.5 px-2 text-[10px] font-bold uppercase tracking-wider bg-[#000435]/80"
                >
                  Row total
                </th>
              </tr>
              <tr className="bg-gray-50/95 border-b border-gray-200">
                {columns.map((col) => (
                  <Fragment key={`hdr-${col.key}`}>
                    <th className="text-right py-2 px-3 text-[9px] font-bold uppercase text-gray-400 tracking-wider border-r border-gray-100 min-w-[56px]">
                      Qty
                    </th>
                    <th className="text-right py-2 px-3 text-[9px] font-bold uppercase text-gray-400 tracking-wider border-r border-gray-100 min-w-[80px]">
                      Amount
                    </th>
                  </Fragment>
                ))}
                <th className="text-right py-2 px-3 text-[9px] font-bold uppercase text-gray-400 tracking-wider border-r border-gray-100">
                  Qty
                </th>
                <th className="text-right py-2 px-3 text-[9px] font-bold uppercase text-gray-400 tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st, i) => (
                <tr
                  key={st.studentId}
                  className={`border-b border-gray-50 hover:bg-amber-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/25' : ''}`}
                >
                  <td className="py-2.5 px-4 text-xs font-mono text-gray-600 sticky left-0 z-10 bg-inherit border-r border-gray-50">
                    {st.code}
                  </td>
                  <td className="py-2.5 px-4 text-xs font-bold text-[#000435] sticky left-[88px] z-10 bg-inherit border-r border-gray-50 min-w-[160px]">
                    {st.name}
                  </td>
                  {columns.map((col) => {
                    const cell = st.cells[col.key]
                    const qty = cell ? Number(cell.qty) || 0 : 0
                    const amt = cell ? Number(cell.amount) || 0 : 0
                    return (
                      <Fragment key={`${st.studentId}-${col.key}`}>
                        <td
                          className={`py-2.5 px-3 text-xs text-right border-r border-gray-50 ${qty > 0 ? 'font-semibold text-gray-700' : 'text-gray-300'}`}
                        >
                          {formatMatrixQty(qty)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-xs text-right border-r border-gray-50 ${amt > 0 ? 'font-bold text-[#000435]' : 'text-gray-300'}`}
                        >
                          {formatMatrixAmount(amt)}
                        </td>
                      </Fragment>
                    )
                  })}
                  <td className="py-2.5 px-3 text-xs text-right font-semibold text-amber-700 border-r border-gray-50">
                    {formatMatrixQty(st.rowTotalQty)}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-right font-bold text-[#000435]">
                    {formatMatrixAmount(st.rowTotalAmount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-amber-50/70 border-t-2 border-amber-200 sticky bottom-0">
                <td
                  colSpan={2}
                  className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-[#000435] sticky left-0 bg-amber-50/95 border-r border-amber-100"
                >
                  {isFiltered ? 'Filtered totals' : 'Column totals'}
                </td>
                {displayTotals.colTotals.map((col) => (
                  <Fragment key={`tot-${col.key}`}>
                    <td className="py-3 px-3 text-xs text-right font-bold text-amber-700 border-r border-amber-100">
                      {formatMatrixQty(col.totalQty)}
                    </td>
                    <td className="py-3 px-3 text-xs text-right font-bold text-amber-700 border-r border-amber-100">
                      {formatMatrixAmount(col.totalAmount)}
                    </td>
                  </Fragment>
                ))}
                <td className="py-3 px-3 text-xs text-right font-bold text-[#000435] border-r border-amber-100">
                  {formatMatrixQty(displayTotals.grandTotalQty)}
                </td>
                <td className="py-3 px-3 text-xs text-right font-bold text-[#000435]">
                  {formatMatrixAmount(displayTotals.grandTotalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </UniformTableWrap>
      )}
    </UniformSection>
  )
}
