import React, { useMemo, useState } from 'react';
import {
  Search, Download, Loader2, User, GraduationCap, Calendar, Clock,
} from 'lucide-react';
import {
  WEEK_DAYS,
  SLOT_STYLES,
  classifySlot,
  sortPeriodsChronologically,
  paletteForSubject,
  abbrSubject,
  normalizeTime,
  fmt12,
  parseClassGroup,
  buildClassGroups,
} from '../utils/masterTimetableShared';
import { exportTeacherTimetablePdf } from '../utils/exportTeacherTimetablePdf';

function LessonCell({ lesson }) {
  if (!lesson) {
    return <div className="rounded-lg min-h-[44px] bg-[#f8fafc] border border-dashed border-[#e2e8f0]" />;
  }
  const pal = paletteForSubject(lesson.subject_name);
  return (
    <div
      className="rounded-lg px-1.5 py-1.5 min-h-[44px] flex flex-col justify-center border shadow-sm"
      style={{ backgroundColor: pal.bg, borderColor: pal.border }}
      title={`${lesson.subject_name} · ${lesson.class_name}`}
    >
      <p className="text-[10px] font-black uppercase leading-tight text-center" style={{ color: pal.title }}>
        {abbrSubject(lesson.subject_name)}
      </p>
      <p className="text-[8px] font-bold text-center mt-0.5 opacity-70" style={{ color: pal.abbr }}>
        {lesson.class_name}
      </p>
    </div>
  );
}

