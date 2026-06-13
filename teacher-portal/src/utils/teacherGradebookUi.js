/**
 * Same rules as backend `gradebookLabels.normalizeGradebookLabel`:
 * trim + single spaces between tokens (SQL layer also lowercases for matching).
 */
export function normalizeGradebookLabel(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

/** Chevron for native selects — matches school-manager StudentWizardModal */
export const TEACHER_SELECT_CHEVRON =
  "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.65rem_center]";

/** Inner-shadow shell (chevron uses bg-image — keep solid bg-re-bg so arrow + inset read cleanly) */
export const teacherInnerSelectCls = `${TEACHER_SELECT_CHEVRON} pr-10 lg:pr-9 w-full outline-none transition-all text-re-text font-medium border border-black/[0.07] bg-re-bg shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12 h-10 lg:h-8 pl-9 lg:pl-7 rounded-xl lg:rounded-lg text-[11px] lg:text-[10px] tracking-normal`;

/** Search field — same inset “well” as wizard-style forms */
export const teacherInnerSearchCls =
  'w-full outline-none transition-all text-re-text font-normal border border-black/[0.07] bg-re-bg shadow-[inset_0_2px_8px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.55)] focus:border-[#1E3A5F]/30 focus:bg-white focus:ring-2 focus:ring-[#1E3A5F]/12 h-10 lg:h-8 pl-10 lg:pl-8 pr-3 rounded-xl lg:rounded-lg text-[11px] lg:text-[10px]';

/** Gradebook score cell — recessed numeric well */
export const teacherInnerScoreCls =
  'w-full min-h-[40px] h-10 lg:h-9 min-w-[3rem] text-center tabular-nums outline-none text-re-text text-[11px] font-medium tracking-tight rounded-lg border border-black/[0.07] bg-white/95 shadow-[inset_0_2px_10px_rgba(15,23,42,0.11),inset_0_-1px_0_rgba(255,255,255,0.65)] focus:border-[#1E3A5F]/28 focus:ring-2 focus:ring-[#1E3A5F]/12 focus:bg-white placeholder:text-re-text-muted/35 transition-all';

/**
 * Subjects for a class: timetable assignments for this teacher, optionally narrowed by
 * School Operations → subject registry links for that class (`/dos/subjects/config`).
 */
export async function buildSubjectsForClass(api, className, timetablePairs) {
  const c = normalizeGradebookLabel(className);
  const fromTt = [
    ...new Set(
      (timetablePairs || [])
        .filter((p) => normalizeGradebookLabel(p.class_name) === c)
        .map((p) => normalizeGradebookLabel(p.subject_name))
        .filter(Boolean)
    ),
  ];
  try {
    const res = await api.get('/dos/subjects/config', { params: { class_name: c } });
    if (res.data.success && Array.isArray(res.data.data) && res.data.data.length) {
      const cfgNames = [
        ...new Set(res.data.data.map((r) => String(r.subject_name || '').trim()).filter(Boolean)),
      ];
      if (fromTt.length && cfgNames.length) {
        const cfgNormSet = new Set(cfgNames.map((n) => normalizeGradebookLabel(n)));
        const inter = fromTt.filter((s) => cfgNormSet.has(normalizeGradebookLabel(s)));
        const pick = inter.length ? inter : fromTt;
        return [...new Set(pick)].sort((a, b) => a.localeCompare(b));
      }
      if (cfgNames.length) {
        return [...new Set(cfgNames.map((n) => normalizeGradebookLabel(n)))].sort((a, b) =>
          a.localeCompare(b)
        );
      }
    }
  } catch {
    /* optional config */
  }
  return fromTt.sort((a, b) => a.localeCompare(b));
}
