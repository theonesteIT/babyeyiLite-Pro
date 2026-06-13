import { useState } from 'react';

import { Link } from 'react-router-dom';

import { Calendar, CalendarDays, ChevronRight, ScanLine, Clock } from 'lucide-react';



const NAVY = '#000435';

const AMBER = '#c87800';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];



export default function TeacherDashboardTimetable({ schedule = [], weeklySchedule = [] }) {

  const [view, setView] = useState('daily');

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });



  const weeklyByDay = DAYS.reduce((acc, d) => {

    acc[d] = weeklySchedule.filter((s) => s.day === d);

    return acc;

  }, {});



  return (

    <div className="tp-card overflow-hidden">

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 md:px-5 py-3.5 border-b border-black/[0.06] bg-slate-50/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-[#c87800] shrink-0" />
          <h3 className="text-sm text-[#000435]">My timetable</h3>
        </div>

        <div className="flex items-center gap-1.5 flex-nowrap w-full sm:w-auto sm:justify-end">
          <div className="flex p-0.5 rounded-xl bg-[#000435]/[0.05] shrink-0">
            {[
              { id: 'daily', icon: Calendar, label: 'Daily' },
              { id: 'weekly', icon: CalendarDays, label: 'Weekly' },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-medium transition-all whitespace-nowrap"
                style={view === v.id
                  ? { background: NAVY, color: '#fff' }
                  : { color: `${NAVY}99` }}
              >
                <v.icon size={12} strokeWidth={1.75} className="shrink-0" />
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          <Link
            to="/class-room-scan"
            className="inline-flex items-center gap-1 px-2.5 py-[7px] rounded-[10px] text-[10px] sm:text-[11px] font-medium text-white whitespace-nowrap shrink-0"
            style={{ background: AMBER }}
          >
            <ScanLine size={12} strokeWidth={1.75} className="shrink-0" />
            <span>Scan</span>
          </Link>
        </div>
      </div>



      {view === 'daily' ? (

        <div className="p-4 md:p-5 space-y-2">

          <p className="text-[11px] font-medium text-[#000435]/45 mb-3">{todayName}</p>

          {schedule.length === 0 ? (

            <p className="text-sm text-center py-8 text-[#000435]/45">No lessons scheduled today.</p>

          ) : schedule.map((item, i) => (

            <div

              key={i}

              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.active ? 'border-amber-200 bg-amber-50/50' : 'border-[#000435]/[0.06] hover:bg-slate-50/80'}`}

            >

              <div className="text-center min-w-[52px]">

                <p className="text-xs font-medium tabular-nums" style={{ color: item.active ? AMBER : NAVY }}>{item.time}</p>

                <p className="text-[10px] text-[#000435]/40">{item.end_time}</p>

              </div>

              <div className="flex-1 min-w-0">

                <p className="text-sm text-[#000435] truncate">{item.title}</p>

                <p className="text-[11px] text-[#000435]/50 truncate mt-0.5">{item.room}</p>

              </div>

              <div className="shrink-0 text-right">

                {item.period_checked_in ? (

                  <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-amber-100 text-amber-800">

                    In {item.entry_time || ''}

                  </span>

                ) : item.active ? (

                  <Link to="/class-room-scan" className="text-[10px] font-medium px-2 py-1 rounded-md text-white" style={{ background: AMBER }}>

                    Scan in

                  </Link>

                ) : (

                  <Clock size={14} className="text-[#000435]/25" strokeWidth={1.75} />

                )}

              </div>

            </div>

          ))}

          <Link to="/timetable" className="flex items-center justify-center gap-1 pt-2 text-xs text-[#c87800] hover:gap-1.5 transition-all">

            Full timetable <ChevronRight size={14} strokeWidth={2} />

          </Link>

        </div>

      ) : (

        <div className="p-4 md:p-5 overflow-x-auto">

          <div className="grid grid-cols-5 gap-2 min-w-[640px]">

            {DAYS.map((day) => (

              <div key={day} className="min-w-0">

                <p

                  className={`text-[10px] font-medium text-center mb-2 pb-2 border-b ${day === todayName ? 'border-amber-300 text-amber-700' : 'border-[#000435]/10 text-[#000435]/55'}`}

                >

                  {day.slice(0, 3)}

                </p>

                <div className="space-y-1.5">

                  {(weeklyByDay[day] || []).map((item, i) => (

                    <div key={i} className={`p-2 rounded-lg border text-[10px] ${day === todayName ? 'border-amber-200 bg-amber-50/40' : 'border-[#000435]/[0.06] bg-white'}`}>

                      <p className="font-medium tabular-nums text-[#000435]">{item.time}</p>

                      <p className="truncate mt-0.5 text-[#000435]/85">{item.subject}</p>

                      <p className="truncate text-[#000435]/45">{item.class_name}</p>

                    </div>

                  ))}

                  {(weeklyByDay[day] || []).length === 0 && (

                    <p className="text-[10px] text-center py-4 text-[#000435]/25">—</p>

                  )}

                </div>

              </div>

            ))}

          </div>

          <Link to="/timetable" className="flex items-center justify-center gap-1 pt-4 text-xs text-[#c87800] hover:gap-1.5 transition-all">

            Full timetable <ChevronRight size={14} strokeWidth={2} />

          </Link>

        </div>

      )}

    </div>

  );

}

