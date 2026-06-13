/** Valid persisted academic_timetables.id (> 0). */
export function resolveTimetableRowId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function normalizeTimetableTime(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const parts = raw.split(':');
  if (parts.length < 2) return raw;
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

/** Stable drag id — avoids collisions when multiple rows share id 0 / null. */
export function timetableLessonDragId(lesson) {
  const rowId = resolveTimetableRowId(lesson?.id);
  if (rowId) return `lesson-${rowId}`;
  return [
    'lesson',
    String(lesson?.class_name || '').trim(),
    String(lesson?.day_of_week || '').trim(),
    normalizeTimetableTime(lesson?.start_time),
    String(lesson?.subject_name || '').trim(),
    String(lesson?.staff_id || '').trim(),
  ].join('__');
}
