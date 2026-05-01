import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, Clock, MapPin, BookOpen, User, Download, Image as ImageIcon,
  ChevronLeft, ChevronRight, Grid as GridIcon, List, Loader2,
  BookMarked, Users, RefreshCw, FileText
} from 'lucide-react';
import api from '../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECT_COLORS = [
  { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', glow: 'rgba(59,130,246,0.15)' },
  { bg: '#f0fdf4', border: '#22c55e', text: '#15803d', glow: 'rgba(34,197,94,0.15)' },
  { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce', glow: 'rgba(168,85,247,0.15)' },
  { bg: '#fff7ed', border: '#f97316', text: '#c2410c', glow: 'rgba(249,115,22,0.15)' },
  { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', glow: 'rgba(244,63,94,0.15)' },
  { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e', glow: 'rgba(20,184,166,0.15)' },
  { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', glow: 'rgba(245,158,11,0.15)' },
  { bg: '#f5f3ff', border: '#8b5cf6', text: '#6d28d9', glow: 'rgba(139,92,246,0.15)' },
];

function getSubjectColor(subject, colorMap) {
  if (!colorMap[subject]) {
    const idx = Object.keys(colorMap).length % SUBJECT_COLORS.length;
    colorMap[subject] = SUBJECT_COLORS[idx];
  }
  return colorMap[subject];
}

export default function Timetable() {
  const [view, setView] = useState('grid');
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() - 1] || 'Monday');
  const [schedule, setSchedule] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ classes: [], terms: [], academicYears: [] });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [colorMap] = useState({});
  const gridRef = useRef(null);

  useEffect(() => {
    api.get('/teacher-portal/timetable-filters')
      .then(res => { if (res.data?.success) setFilterOptions(res.data.data || { classes: [], terms: [], academicYears: [] }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/teacher-portal/timetable', {
      params: {
        class_name: selectedClass || undefined,
        term: selectedTerm || undefined,
        academic_year: selectedAcademicYear || undefined,
      }
    })
      .then(res => { if (res.data?.success) setSchedule(res.data.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClass, selectedTerm, selectedAcademicYear]);

  const allTimes = [...new Set(schedule.map(s => s.time))].sort();
  const daySchedule = schedule.filter(s => s.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  const dayIdx = DAYS.indexOf(selectedDay);
  const prevDay = () => setSelectedDay(DAYS[Math.max(0, dayIdx - 1)]);
  const nextDay = () => setSelectedDay(DAYS[Math.min(DAYS.length - 1, dayIdx + 1)]);

  const handleExportPDF = useCallback(async () => {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`timetable-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('PDF export failed', e); }
    finally { setExporting(false); }
  }, [exporting]);

  const handleExportImage = useCallback(async () => {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `timetable-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) { console.error('Image export failed', e); }
    finally { setExporting(false); }
  }, [exporting]);

  const totalPeriods = schedule.length;
  const uniqueSubjects = [...new Set(schedule.map(s => s.subject))].length;
  const uniqueClasses = [...new Set(schedule.map(s => s.group).filter(Boolean))].length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-gray-50 pb-16">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a2e 100%)', minHeight: 220 }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 40%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-10 pb-16">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-0.5 w-8 rounded-full bg-orange-400" />
            <span className="text-orange-400 text-xs font-black uppercase tracking-widest">Schedule Module</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            My <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #f97316, #fb923c)' }}>Timetable</span>
          </h1>
          <p className="text-white/60 text-sm font-medium max-w-lg">
            Full weekly teaching schedule — view all assigned classes, subjects, periods, and rooms at a glance.
          </p>
          {/* Quick Stats */}
          <div className="flex gap-4 mt-6 flex-wrap">
            {[
              { icon: <BookOpen size={14} />, label: 'Total Periods', val: totalPeriods },
              { icon: <BookMarked size={14} />, label: 'Subjects', val: uniqueSubjects },
              { icon: <Users size={14} />, label: 'Classes', val: uniqueClasses },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="text-orange-400">{s.icon}</span>
                <div>
                  <div className="text-white font-black text-sm leading-none">{s.val}</div>
                  <div className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Card ── */}
      <div className="relative z-20 max-w-7xl mx-auto px-2 sm:px-4 md:px-6 -mt-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            {/* View Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-gray-200 w-full sm:w-auto">
              {[
                { id: 'grid', icon: <GridIcon size={14} />, label: 'Weekly Grid' },
                { id: 'list', icon: <List size={14} />, label: 'Daily Agenda' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-9 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
                  style={view === v.id
                    ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }
                    : { color: '#94a3b8', background: 'transparent' }
                  }
                >
                  {v.icon} <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white text-xs font-black uppercase tracking-wider text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-all"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                PDF
              </button>
              <button
                onClick={handleExportImage}
                disabled={exporting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-gray-200 bg-white text-xs font-black uppercase tracking-wider text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                Image
              </button>
              <button
                onClick={() => { setLoading(true); api.get('/teacher-portal/timetable').then(r => { if (r.data?.success) setSchedule(r.data.data || []); }).finally(() => setLoading(false)); }}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-orange-500 hover:border-orange-200 transition-all"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap gap-2">
            {[
              { label: 'All Classes', value: selectedClass, setter: setSelectedClass, options: filterOptions.classes },
              { label: 'All Terms', value: selectedTerm, setter: setSelectedTerm, options: filterOptions.terms },
              { label: 'All Years', value: selectedAcademicYear, setter: setSelectedAcademicYear, options: filterOptions.academicYears },
            ].map((f, i) => (
              <select
                key={i}
                value={f.value}
                onChange={e => f.setter(e.target.value)}
                className="h-9 px-3 pr-8 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
              >
                <option value="">{f.label}</option>
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Timetable...</p>
            </div>
          )}

          {/* ── WEEKLY GRID VIEW ── */}
          {!loading && view === 'grid' && (
            <div ref={gridRef} className="overflow-x-auto custom-scrollbar bg-white" id="timetable-grid">
              {schedule.length === 0 ? (
                <EmptyState message="No timetable data found." sub="Try adjusting your filters or contact admin." />
              ) : (
                <table className="w-full border-collapse" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-gray-50 border-r border-b border-gray-100 px-3 py-4 text-center" style={{ width: 80, minWidth: 80 }}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Time</span>
                      </th>
                      {DAYS.map(day => (
                        <th key={day} className="border-r border-b border-gray-100 px-3 py-4 text-center bg-gray-50" style={{ minWidth: 140 }}>
                          <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{day.substring(0, 3)}</div>
                          <div className="text-[8px] text-gray-300 font-bold uppercase tracking-wider mt-0.5">{day}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTimes.map((time, tIdx) => (
                      <tr key={time} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                        <td className="sticky left-0 z-10 border-r border-b border-gray-100 px-2 py-3 text-center" style={{ background: tIdx % 2 === 0 ? '#fff' : '#f9fafb', minWidth: 80 }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <Clock size={10} className="text-gray-300" />
                            <span className="text-[10px] font-black text-gray-400 tabular-nums">{time}</span>
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const sessions = schedule.filter(s => s.day === day && s.time === time);
                          const session = sessions[0];
                          const color = session ? getSubjectColor(session.subject, colorMap) : null;
                          return (
                            <td key={`${day}-${time}`} className="border-r border-b border-gray-100 p-1.5 align-top" style={{ minWidth: 140, height: 100 }}>
                              {session ? (
                                <div
                                  className="h-full rounded-xl p-2.5 flex flex-col gap-1 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default relative overflow-hidden"
                                  style={{ background: color.bg, border: `1.5px solid ${color.border}30` }}
                                >
                                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: color.border }} />
                                  <div className="pl-1.5">
                                    <div className="text-[10px] font-black uppercase tracking-wide leading-tight truncate" style={{ color: color.text }}>
                                      {session.subject}
                                    </div>
                                    {session.group && (
                                      <div className="text-[9px] font-bold truncate mt-0.5" style={{ color: color.text + 'aa' }}>
                                        {session.group}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5">
                                      {session.room && (
                                        <span className="flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: color.border + '18', color: color.text }}>
                                          <MapPin size={7} /> {session.room}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── DAILY AGENDA VIEW ── */}
          {!loading && view === 'list' && (
            <div>
              {/* Day Navigator */}
              <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100 bg-white">
                <button onClick={prevDay} disabled={dayIdx === 0} className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500 disabled:opacity-30 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <div className="flex-1 flex gap-1 overflow-x-auto custom-scrollbar">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className="flex-shrink-0 px-3 sm:px-4 h-9 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200"
                      style={selectedDay === day
                        ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 2px 12px rgba(249,115,22,0.35)' }
                        : { background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }
                      }
                    >
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.substring(0, 3)}</span>
                    </button>
                  ))}
                </div>
                <button onClick={nextDay} disabled={dayIdx === DAYS.length - 1} className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-orange-200 hover:text-orange-500 disabled:opacity-30 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                {daySchedule.length === 0 ? (
                  <EmptyState message={`No classes on ${selectedDay}`} sub="You have a free day. Enjoy!" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySchedule.map((session, idx) => {
                      const color = getSubjectColor(session.subject, colorMap);
                      return (
                        <div
                          key={session.id || idx}
                          className="group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden"
                          style={{ background: '#fff', border: `1.5px solid ${color.border}25`, boxShadow: `0 2px 12px ${color.glow}` }}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color.border}, ${color.border}80)` }} />
                          <div className="flex items-start justify-between mb-3 pt-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider" style={{ background: color.bg, color: color.text }}>
                              <BookOpen size={9} /> {session.type || 'Lesson'}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg" style={{ background: '#f8fafc', color: '#94a3b8' }}>
                              <Clock size={9} /> {session.time}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-gray-800 tracking-tight leading-tight mb-1" style={{ color: color.text }}>
                            {session.subject}
                          </h3>
                          {session.group && (
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: color.text + '99' }}>
                              {session.group}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                            {session.room && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <MapPin size={10} className="text-gray-400" /> {session.room}
                              </span>
                            )}
                            {session.teacher_name && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                <User size={10} className="text-gray-400" /> {session.teacher_name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)' }}>
        <Calendar size={28} className="text-orange-400" />
      </div>
      <p className="text-sm font-black uppercase tracking-widest text-gray-700">{message}</p>
      {sub && <p className="text-xs font-bold text-gray-400 text-center max-w-xs">{sub}</p>}
    </div>
  );
}
