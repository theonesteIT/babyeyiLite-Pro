'use strict';

const { promisePool } = require('../config/database');

function parseYmd(val) {
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
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86400000);
}

/**
 * Derive status + progress from planned_start / planned_end for a given calendar day.
 * Returns null when timeline should not override (cancelled, manual override, missing dates).
 */
function computeActivityTimeline(plannedStart, plannedEnd, asOf = new Date(), options = {}) {
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

async function ensureActivityTimelineColumns() {
  await promisePool.query(
    'ALTER TABLE school_action_plan_activities ADD COLUMN status_manual_override TINYINT(1) NOT NULL DEFAULT 0'
  ).catch(() => {});
}

async function syncSchoolActivityTimeline(schoolId, { planId = null, activityId = null } = {}) {
  await ensureActivityTimelineColumns();
  let sql = `
    SELECT id, planned_start, planned_end, status, progress_pct, status_manual_override
    FROM school_action_plan_activities
    WHERE school_id = ? AND deleted_at IS NULL`;
  const params = [schoolId];
  if (planId) {
    sql += ' AND action_plan_id = ?';
    params.push(planId);
  }
  if (activityId) {
    sql += ' AND id = ?';
    params.push(activityId);
  }
  const [rows] = await promisePool.query(sql, params);
  let updated = 0;
  for (const row of rows || []) {
    if (Number(row.status_manual_override)) continue;
    const computed = computeActivityTimeline(row.planned_start, row.planned_end, new Date(), {
      storedStatus: row.status,
      manualOverride: false,
    });
    if (!computed) continue;
    const curStatus = String(row.status || '').toLowerCase();
    const curPct = Number(row.progress_pct || 0);
    if (computed.status === curStatus && computed.progressPct === curPct) continue;
    await promisePool.query(
      `UPDATE school_action_plan_activities SET status = ?, progress_pct = ? WHERE id = ? AND school_id = ?`,
      [computed.status, computed.progressPct, row.id, schoolId]
    );
    updated += 1;
  }
  return updated;
}

async function processAllSchoolsActivityTimeline() {
  await ensureActivityTimelineColumns();
  const [schools] = await promisePool.query(
    `SELECT DISTINCT school_id FROM school_action_plan_activities WHERE deleted_at IS NULL`
  );
  for (const s of schools || []) {
    if (s.school_id) {
      await syncSchoolActivityTimeline(s.school_id).catch((e) => {
        console.warn('[action-plan-timeline]', s.school_id, e.message);
      });
    }
  }
}

module.exports = {
  parseYmd,
  computeActivityTimeline,
  ensureActivityTimelineColumns,
  syncSchoolActivityTimeline,
  processAllSchoolsActivityTimeline,
};
