import { useMemo, useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { normalizeDateOnly, localTodayIso, formatDateDisplay } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const FONT = "'Montserrat', sans-serif"

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function dateKey(y, m, d) {
  const mm = String(m + 1).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

function parseKey(str) {
  return normalizeDateOnly(str) || null
}

function todayKey() {
  return localTodayIso()
}

/** Build per-day markers from maintenance records */
function buildMarkers(records = []) {
  const today = todayKey()
  const map = {}

  const touch = (key, kind) => {
    if (!key) return
    if (!map[key]) map[key] = { scheduled: false, overdue: false, ongoing: false }
    map[key][kind] = true
  }

  records.forEach((r) => {
    const start = parseKey(r.start_date || r.date)
    const end = parseKey(r.end_date)
    const status = r.status || 'Scheduled'

    const isOverdue =
      status === 'Overdue'
      || (end && end < today && status !== 'Completed')
      || (start && start < today && (status === 'Scheduled' || status === 'Ongoing'))

    const primary = start || end
    if (!primary) return

    if (isOverdue) {
      touch(primary, 'overdue')
      if (end && end !== primary) touch(end, 'overdue')
    } else if (status === 'Scheduled') {
      touch(primary, 'scheduled')
      if (end && end !== primary) touch(end, 'scheduled')
    } else if (status === 'Ongoing') {
      touch(primary, 'ongoing')
    } else if (status === 'Completed' && start) {
      touch(start, 'scheduled')
    }
  })

  return map
}

export default function MaintenanceScheduleCalendar({
  records = [],
  selectedDate,
  onSelectDate,
}) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const markers = useMemo(() => buildMarkers(records), [records])

  const selected = selectedDate || todayKey()

  useEffect(() => {
    const key = parseKey(selected)
    if (!key) return
    const [y, m] = key.split('-').map(Number)
    if (y && m) {
      setViewYear(y)
      setViewMonth(m - 1)
    }
  }, [selected])

  const cells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const list = []
    for (let i = 0; i < firstDow; i += 1) list.push(null)
    for (let d = 1; d <= daysInMonth; d += 1) {
      const key = dateKey(viewYear, viewMonth, d)
      list.push({ day: d, key, marks: markers[key] })
    }
    return list
  }, [viewYear, viewMonth, markers])

  const monthEvents = useMemo(() => {
    return records.filter((r) => {
      const start = parseKey(r.start_date || r.date)
      const end = parseKey(r.end_date)
      const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
      return (start && start.startsWith(prefix)) || (end && end.startsWith(prefix))
    })
  }, [records, viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  const dayRecords = useMemo(() => {
    return records.filter((r) => {
      const start = parseKey(r.start_date || r.date)
      const end = parseKey(r.end_date)
      return start === selected || end === selected
    })
  }, [records, selected])

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col"
      style={{ fontFamily: FONT }}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: GOLD }}
          >
            <CalendarDays size={18} style={{ color: NAVY }} strokeWidth={2} />
          </div>
          <h3 className="font-bold text-base truncate" style={{ color: NAVY }}>
            {MONTH_LABELS[viewMonth]} {viewYear}
          </h3>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1 min-h-[220px]">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="aspect-square" />
          }
          const isSelected = cell.key === selected
          const isToday = cell.key === todayKey()
          const { marks } = cell
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate?.(cell.key)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center relative text-sm font-semibold transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : isToday
                    ? 'text-[#000435] ring-2 ring-[#FEBF10]/60 bg-[#FEBF10]/10'
                    : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={isSelected ? { backgroundColor: GOLD } : undefined}
            >
              {cell.day}
              {(marks?.overdue || marks?.scheduled) && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {marks.overdue && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Maintenance due" />
                  )}
                  {marks.scheduled && !marks.overdue && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} title="Scheduled" />
                  )}
                  {marks.scheduled && marks.overdue && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GOLD }} title="Scheduled" />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          Maintenance due
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GOLD }} />
          Scheduled
        </div>
      </div>

      {selected && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            {formatDateDisplay(selected)}
          </p>
          {dayRecords.length === 0 ? (
            <p className="text-xs text-gray-400 font-medium">No tickets on this day.</p>
          ) : (
            <ul className="space-y-2 max-h-28 overflow-y-auto">
              {dayRecords.map((r) => (
                <li key={r.id} className="text-xs rounded-lg bg-gray-50 px-2 py-1.5 border border-gray-100">
                  <p className="font-semibold truncate" style={{ color: NAVY }}>{r.asset}</p>
                  <p className="text-gray-500 truncate">{r.problem || r.description}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            {monthEvents.length} ticket{monthEvents.length !== 1 ? 's' : ''} this month
          </p>
        </div>
      )}
    </div>
  )
}
