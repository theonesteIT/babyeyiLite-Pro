import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Download, Loader2 } from 'lucide-react';
import {
  WEEK_DAYS,
  SLOT_STYLES,
  classifySlot,
  sortPeriodsChronologically,
  buildLessonLookup,
  mergeMasterRowsWithExtras,
  paletteForSubject,
  abbrSubject,
  teacherInitials,
  normalizeTime,
  fmt12,
  parseClassGroup,
  buildClassGroups,
} from '../utils/masterTimetableShared';
import { EXTRA_ACTIVITY_STYLE } from '../utils/extraActivityUtils';
import { exportMasterTimetablePdf } from '../utils/exportMasterTimetablePdf';

export { paletteForSubject, parseClassGroup, buildClassGroups, abbrSubject };

function SpecialSlotCell({ period, slotType, rowSpan, streamsCount }) {
  const style = SLOT_STYLES[slotType] || SLOT_STYLES.break;
  const label = period.period_name || style.label;

  return (
    <td
      rowSpan={rowSpan}
      className="border-r border-b border-black/10 p-1 align-middle text-center"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div
        className="flex flex-col items-center justify-center min-h-full py-2 px-1 rounded-lg border"
        style={{ borderColor: style.border, minHeight: streamsCount > 1 ? `${streamsCount * 48}px` : '48px' }}
      >
        <span
          className="text-[9px] font-black uppercase tracking-wider leading-tight"
          style={{ color: style.title, writingMode: streamsCount > 4 ? 'vertical-rl' : undefined }}
        >
          {label}
        </span>
        <span className="text-[8px] font-bold mt-1 opacity-80" style={{ color: style.title }}>
          {fmt12(normalizeTime(period.start_time))}–{fmt12(normalizeTime(period.end_time))}
        </span>
      </div>
    </td>
  );
}

