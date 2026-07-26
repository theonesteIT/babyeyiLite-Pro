import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function localDateStr(d = new Date()) {
  const date = d instanceof Date && !Number.isNaN(d.getTime()) ? d : new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDateStr(new Date(year, month, day)))
  }
  return cells
}

export default function AcademicCalendarWidget({ academic, events = {} }) {
  const today = localDateStr()
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const stockIn = events.stockIn || new Set()
  const stockOut = events.stockOut || new Set()
  const sales = events.sales || new Set()

  const monthName = useMemo(
    () => new Date(view.year, view.month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    [view.year, view.month]
  )

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month])

  const prevMonth = () => {
    setView((v) => {
      const m = v.month - 1
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m }
    })
  }

  const nextMonth = () => {
    setView((v) => {
      const m = v.month + 1
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m }
    })
  }

  const goToday = () => {
    const now = new Date()
    setView({ year: now.getFullYear(), month: now.getMonth() })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Academic year</p>
          <p className="text-sm font-bold text-[#000435] mt-0.5">{academic?.academicYear || '—'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Current term</p>
          <p className="text-sm font-bold text-[#000435] mt-0.5">{academic?.currentTerm || '—'}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 bg-slate-50/80">
          <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-500" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-[#000435]">{monthName}</p>
            <button type="button" onClick={goToday} className="text-[10px] font-semibold text-[#c87800] hover:underline mt-0.5">
              Today
            </button>
          </div>
          <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white text-slate-500" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-slate-50 py-1.5 text-center text-[9px] font-bold uppercase text-slate-400">
              {d}
            </div>
          ))}
          {cells.map((dateStr, i) => {
            if (!dateStr) {
              return <div key={`empty-${i}`} className="bg-white min-h-[2.75rem]" />
            }
            const dayNum = Number(dateStr.slice(8, 10))
            const isToday = dateStr === today
            const hasIn = stockIn.has(dateStr)
            const hasOut = stockOut.has(dateStr)
            const hasSale = sales.has(dateStr)
            return (
              <div
                key={dateStr}
                className={`bg-white min-h-[2.75rem] p-1 flex flex-col items-center ${
                  isToday ? 'ring-2 ring-inset ring-[#FEBF10] bg-amber-50/40' : ''
                }`}
              >
                <span className={`text-[11px] font-semibold ${isToday ? 'text-[#c87800]' : 'text-[#000435]'}`}>
                  {dayNum}
                </span>
                <div className="flex gap-0.5 mt-auto pb-0.5">
                  {hasIn ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Stock in" /> : null}
                  {hasOut ? <span className="w-1.5 h-1.5 rounded-full bg-violet-500" title="Stock out" /> : null}
                  {hasSale ? <span className="w-1.5 h-1.5 rounded-full bg-[#FEBF10]" title="Sales" /> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Stock in</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Distribution</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FEBF10]" /> Sales</span>
      </div>
    </div>
  )
}
