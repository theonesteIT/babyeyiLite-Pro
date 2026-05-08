/**
 * termProgress.js — helpers for term-based attendance progress bars.
 *
 * Working days = Mon–Fri (public holidays not excluded — they are
 * handled by the manager through the term end date).
 */

/** Count Mon–Fri days between two YYYY-MM-DD strings (inclusive). */
export function countWorkingDays(startStr, endStr) {
    if (!startStr || !endStr) return 0;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    let count = 0;
    const cur = new Date(s);
    cur.setHours(0, 0, 0, 0);
    const fin = new Date(e);
    fin.setHours(0, 0, 0, 0);
    while (cur <= fin) {
        const d = cur.getDay();
        if (d !== 0 && d !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/**
 * Calculate term progress stats given a term date config and today.
 *
 * @param {{ name: string, start: string, end: string } | null} termCfg
 * @param {string} [todayStr]  YYYY-MM-DD, defaults to today
 * @returns {{
 *   configured: boolean,
 *   totalWorkingDays: number,
 *   elapsedWorkingDays: number,
 *   termProgressPct: number,   // % of term elapsed (0–100)
 *   remainingWorkingDays: number,
 *   start: string,
 *   end: string,
 * }}
 */
export function calcTermProgress(termCfg, todayStr) {
    const empty = {
        configured: false,
        totalWorkingDays: 0,
        elapsedWorkingDays: 0,
        termProgressPct: 0,
        remainingWorkingDays: 0,
        start: '',
        end: '',
    };
    if (!termCfg || !termCfg.start || !termCfg.end) return empty;

    const today  = new Date(todayStr || new Date().toISOString().split('T')[0]);
    const tStart = new Date(termCfg.start);
    const tEnd   = new Date(termCfg.end);

    const elapsedEnd = today < tStart ? tStart : today > tEnd ? tEnd : today;

    const total   = countWorkingDays(termCfg.start, termCfg.end);
    const elapsed = countWorkingDays(termCfg.start, elapsedEnd.toISOString().split('T')[0]);
    const pct     = total > 0 ? Math.round((elapsed / total) * 100) : 0;

    return {
        configured: true,
        totalWorkingDays: total,
        elapsedWorkingDays: elapsed,
        termProgressPct: pct,
        remainingWorkingDays: Math.max(0, total - elapsed),
        start: termCfg.start,
        end:   termCfg.end,
    };
}

/**
 * Calculate attendance rate.
 * @param {number} presentDays  days the person was present
 * @param {number} elapsedDays  total working days elapsed so far
 * @returns {number} 0–100
 */
export function attendanceRate(presentDays, elapsedDays) {
    if (!elapsedDays || elapsedDays <= 0) return 0;
    return Math.min(100, Math.round((presentDays / elapsedDays) * 100));
}

/** Tailwind colour class based on rate value. */
export function rateColor(rate) {
    if (rate >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500/20', bg: 'bg-emerald-50' };
    if (rate >= 75) return { bar: 'bg-[#FEBF10]',   text: 'text-amber-600',   ring: 'ring-amber-500/20',  bg: 'bg-amber-50' };
    return            { bar: 'bg-red-500',           text: 'text-red-600',     ring: 'ring-red-500/20',    bg: 'bg-red-50' };
}
