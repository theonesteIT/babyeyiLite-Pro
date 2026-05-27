import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, AlertTriangle, List, Grid, GitBranch, Loader2, X
} from "lucide-react";
import { fetchActionPlanActivities } from "../../services/actionPlanApi";
import { useActionPlanData } from "../../context/ActionPlanDataContext";
import { parseDate } from "../../utils/actionPlanFormatters";
import ActionPlanPageHero from "./ActionPlanPageHero";
import CalendarDayModal from "./CalendarDayModal";

const CATEGORY_COLORS = {
  "Academic": { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  "Academic Activities": { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  "Infrastructure": { bg: "bg-orange-500", light: "bg-orange-100", text: "text-orange-700",  border: "border-orange-300" },
  "ICT": { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  "ICT Development": { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  "Sports": { bg: "bg-green-500", light: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  "Sports Activities": { bg: "bg-green-500", light: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  "Student Welfare": { bg: "bg-pink-500", light: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  "Teacher Training": { bg: "bg-indigo-500", light: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  "Health": { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  "Health Activities": { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  "Security": { bg: "bg-red-500", light: "bg-red-100", text: "text-red-700", border: "border-red-300" },
};

const WEEKS = ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5","Wk 6","Wk 7","Wk 8","Wk 9","Wk 10","Wk 11","Wk 12","Wk 13","Wk 14","Wk 15","Wk 16","Wk 17","Wk 18","Wk 19","Wk 20"];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function activitiesOnDate(activities, date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return activities.filter((a) => {
    const start = new Date(a.start.getFullYear(), a.start.getMonth(), a.start.getDate());
    const end = new Date(a.end.getFullYear(), a.end.getMonth(), a.end.getDate());
    return day >= start && day <= end;
  });
}

function MonthlyView({ year, month, activities, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d) => d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const getActivitiesForDay = (day) => {
    if (!day) return [];
    return activitiesOnDate(activities, new Date(year, month, day));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const acts = getActivitiesForDay(day);
          const isWeekend = i % 7 === 0 || i % 7 === 6;
          return (
            <div
              key={i}
              role={day ? "button" : undefined}
              tabIndex={day ? 0 : undefined}
              onClick={day ? () => onDayClick?.(new Date(year, month, day)) : undefined}
              onKeyDown={day ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDayClick?.(new Date(year, month, day)); } } : undefined}
              className={`min-h-[90px] md:min-h-[110px] border-b border-r border-gray-50 p-1.5 transition-colors
              ${day ? "hover:bg-amber-50/50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:z-10" : ""}
              ${isWeekend && day ? "bg-gray-50/50" : ""}`}
            >
              {day && (
                <>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 mx-auto
                    ${isToday(day) ? "bg-amber-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {acts.slice(0, 2).map(a => {
                      const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS["Academic"];
                      return (
                        <div key={a.id} className={`text-xs px-1.5 py-0.5 rounded-md font-medium truncate ${cc.light} ${cc.text}`}>
                          {a.name}
                        </div>
                      );
                    })}
                    {acts.length > 2 && (
                      <div className="text-xs text-gray-400 pl-1 font-medium">+{acts.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyView({ year, month, weekStart, activities, onDayClick }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(year, month, weekStart + i);
    return d;
  });

  const hours = Array.from({ length: 10 }, (_, i) => i + 7); // 7am to 4pm

  const getActivitiesForDay = (date) => activitiesOnDate(activities, date);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-100">
        <div className="py-3 text-center text-xs font-bold text-gray-300">Time</div>
        {days.map((d, i) => {
          const today = new Date();
          const isToday = d.toDateString() === today.toDateString();
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick?.(d)}
              className={`py-3 text-center border-l border-gray-100 hover:bg-amber-50/60 transition-colors ${isToday ? "bg-amber-50" : ""}`}
            >
              <p className="text-xs font-bold text-gray-500 uppercase">{DAYS_OF_WEEK[d.getDay()]}</p>
              <p className={`text-lg font-bold ${isToday ? "text-amber-500" : "text-[#000435]"}`}>{d.getDate()}</p>
            </button>
          );
        })}
      </div>
      <div className="overflow-y-auto max-h-[440px]">
        {hours.map(h => (
          <div key={h} className="grid grid-cols-8 border-b border-gray-50 min-h-[60px]">
            <div className="px-2 py-2 text-xs text-gray-300 font-medium text-right">{h}:00</div>
            {days.map((d, di) => {
              const acts = getActivitiesForDay(d);
              const today = new Date();
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={di} className={`border-l border-gray-100 p-1 ${isToday ? "bg-amber-50/30" : ""}`}>
                  {h === 8 && acts.slice(0, 2).map(a => {
                    const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS["Academic"];
                    return (
                      <div key={a.id} className={`text-xs px-1.5 py-1 rounded-lg font-medium mb-1 leading-tight cursor-pointer hover:opacity-80 ${cc.light} ${cc.text} border ${cc.border}`}>
                        <p className="truncate font-bold">{a.name}</p>
                        <p className="truncate opacity-70">{a.responsible}</p>
                      </div>
                    );
                  })}
                  {h === 8 && acts.length > 2 && (
                    <div className="text-xs text-amber-600 font-semibold">+{acts.length - 2}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function GanttView({ activities }) {
  const ganttPlans = activities.slice(0, 12).map((a, idx) => {
    const startWeek = Math.max(0, Math.min(19, Math.floor(((a.start.getMonth() * 30 + a.start.getDate()) / 365) * 20)));
    const days = Math.max(1, Math.ceil((a.end - a.start) / (1000 * 60 * 60 * 24)));
    const durationWeeks = Math.max(1, Math.min(20, Math.ceil(days / 7)));
    return {
      id: a.id || idx,
      title: a.name,
      category: a.category,
      startWeek,
      durationWeeks,
      progress: Number(a.progress || 0),
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <GitBranch size={15} className="text-amber-500" />
        <p className="text-sm font-bold text-[#000435]">Gantt Chart — Academic Year 2024/2025</p>
        <span className="ml-auto text-xs text-gray-400">Weeks 1–20 (Jan–May)</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            <div className="w-44 flex-shrink-0 px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide border-r border-gray-100">Activity</div>
            <div className="flex flex-1">
              {WEEKS.map((w, i) => (
                <div key={i} className="flex-1 text-center text-xs font-semibold text-gray-400 py-2.5 border-r border-gray-100 min-w-[42px]">{w}</div>
              ))}
            </div>
          </div>
          {/* Rows */}
          {ganttPlans.map(plan => {
            const cc = CATEGORY_COLORS[plan.category] || CATEGORY_COLORS["Academic"];
            return (
              <div key={plan.id} className="flex border-b border-gray-50 hover:bg-gray-50/50 group">
                <div className="w-44 flex-shrink-0 px-3 py-3 border-r border-gray-100">
                  <p className="text-xs font-semibold text-[#000435] leading-tight truncate">{plan.title}</p>
                  <p className={`text-xs mt-0.5 font-medium ${cc.text}`}>{plan.category}</p>
                </div>
                <div className="flex flex-1 items-center relative py-2">
                  {WEEKS.map((_, i) => (
                    <div key={i} className="flex-1 h-full border-r border-gray-100 min-w-[42px]" />
                  ))}
                  {/* Bar */}
                  <div className="absolute inset-y-2"
                    style={{
                      left: `${(plan.startWeek / WEEKS.length) * 100}%`,
                      width: `${(plan.durationWeeks / WEEKS.length) * 100}%`,
                      minWidth: "30px"
                    }}>
                    <div className={`h-7 rounded-lg relative overflow-hidden ${cc.light} border ${cc.border}`}>
                      <div className={`h-full rounded-lg ${cc.bg} opacity-70 transition-all`}
                        style={{ width: `${plan.progress}%` }} />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className={`text-xs font-bold truncate ${plan.progress > 50 ? "text-white" : cc.text}`}>
                          {plan.progress > 0 ? `${plan.progress}%` : plan.title.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-4 flex-wrap">
        {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([cat, cc]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-3 h-3 rounded-sm ${cc.bg}`} />{cat}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarView({ embedded = false }) {
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allActivities, setAllActivities] = useState([]);
  const { reload } = useActionPlanData();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchActionPlanActivities();
      const mapped = rows
        .map((a) => {
          const start = parseDate(a.plannedStart);
          const end = parseDate(a.plannedEnd) || start;
          if (!start || !end) return null;
          return {
            id: a.id,
            name: a.activityName,
            category: a.category || "Academic",
            dept: a.department || "—",
            start,
            end,
            status: a.statusLabel || a.status,
            statusManualOverride: Boolean(a.statusManualOverride),
            progress: Number(a.progressPct || 0),
            responsible: a.responsibleName || "—",
          };
        })
        .filter(Boolean);
      setAllActivities(mapped);
    } catch {
      setAllActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const todayActivities = useMemo(() => activitiesOnDate(allActivities, new Date()), [allActivities]);

  const dayModalActivities = useMemo(() => {
    if (!selectedDay) return [];
    return activitiesOnDate(allActivities, selectedDay);
  }, [allActivities, selectedDay]);

  const handleDayClick = (date) => {
    setSelectedDay(date);
    setSelectedActivity(null);
  };

  return (
    <div className={`${embedded ? 'w-full min-h-0' : 'flex h-screen overflow-hidden'} bg-gray-50 font-['Montserrat']`}>
      <div className={embedded ? "w-full" : "flex-1 flex flex-col min-w-0 overflow-hidden"}>
        {!embedded && <ActionPlanPageHero pageId="ap-calendar" />}
        <main className={`${embedded ? "p-4 md:p-6 pb-12 space-y-4" : "flex-1 overflow-y-auto p-4 md:p-6 space-y-4"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              {[
                { key: "month", icon: Grid, label: "Month" },
                { key: "week", icon: List, label: "Week" },
                { key: "gantt", icon: GitBranch, label: "Gantt" },
              ].map((item) => {
                const ViewIcon = item.icon;
                return (
                <button key={item.key} type="button" onClick={() => setView(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${view === item.key ? "bg-white text-[#000435] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  <ViewIcon size={13} /><span>{item.label}</span>
                </button>
                );
              })}
            </div>
            <button type="button" onClick={() => { reload?.(); loadActivities(); }} className="flex items-center gap-1.5 bg-[#000435] text-white px-3 py-2 rounded-xl text-sm font-semibold">
              <Plus size={15} /><span>Refresh</span>
            </button>
          </div>

          {/* Month Nav (not shown for gantt) */}
          {view !== "gantt" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl hover:border-amber-400 hover:text-amber-500 transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-xl font-bold text-[#000435]">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl hover:border-amber-400 hover:text-amber-500 transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
              <button className="text-sm text-amber-600 font-semibold hover:underline" onClick={() => setCurrentDate(new Date())}>Today</button>
            </div>
          )}

          {/* Category Legend */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(CATEGORY_COLORS).slice(0,6).map(([cat, cc]) => (
              <div key={cat} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cc.light} ${cc.text}`}>
                <div className={`w-2 h-2 rounded-full ${cc.bg}`} />{cat}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className={view === "gantt" ? "lg:col-span-4" : "lg:col-span-3"}>
              {loading ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px] flex items-center justify-center">
                  <Loader2 size={30} className="animate-spin text-amber-500" />
                </div>
              ) : (
                <>
                  {view === "month" && (
                    <MonthlyView year={year} month={month} activities={allActivities} onDayClick={handleDayClick} />
                  )}
                  {view === "week" && (
                    <WeeklyView year={year} month={month} weekStart={14} activities={allActivities} onDayClick={handleDayClick} />
                  )}
                  {view === "gantt" && <GanttView activities={allActivities} />}
                </>
              )}
            </div>

            {/* Sidebar Panel */}
            {view !== "gantt" && (
              <div className="space-y-4">
                {/* Today's Events */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-[#000435] to-[#001580]">
                    <p className="text-sm font-bold text-white">Today's Activities</p>
                    <p className="text-xs text-white/50 mt-0.5">{new Date().toLocaleDateString("en-RW", { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {todayActivities.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">No activities today</div>
                    ) : todayActivities.map(a => {
                      const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS["Academic"];
                      return (
                        <div key={a.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleDayClick(new Date())}>
                          <div className="flex items-start gap-2.5">
                            <div className={`w-1.5 h-full rounded-full ${cc.bg} flex-shrink-0 mt-0.5 min-h-[40px]`} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#000435] leading-tight">{a.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{a.dept}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-4 h-4 rounded-full bg-[#000435] flex items-center justify-center text-white text-[8px] font-bold">
                                  {a.responsible.split(" ").map(n => n[0]).join("").slice(0,2)}
                                </div>
                                <span className="text-xs text-gray-400 truncate">{a.responsible}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Activities */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-gray-100">
                    <p className="text-sm font-bold text-[#000435]">Upcoming This Week</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {allActivities.slice(0, 4).map(a => {
                      const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS["Academic"];
                      return (
                        <div key={a.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cc.light}`}>
                            <Calendar size={14} className={cc.text} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#000435] truncate">{a.name}</p>
                            <p className="text-xs text-gray-400">{a.start.toLocaleDateString("en-RW", { month: "short", day: "numeric" })} → {a.end.toLocaleDateString("en-RW", { month: "short", day: "numeric" })}</p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cc.light} ${cc.text}`}>
                            {a.category}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-gradient-to-br from-[#000435] to-[#001580] rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-white">{MONTHS[month]} Summary</p>
                  {[
                    { label: "Total Activities", value: allActivities.length, icon: Calendar, color: "text-white" },
                    { label: "Ongoing", value: allActivities.filter(a => a.status === "Ongoing").length, icon: Clock, color: "text-amber-400" },
                    { label: "Not Started", value: allActivities.filter(a => a.status === "Not Started").length, icon: AlertTriangle, color: "text-red-400" },
                  ].map((stat) => {
                    const StatIcon = stat.icon;
                    return (
                    <div key={stat.label} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <StatIcon size={14} className={stat.color} />
                        <span className="text-white/70 text-xs">{stat.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <CalendarDayModal
            date={selectedDay}
            activities={dayModalActivities}
            categoryColors={CATEGORY_COLORS}
            onClose={() => setSelectedDay(null)}
            onSelectActivity={(a) => {
              setSelectedDay(null);
              setSelectedActivity(a);
            }}
          />

          {/* Activity Detail Modal */}
          {selectedActivity && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                {(() => {
                  const a = selectedActivity;
                  const cc = CATEGORY_COLORS[a.category] || CATEGORY_COLORS["Academic"];
                  return (
                    <>
                      <div className={`px-5 py-4 ${cc.bg} flex items-start justify-between`}>
                        <div>
                          <span className="text-xs font-bold text-white/80 uppercase tracking-wide">{a.category}</span>
                          <h3 className="text-white font-bold text-base mt-0.5">{a.name}</h3>
                        </div>
                        <button onClick={() => setSelectedActivity(null)} className="text-white/70 hover:text-white"><X size={18} /></button>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Department</p><p className="font-bold text-[#000435]">{a.dept}</p></div>
                          <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Status</p><p className="font-bold text-amber-600">{a.status}</p></div>
                          <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">Start</p><p className="font-bold text-[#000435]">{a.start.toLocaleDateString("en-RW", { month: "short", day: "numeric" })}</p></div>
                          <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-0.5">End</p><p className="font-bold text-[#000435]">{a.end.toLocaleDateString("en-RW", { month: "short", day: "numeric" })}</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">Responsible</p>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#000435] flex items-center justify-center text-white text-xs font-bold">
                              {a.responsible.split(" ").map(n => n[0]).join("").slice(0,2)}
                            </div>
                            <p className="font-semibold text-[#000435] text-sm">{a.responsible}</p>
                          </div>
                        </div>
                        <button className={`w-full py-2.5 rounded-xl text-white font-semibold text-sm ${cc.bg}`}>View Full Details</button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}