/** Mirror of backend actionPlanTimeline — status/progress from planned dates. */

export function parseYmd(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  const s = String(val).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function diffCalendarDays(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function computeActivityTimeline(plannedStart, plannedEnd, asOf = new Date(), options = {}) {
  const { storedStatus = 'not_started', manualOverride = false } = options;
  if (manualOverride) return null;
  const st = String(storedStatus || '').toLowerCase().replace(/\s+/g, '_');
  if (st === 'cancelled') return null;

  const start = parseYmd(plannedStart);
  let end = parseYmd(plannedEnd);
  if (!start || !end) return null;
  if (end < start) end = start;

  const today = parseYmd(asOf) || parseYmd(new Date());
  if (!today) return null;

  if (today < start) {
    return { status: 'not_started', progressPct: 0 };
  }
  if (today > end) {
    return { status: 'completed', progressPct: 100 };
  }

  const totalDays = Math.max(1, diffCalendarDays(start, end) + 1);
  const elapsed = Math.min(totalDays, diffCalendarDays(start, today) + 1);
  const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

  if (today.getTime() === end.getTime() || progressPct >= 100) {
    return { status: 'completed', progressPct: 100 };
  }
  return { status: 'ongoing', progressPct };
}

/** Calendar-day label for an activity (not_reached, ongoing, completed, etc.). */
export function getTimelineStatusOnDate(activity, date) {
  const base = String(activity.status || '').toLowerCase().replace(/\s+/g, '_');
  if (base === 'cancelled') return 'cancelled';
  if (base === 'delayed' && activity.statusManualOverride) return 'delayed';

  const start = activity.start instanceof Date ? activity.start : parseYmd(activity.plannedStart || activity.start);
  const end = activity.end instanceof Date ? activity.end : parseYmd(activity.plannedEnd || activity.end);
  const day = parseYmd(date);
  if (!start || !end || !day) return base === 'delayed' ? 'delayed' : 'not_started';

  const tl = computeActivityTimeline(start, end, day, {
    storedStatus: base,
    manualOverride: Boolean(activity.statusManualOverride),
  });

  if (!tl) {
    if (day < start) return 'not_reached';
    if (day > end) {
      if (base === 'completed') return 'completed';
      if (base === 'delayed') return 'delayed';
      return 'past_end';
    }
    if (base === 'completed') return 'completed';
    if (base === 'delayed') return 'delayed';
    if (base === 'ongoing') return 'ongoing';
    return 'not_started';
  }

  if (day < start) return 'not_reached';
  if (tl.status === 'completed') return 'completed';
  if (tl.status === 'ongoing') return 'ongoing';
  return 'not_reached';
}

export function isTimelineDriven(activity) {
  if (activity?.statusManualOverride) return false;
  const st = String(activity?.status || '').toLowerCase();
  if (st === 'cancelled') return false;
  const start = activity.plannedStart || activity.start;
  const end = activity.plannedEnd || activity.end;
  return Boolean(start && end);
}
