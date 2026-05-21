import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const EVENT_TYPE_COLORS = {
  HOLIDAY: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  EXAM: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  SPORT: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  CEREMONY: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  MEETING: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  TERM: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  OTHER: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function calendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function fmtDate(raw) {
  if (!raw) return '—';
  return new Date(raw).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function SchoolCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/school/calendar-events', { params: { year, month: month + 1 } });
      if (res.data?.success) setEvents(Array.isArray(res.data.data) ? res.data.data : []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const d = new Date(e.event_date).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [events]);

  const cells = calendarGrid(year, month);
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : null;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); setSelectedDay(null); };

  const dayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date(today.toDateString())).slice(0, 5);

  return (
    <div className="min-h-screen bg-re-bg font-sans">
      <div className="relative w-full min-h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]" />
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]" />
        <img src="/teacher.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105 opacity-90" />
        <div className="relative z-20 max-w-[1200px] mx-auto px-6 py-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold text-re-orange opacity-80 mb-2">Academic Year</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <CalendarIcon className="text-re-orange shrink-0" size={32} />
              School Calendar
            </h1>
            <p className="text-[12px] font-bold text-white/75 mt-2 max-w-lg">
              View school events, holidays, exams, and important dates.
            </p>
          </div>
          <button type="button" onClick={load} className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 -mt-8 relative z-30 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-[24px] shadow-xl border border-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
              <button type="button" onClick={prevMonth} className="p-2 rounded-xl hover:bg-re-bg transition-colors"><ChevronLeft size={18} /></button>
              <h2 className="text-sm font-bold text-slate-800">{MONTHS[month]} {year}</h2>
              <button type="button" onClick={nextMonth} className="p-2 rounded-xl hover:bg-re-bg transition-colors"><ChevronRight size={18} /></button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 gap-3">
                <Loader2 className="animate-spin text-re-orange" size={22} />
                <span className="text-sm font-bold text-slate-400">Loading…</span>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-7 gap-px mb-2">
                  {DAYS.map(d => (
                    <div key={d} className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} className="h-14" />;
                    const hasEvents = !!eventsByDay[day];
                    const isToday = day === todayDay;
                    const isSelected = day === selectedDay;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                        className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected ? 'bg-re-orange text-white shadow-lg shadow-re-orange/20 scale-105'
                          : isToday ? 'bg-orange-50 border-2 border-re-orange/30 text-re-orange font-bold'
                          : 'hover:bg-re-bg text-slate-700'
                        }`}
                      >
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>{day}</span>
                        {hasEvents && (
                          <div className="flex gap-0.5">
                            {eventsByDay[day].slice(0, 3).map((e, j) => {
                              const c = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.OTHER;
                              return <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : c.dot}`} />;
                            })}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedDay && dayEvents.length > 0 && (
              <div className="px-6 py-4 border-t border-black/5 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Events on {selectedDay} {MONTHS[month]}</p>
                {dayEvents.map(e => {
                  const c = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.OTHER;
                  return (
                    <div key={e.id} className={`flex items-start gap-3 p-3 rounded-xl ${c.bg}`}>
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
                      <div>
                        <p className={`text-sm font-bold ${c.text}`}>{e.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {e.event_type} · {fmtDate(e.event_date)}{e.end_date ? ` → ${fmtDate(e.end_date)}` : ''}
                        </p>
                        {e.description && <p className="text-xs text-slate-600 mt-1">{e.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-[24px] shadow-xl border border-black/5 p-5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Upcoming Events</h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No upcoming events this month</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(e => {
                    const c = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.OTHER;
                    return (
                      <div key={e.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                          <span className={`text-xs font-bold ${c.text}`}>{new Date(e.event_date).getDate()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{e.title}</p>
                          <p className="text-[9px] text-slate-400">{e.event_type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-[24px] shadow-xl border border-black/5 p-5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Event Types</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_TYPE_COLORS).map(([type, c]) => (
                  <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${c.bg} ${c.text} text-[9px] font-bold`}>
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} /> {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