export default function MasterStreamTimetable({
  rows = [],
  extraActivities = [],
  periods = [],
  streams = [],
  groupLabel = '',
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  schoolName = '',
}) {
  const [exporting, setExporting] = useState(false);

  const displayDays = activeDays?.length
    ? activeDays.filter((d) => WEEK_DAYS.includes(d))
    : WEEK_DAYS;

  const allPeriods = useMemo(() => sortPeriodsChronologically(periods), [periods]);

  const teachingPeriods = useMemo(
    () => allPeriods.filter((p) => classifySlot(p) === 'teaching'),
    [allPeriods]
  );

  const mergedRows = useMemo(
    () => mergeMasterRowsWithExtras(rows, extraActivities, streams, { term, academicYear }),
    [rows, extraActivities, streams, term, academicYear]
  );

  const lessonLookup = useMemo(
    () => buildLessonLookup(mergedRows, streams, teachingPeriods),
    [mergedRows, streams, teachingPeriods]
  );

  const specialCounts = useMemo(() => {
    const c = { break: 0, lunch: 0, correction: 0 };
    for (const p of allPeriods) {
      const t = classifySlot(p);
      if (c[t] != null) c[t] += 1;
    }
    return c;
  }, [allPeriods]);

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      exportMasterTimetablePdf({
        rows: mergedRows,
        periods: allPeriods,
        streams,
        groupLabel,
        activeDays: displayDays,
        term,
        academicYear,
        schoolName,
      });
    } catch (e) {
      console.error(e);
      alert(e.message || 'PDF export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!streams.length) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-[#f8fafc] p-12 text-center">
        <p className="text-sm font-bold text-[#94a3b8]">No streams found for this class group.</p>
      </div>
    );
  }

  if (!allPeriods.length) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-[#f8fafc] p-12 text-center">
        <p className="text-sm font-bold text-[#94a3b8]">Configure time periods in Time Settings first.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-black/5 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8]">Master Timetable</p>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide mt-0.5">
              {groupLabel || 'Class'} — All Streams
            </h3>
            {schoolName && (
              <p className="text-[11px] font-semibold text-[#cbd5e1] mt-0.5">{schoolName}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {term && <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-[#e2e8f0]">{term}</span>}
            {academicYear && <span className="px-2.5 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-[#e2e8f0]">{academicYear}</span>}
            <span className="px-2.5 py-1 rounded-lg bg-[#FF8C00]/20 text-[10px] font-bold text-[#fdba74]">{streams.length} streams</span>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 bg-white text-[#0f172a] hover:bg-[#f8fafc] shadow-md transition disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-b border-black/5 bg-[#f8fafc] flex flex-wrap items-center gap-3">
        <span className="text-[9px] font-black uppercase text-[#94a3b8]">Legend</span>
        <span
          className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-lg border"
          style={{
            backgroundColor: EXTRA_ACTIVITY_STYLE.bg,
            borderColor: EXTRA_ACTIVITY_STYLE.border,
            color: EXTRA_ACTIVITY_STYLE.title,
          }}
        >
          EXTRA
        </span>
        {['break', 'lunch', 'correction'].map((key) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-1 rounded-lg border"
            style={{
              backgroundColor: SLOT_STYLES[key].bg,
              borderColor: SLOT_STYLES[key].border,
              color: SLOT_STYLES[key].title,
            }}
          >
            {SLOT_STYLES[key].label}
          </span>
        ))}
        <span className="text-[9px] font-semibold text-[#94a3b8] ml-auto hidden sm:inline">
          Break · Lunch · Correction columns apply to all streams
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#f8fafc]">
              <th className="sticky left-0 z-20 bg-[#f1f5f9] border-b border-r border-black/5 px-3 py-3 text-left min-w-[72px]">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]">Day</span>
              </th>
              <th className="sticky left-[72px] z-20 bg-[#f1f5f9] border-b border-r border-black/5 px-2 py-3 text-center min-w-[44px]">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#64748b]">Str</span>
              </th>
              {allPeriods.map((p) => {
                const slotType = classifySlot(p);
                const isSpecial = slotType !== 'teaching';
                const style = isSpecial ? SLOT_STYLES[slotType] : null;
                return (
                  <th
                    key={`${p.id || p.start_time}-${p.period_name}`}
                    className="border-b border-r border-black/5 px-1.5 py-2 text-center min-w-[68px]"
                    style={isSpecial ? { backgroundColor: style.bg, borderColor: style.border } : { backgroundColor: '#f8fafc' }}
                  >
                    <p
                      className="text-[8px] font-black uppercase truncate"
                      style={{ color: isSpecial ? style.title : '#94a3b8' }}
                    >
                      {isSpecial ? style.label : (p.period_name || 'Period')}
                    </p>
                    <p className="text-[9px] font-bold text-[#0f172a] mt-0.5 whitespace-nowrap">
                      {fmt12(normalizeTime(p.start_time))}–{fmt12(normalizeTime(p.end_time))}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayDays.map((day) => (
              streams.map((stream, streamIdx) => (
                <tr
                  key={`${day}-${stream.stream}`}
                  className={`group ${streamIdx === 0 ? 'border-t-2 border-[#FF8C00]/30' : ''} hover:bg-[#fafbfc]/80`}
                >
                  {streamIdx === 0 && (
                    <td
                      rowSpan={streams.length}
                      className="sticky left-0 z-10 border-r border-b border-black/5 px-3 py-2 align-middle bg-gradient-to-b from-[#fff7ed] to-white"
                    >
                      <div className="flex flex-col items-center justify-center min-h-[48px]">
                        <Calendar size={12} className="text-[#FF8C00] mb-1" />
                        <span className="text-[10px] font-black uppercase text-[#0f172a] tracking-wide">{day.slice(0, 3)}</span>
                        <span className="text-[8px] font-bold text-[#94a3b8]">{day}</span>
                      </div>
                    </td>
                  )}
                  <td className="sticky left-[72px] z-10 border-r border-b border-black/5 px-2 py-2 text-center bg-white group-hover:bg-[#fafbfc]">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF8C00] to-[#FF5E00] text-white text-[11px] font-black shadow-sm">
                      {stream.stream}
                    </span>
                  </td>
                  {allPeriods.map((period) => {
                    const slotType = classifySlot(period);
                    const colKey = `${day}-${stream.stream}-${period.start_time}-${period.period_name}`;

                    if (slotType !== 'teaching') {
                      if (streamIdx !== 0) return null;
                      return (
                        <SpecialSlotCell
                          key={colKey}
                          period={period}
                          slotType={slotType}
                          rowSpan={streams.length}
                          streamsCount={streams.length}
                        />
                      );
                    }

                    const key = `${day}__${stream.stream}__${normalizeTime(period.start_time)}`;
                    const lesson = lessonLookup.get(key);
                    const isExtra = Boolean(lesson?.extra_activity_id);
                    const pal = lesson
                      ? (isExtra
                        ? { bg: EXTRA_ACTIVITY_STYLE.bg, border: EXTRA_ACTIVITY_STYLE.border, title: EXTRA_ACTIVITY_STYLE.title, abbr: EXTRA_ACTIVITY_STYLE.abbr }
                        : paletteForSubject(lesson.subject_name))
                      : null;

                    return (
                      <td key={colKey} className="border-r border-b border-black/5 p-1 align-top">
                        {lesson ? (
                          <div
                            className="rounded-lg px-1.5 py-1.5 min-h-[44px] flex flex-col justify-center border shadow-sm transition hover:scale-[1.02]"
                            style={{ backgroundColor: pal.bg, borderColor: pal.border }}
                            title={isExtra
                              ? `${lesson.subject_name} · ${fmt12(normalizeTime(lesson.start_time))}–${fmt12(normalizeTime(lesson.end_time))}`
                              : `${lesson.subject_name}${lesson.teacher_name ? ` · ${lesson.teacher_name}` : ''}`}
                          >
                            <p className="text-[10px] font-black uppercase leading-tight text-center" style={{ color: pal.title }}>
                              {abbrSubject(lesson.subject_name)}
                            </p>
                            {isExtra && (
                              <p className="text-[7px] font-bold text-center mt-0.5 opacity-70" style={{ color: pal.abbr }}>
                                {fmt12(normalizeTime(lesson.start_time))}
                              </p>
                            )}
                            {!isExtra && lesson.teacher_name && (
                              <p className="text-[8px] font-bold text-center mt-0.5 opacity-70" style={{ color: pal.abbr }}>
                                {teacherInitials(lesson.teacher_name)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg min-h-[44px] bg-[#f8fafc] border border-dashed border-[#e2e8f0]" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-black/5 bg-[#f8fafc] flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-[#94a3b8]">
          <Clock size={11} /> Schedule slots
        </div>
        {specialCounts.break > 0 && (
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg border" style={{ backgroundColor: SLOT_STYLES.break.bg, borderColor: SLOT_STYLES.break.border, color: SLOT_STYLES.break.title }}>
            {specialCounts.break} break{specialCounts.break !== 1 ? 's' : ''}
          </span>
        )}
        {specialCounts.lunch > 0 && (
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg border" style={{ backgroundColor: SLOT_STYLES.lunch.bg, borderColor: SLOT_STYLES.lunch.border, color: SLOT_STYLES.lunch.title }}>
            {specialCounts.lunch} lunch
          </span>
        )}
        {specialCounts.correction > 0 && (
          <span className="text-[9px] font-bold px-2 py-1 rounded-lg border" style={{ backgroundColor: SLOT_STYLES.correction.bg, borderColor: SLOT_STYLES.correction.border, color: SLOT_STYLES.correction.title }}>
            {specialCounts.correction} correction
          </span>
        )}
        <span className="text-[9px] font-bold text-[#64748b]">
          {teachingPeriods.length} teaching periods · {displayDays.length} days
        </span>
      </div>
    </div>
  );
}
