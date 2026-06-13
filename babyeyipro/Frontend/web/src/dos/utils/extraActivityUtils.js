/** Slot math for extra activities (homework, debate, etc.) — separate from lesson generation */

export const EXTRA_ACTIVITY_STYLE = {
  bg: '#fdf4ff',
  border: '#e879f9',
  title: '#86198f',
  abbr: '#a21caf',
  label: 'EXTRA',
};

export const normalizeTime = (v) => {
  const r = String(v || '').trim();
  if (!r) return '';
  const p = r.split(':');
  return p.length < 2 ? r : `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
};

export const timeToMins = (t) => {
  const [h, m] = String(t || '00:00').slice(0, 5).split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

export const timesOverlap = (startA, endA, startB, endB) =>
  timeToMins(startA) < timeToMins(endB) && timeToMins(startB) < timeToMins(endA);

export const fmt12 = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export function parseActivityDays(activity) {
  if (Array.isArray(activity?.days)) return activity.days.filter(Boolean);
  if (typeof activity?.days_json === 'string') {
    try { return JSON.parse(activity.days_json).filter(Boolean); } catch { return []; }
  }
  if (activity?.day_of_week) return [activity.day_of_week];
  return [];
}

export function getTeachingSlots(periods = []) {
  return periods.filter((p) => !p.is_break && !String(p.period_name || '').toLowerCase().match(/break|lunch|correction|free/));
}

export function countTeachingSlotsPerWeek(periods = [], activeDays = []) {
  const teaching = getTeachingSlots(periods);
  const days = activeDays?.length ? activeDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  return teaching.length * days.length;
}

export function slotsOverlappingRange(teachingSlots, startTime, endTime) {
  return teachingSlots.filter((s) =>
    timesOverlap(normalizeTime(s.start_time), normalizeTime(s.end_time), startTime, endTime)
  );
}

export function activityWeeklySlotCount(activity, teachingSlots, activeDays) {
  const days = parseActivityDays(activity);
  const start = normalizeTime(activity.start_time);
  const end = normalizeTime(activity.end_time);
  let count = 0;
  for (const day of days) {
    if (activeDays?.length && !activeDays.includes(day)) continue;
    count += slotsOverlappingRange(teachingSlots, start, end).length;
  }
  return count;
}

export function activityAppliesToClass(activity, className) {
  const cn = String(activity?.class_name || '').trim();
  if (!cn || cn === '*' || cn.toUpperCase() === 'ALL') return true;
  return cn === String(className || '').trim();
}

export function sumAssignedPeriods(assignments, className) {
  return (assignments || [])
    .filter((a) => String(a.class_name || '').trim() === String(className || '').trim())
    .reduce((s, a) => s + (Number(a.periods_per_week) || 0), 0);
}

export function sumExtraActivitySlots(activities, className, teachingSlots, activeDays, excludeId = null) {
  return (activities || [])
    .filter((a) => activityAppliesToClass(a, className) && a.id !== excludeId)
    .reduce((s, a) => s + activityWeeklySlotCount(a, teachingSlots, activeDays), 0);
}

export function buildClassCapacitySummary({
  className,
  assignments = [],
  activities = [],
  periods = [],
  activeDays = [],
  timetableRows = [],
  excludeActivityId = null,
}) {
  const teachingSlots = getTeachingSlots(periods);
  const teachingSlotsPerWeek = countTeachingSlotsPerWeek(periods, activeDays);
  const assignedPeriods = sumAssignedPeriods(assignments, className);
  const extraSlotsUsed = sumExtraActivitySlots(activities, className, teachingSlots, activeDays, excludeActivityId);
  const lessonSlotsUsed = (timetableRows || []).filter(
    (r) => String(r.class_name || '').trim() === String(className || '').trim()
  ).length;
  const remainingForExtra = Math.max(0, teachingSlotsPerWeek - assignedPeriods - extraSlotsUsed);
  const balanced = assignedPeriods + extraSlotsUsed <= teachingSlotsPerWeek;

  return {
    className,
    teachingSlotsPerWeek,
    teachingPeriodsPerDay: teachingSlots.length,
    activeDaysCount: (activeDays || []).length,
    assignedPeriods,
    extraSlotsUsed,
    lessonSlotsUsed,
    remainingForExtra,
    totalCommitted: assignedPeriods + extraSlotsUsed,
    balanced,
    overCapacity: assignedPeriods + extraSlotsUsed > teachingSlotsPerWeek,
  };
}

export function findActivityConflicts({
  className,
  days = [],
  startTime,
  endTime,
  activities = [],
  timetableRows = [],
  excludeId = null,
}) {
  const conflicts = [];
  const start = normalizeTime(startTime);
  const end = normalizeTime(endTime);

  for (const day of days) {
    for (const act of activities) {
      if (act.id === excludeId) continue;
      if (!activityAppliesToClass(act, className)) continue;
      const actDays = parseActivityDays(act);
      if (!actDays.includes(day)) continue;
      if (timesOverlap(start, end, act.start_time, act.end_time)) {
        conflicts.push({
          type: 'extra_overlap',
          day,
          message: `Overlaps "${act.activity_name}" (${fmt12(act.start_time)}–${fmt12(act.end_time)})`,
          activity: act.activity_name,
        });
      }
    }

    for (const row of timetableRows) {
      if (String(row.class_name || '').trim() !== String(className || '').trim()) continue;
      if (row.day_of_week !== day) continue;
      if (timesOverlap(start, end, row.start_time, row.end_time)) {
        conflicts.push({
          type: 'lesson_overlap',
          day,
          message: `Overlaps scheduled ${row.subject_name} (${fmt12(row.start_time)}–${fmt12(row.end_time)})`,
          subject: row.subject_name,
        });
      }
    }
  }

  return conflicts;
}

export function suggestFreeSlots({
  className,
  days = [],
  teachingSlots = [],
  activities = [],
  timetableRows = [],
}) {
  const suggestions = [];
  for (const day of days) {
    for (const slot of teachingSlots) {
      const start = normalizeTime(slot.start_time);
      const end = normalizeTime(slot.end_time);
      const hasLesson = (timetableRows || []).some(
        (r) => r.class_name === className && r.day_of_week === day
          && timesOverlap(start, end, r.start_time, r.end_time)
      );
      const hasExtra = (activities || []).some((a) => {
        if (!activityAppliesToClass(a, className)) return false;
        return parseActivityDays(a).includes(day)
          && timesOverlap(start, end, a.start_time, a.end_time);
      });
      if (!hasLesson && !hasExtra) {
        suggestions.push({
          day,
          start_time: start,
          end_time: end,
          period_name: slot.period_name,
          label: `${day} · ${fmt12(start)}–${fmt12(end)} (${slot.period_name || 'Period'})`,
        });
      }
    }
  }
  return suggestions.slice(0, 8);
}

export function validateNewActivity({
  className,
  days = [],
  startTime,
  endTime,
  assignments = [],
  activities = [],
  periods = [],
  activeDays = [],
  timetableRows = [],
  excludeId = null,
}) {
  const teachingSlots = getTeachingSlots(periods);
  const slotsNeeded = days.reduce(
    (s, day) => s + slotsOverlappingRange(teachingSlots, startTime, endTime).length,
    0
  );
  const capacity = buildClassCapacitySummary({
    className,
    assignments,
    activities,
    periods,
    activeDays,
    timetableRows,
    excludeActivityId: excludeId,
  });
  const conflicts = findActivityConflicts({
    className,
    days,
    startTime,
    endTime,
    activities,
    timetableRows,
    excludeId,
  });

  const ok = conflicts.length === 0 && slotsNeeded > 0 && slotsNeeded <= capacity.remainingForExtra;

  const messages = [];
  if (slotsNeeded === 0) {
    messages.push('Selected time does not match any teaching period on the grid. Adjust times to align with period slots.');
  }
  if (slotsNeeded > capacity.remainingForExtra) {
    messages.push(
      `Not enough free slots: need ${slotsNeeded}, only ${capacity.remainingForExtra} available (${capacity.assignedPeriods} lessons + ${capacity.extraSlotsUsed} extra already committed of ${capacity.teachingSlotsPerWeek} weekly slots).`
    );
  }
  if (conflicts.length) {
    messages.push(`${conflicts.length} conflict(s) detected on the selected days.`);
  }

  const suggestions = !ok
    ? suggestFreeSlots({
      className,
      days: activeDays?.length ? activeDays : days,
      teachingSlots,
      activities,
      timetableRows,
    })
    : [];

  return { ok, slotsNeeded, capacity, conflicts, messages, suggestions };
}

export function activityGroupKey(act) {
  const days = [...parseActivityDays(act)].sort().join('|');
  return [
    String(act.activity_name || '').trim().toUpperCase(),
    normalizeTime(act.start_time),
    normalizeTime(act.end_time),
    days,
    String(act.term || '').trim(),
    String(act.academic_year || '').trim(),
  ].join('__');
}

export function groupExtraActivities(activities = []) {
  const groups = new Map();
  for (const act of activities) {
    const key = activityGroupKey(act);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        activity_name: act.activity_name,
        start_time: act.start_time,
        end_time: act.end_time,
        days: parseActivityDays(act),
        term: act.term || '',
        academic_year: act.academic_year || '',
        notes: act.notes || '',
        items: [],
      });
    }
    groups.get(key).items.push(act);
  }
  return [...groups.values()].sort((a, b) => {
    const nameCmp = String(a.activity_name || '').localeCompare(String(b.activity_name || ''));
    if (nameCmp) return nameCmp;
    return normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time));
  });
}

export function buildExtraActivityLookup(activities, className, teachingSlots) {
  const map = new Map();
  for (const act of activities || []) {
    if (!activityAppliesToClass(act, className)) continue;
    const days = parseActivityDays(act);
    for (const day of days) {
      for (const slot of slotsOverlappingRange(teachingSlots, act.start_time, act.end_time)) {
        const key = `${day}__${normalizeTime(slot.start_time)}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({ ...act, slot_start: slot.start_time, slot_end: slot.end_time });
      }
    }
  }
  return map;
}