export default function TeachersTimetablePanel({
  teachers = [],
  rows = [],
  periods = [],
  classOptions = [],
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  schoolName = '',
}) {
  const [teacherQ, setTeacherQ] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const classGroups = useMemo(() => buildClassGroups(classOptions), [classOptions]);

  const filteredTeachers = useMemo(() => {
    const list = teachers.filter((t) => String(t.role_code || '').toUpperCase() === 'TEACHER');
    if (!teacherQ.trim()) return list;
    const needle = teacherQ.trim().toLowerCase();
    return list.filter((t) => `${t.first_name} ${t.last_name}`.toLowerCase().includes(needle));
  }, [teachers, teacherQ]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => String(t.id) === String(selectedTeacherId)),
    [teachers, selectedTeacherId]
  );

  const classFilterOptions = useMemo(() => {
    const opts = [{ value: '', label: 'All classes / streams' }];
    for (const [group, streams] of [...classGroups.entries()].sort()) {
      if (streams.length > 1) {
        opts.push({ value: `group:${group}`, label: `${group} — all streams (${streams.map((s) => s.stream).join(', ')})` });
      }
      for (const s of streams) {
        opts.push({ value: s.fullName, label: s.fullName });
      }
    }
    return opts;
  }, [classGroups]);

  const { filteredRows, streams, viewMode, classLabel } = useMemo(() => {
    if (!selectedTeacherId) {
      return { filteredRows: [], streams: [], viewMode: 'none', classLabel: '' };
    }

    let teacherRows = rows.filter((r) => String(r.staff_id) === String(selectedTeacherId));

    if (!classFilter) {
      return {
        filteredRows: teacherRows,
        streams: [],
        viewMode: 'single',
        classLabel: 'All classes',
      };
    }

    if (classFilter.startsWith('group:')) {
      const group = classFilter.slice(6);
      const groupStreams = classGroups.get(group) || [];
      const names = new Set(groupStreams.map((s) => s.fullName));
      teacherRows = teacherRows.filter((r) => names.has(String(r.class_name || '').trim()));
      return {
        filteredRows: teacherRows,
        streams: groupStreams,
        viewMode: groupStreams.length > 1 ? 'multi' : 'single',
        classLabel: `${group} (all streams)`,
      };
    }

    teacherRows = teacherRows.filter((r) => String(r.class_name || '').trim() === classFilter);
    const parsed = parseClassGroup(classFilter);
    return {
      filteredRows: teacherRows,
      streams: [{ fullName: classFilter, stream: parsed.stream }],
      viewMode: 'single',
      classLabel: classFilter,
    };
  }, [selectedTeacherId, classFilter, rows, classGroups]);

  const allPeriods = useMemo(() => sortPeriodsChronologically(periods), [periods]);
  const displayDays = activeDays?.length ? activeDays.filter((d) => WEEK_DAYS.includes(d)) : WEEK_DAYS;

  const lessonLookupSingle = useMemo(() => {
    const m = new Map();
    for (const r of filteredRows) {
      m.set(`${r.day_of_week}__${normalizeTime(r.start_time)}`, r);
    }
    return m;
  }, [filteredRows]);

  const totalLessons = filteredRows.length;

  const handleExport = async () => {
    if (!selectedTeacher) return;
    try {
      setExporting(true);
      exportTeacherTimetablePdf({
        teacherName: `${selectedTeacher.first_name} ${selectedTeacher.last_name}`,
        rows: filteredRows,
        periods: allPeriods,
        streams: viewMode === 'multi' ? streams : [],
        activeDays: displayDays,
        term,
        academicYear,
        schoolName,
        classLabel,
      });
    } catch (e) {
      alert(e.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-black/5 bg-gradient-to-r from-[#eef2ff] to-white">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 flex items-center gap-1.5">
            <GraduationCap size={12} /> Teachers Timetable
          </p>
          <p className="text-xs text-[#64748b] font-semibold mt-1">
            Select a teacher and optional class. Choose a group (e.g. P5) for all streams A–H, or a specific stream (e.g. P5D).
          </p>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Search Teacher</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                value={teacherQ}
                onChange={(e) => setTeacherQ(e.target.value)}
                placeholder="Type name..."
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold"
              />
            </div>
            <div className="max-h-[160px] overflow-y-auto rounded-xl border border-black/10 divide-y divide-black/5">
              {filteredTeachers.map((t) => {
                const sel = String(t.id) === String(selectedTeacherId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeacherId(String(t.id))}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition ${sel ? 'bg-indigo-50' : 'hover:bg-[#f8fafc]'}`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-[#e2e8f0] flex items-center justify-center text-[10px] font-black text-[#64748b] shrink-0">
                      {(t.first_name || '')[0]}{(t.last_name || '')[0]}
                    </span>
                    <span className="text-sm font-bold text-[#0f172a] truncate">{t.first_name} {t.last_name}</span>
                  </button>
                );
              })}
              {filteredTeachers.length === 0 && (
                <p className="px-3 py-4 text-xs font-bold text-[#94a3b8] text-center">No teachers found</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#94a3b8] mb-1.5">Class / Stream</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              disabled={!selectedTeacherId}
              className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white disabled:opacity-50"
            >
              {classFilterOptions.map((o) => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-[#64748b]">
              {term && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#f1f5f9]"><Calendar size={10} />{term}</span>}
              {academicYear && <span className="px-2 py-1 rounded-lg bg-[#f1f5f9]">{academicYear}</span>}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3">
            {selectedTeacher ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
                    {(selectedTeacher.first_name || '')[0]}{(selectedTeacher.last_name || '')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0f172a]">{selectedTeacher.first_name} {selectedTeacher.last_name}</p>
                    <p className="text-[10px] font-bold text-[#64748b]">{classLabel}</p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-0.5">{totalLessons} lessons / week</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-[#94a3b8]">
                <User size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">Select a teacher to view timetable</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={!selectedTeacher || exporting || totalLessons === 0}
              className="h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center justify-center gap-2 bg-[#0f172a] text-white hover:bg-[#1e293b] transition disabled:opacity-50 w-full"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {!selectedTeacherId ? null : totalLessons === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-[#f8fafc] p-12 text-center">
          <p className="text-sm font-bold text-[#94a3b8]">No timetable entries for this teacher with the selected filters.</p>
        </div>
      ) : viewMode === 'multi' ? (
        <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="sticky left-0 z-10 bg-[#f1f5f9] border-b border-r border-black/5 px-3 py-3 text-left min-w-[72px]">Day</th>
                <th className="border-b border-r border-black/5 px-2 py-3 text-center min-w-[40px]">Str</th>
                {allPeriods.map((p) => {
                  const slotType = classifySlot(p);
                  const isSpecial = slotType !== 'teaching';
                  const style = isSpecial ? SLOT_STYLES[slotType] : null;
                  return (
                    <th
                      key={`${p.start_time}-${p.period_name}`}
                      className="border-b border-r border-black/5 px-1 py-2 text-center min-w-[64px]"
                      style={isSpecial ? { backgroundColor: style.bg } : {}}
                    >
                      <p className="text-[8px] font-black uppercase" style={{ color: isSpecial ? style.title : '#94a3b8' }}>
                        {isSpecial ? style.label : (p.period_name || 'P')}
                      </p>
                      <p className="text-[8px] font-bold text-[#0f172a]">{fmt12(normalizeTime(p.start_time))}</p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayDays.map((day) => (
                streams.map((stream, streamIdx) => (
                  <tr key={`${day}-${stream.stream}`} className={streamIdx === 0 ? 'border-t-2 border-indigo-200/50' : ''}>
                    {streamIdx === 0 && (
                      <td rowSpan={streams.length} className="sticky left-0 z-10 border-r border-b border-black/5 px-3 py-2 align-middle bg-gradient-to-b from-indigo-50 to-white">
                        <span className="text-[10px] font-black uppercase text-[#0f172a]">{day.slice(0, 3)}</span>
                      </td>
                    )}
                    <td className="border-r border-b border-black/5 px-2 py-2 text-center">
                      <span className="inline-flex w-7 h-7 rounded-lg bg-indigo-500 text-white text-[10px] font-black items-center justify-center">{stream.stream}</span>
                    </td>
                    {allPeriods.map((period) => {
                      const slotType = classifySlot(period);
                      if (slotType !== 'teaching') {
                        if (streamIdx !== 0) return null;
                        const style = SLOT_STYLES[slotType];
                        return (
                          <td key={`${day}-${period.start_time}-special`} rowSpan={streams.length} className="border-r border-b border-black/5 p-1 text-center align-middle" style={{ backgroundColor: style.bg }}>
                            <span className="text-[8px] font-black uppercase" style={{ color: style.title }}>{style.label}</span>
                          </td>
                        );
                      }
                      const lesson = filteredRows.find(
                        (r) => r.class_name === stream.fullName
                          && r.day_of_week === day
                          && normalizeTime(r.start_time) === normalizeTime(period.start_time)
                      );
                      return (
                        <td key={`${day}-${stream.stream}-${period.start_time}`} className="border-r border-b border-black/5 p-1">
                          <LessonCell lesson={lesson} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#0f172a] text-white">
                <th className="border-r border-white/10 px-3 py-3 text-left w-24">
                  <Clock size={12} className="inline mr-1 opacity-70" /> Time
                </th>
                {displayDays.map((d) => (
                  <th key={d} className="border-r border-white/10 px-2 py-3 text-center min-w-[100px]">{d.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeriods.map((period) => {
                const slotType = classifySlot(period);
                if (slotType !== 'teaching') {
                  const style = SLOT_STYLES[slotType];
                  return (
                    <tr key={`brk-${period.start_time}`}>
                      <td colSpan={displayDays.length + 1} className="border-b border-black/5 py-2 text-center text-[9px] font-black uppercase" style={{ backgroundColor: style.bg, color: style.title }}>
                        {period.period_name || style.label} · {fmt12(normalizeTime(period.start_time))}–{fmt12(normalizeTime(period.end_time))}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={period.start_time} className="hover:bg-[#fafbfc]">
                    <td className="border-r border-b border-black/5 px-3 py-2 bg-[#f8fafc]">
                      <p className="text-[9px] font-black text-[#64748b]">{period.period_name || 'Period'}</p>
                      <p className="text-[10px] font-bold text-[#0f172a]">{fmt12(normalizeTime(period.start_time))}</p>
                    </td>
                    {displayDays.map((day) => {
                      const lesson = lessonLookupSingle.get(`${day}__${normalizeTime(period.start_time)}`);
                      return (
                        <td key={`${day}-${period.start_time}`} className="border-r border-b border-black/5 p-1.5">
                          <LessonCell lesson={lesson} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
