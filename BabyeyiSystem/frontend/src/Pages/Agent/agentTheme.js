/** Agent portal — clean white shell, navy + amber accents (School Manager parity) */
import { BABYEYI_FONT_STACK, BABYEYI_NAVY, BABYEYI_PAGE_BG } from "../../theme/babyeyiDashboardTheme";

export const ACCENT_SLATE = BABYEYI_NAVY;
export const AGENT_PAGE_BG = BABYEYI_PAGE_BG;

export const pageShell = "space-y-5 sm:space-y-6";
export const pageCard = "bg-white border border-slate-200 rounded-2xl shadow-sm";
export const pageCardPad = `${pageCard} p-4 sm:p-5`;
export const tableShell = `${pageCard} overflow-hidden`;
export const pageTitle = "text-2xl sm:text-3xl font-bold text-[#000435] tracking-tight";
export const pageSubtitle = "text-sm text-slate-600 mt-1 font-medium max-w-2xl";

export const tableHeadRow = "bg-slate-50 border-b border-slate-200";
export const tableHeadCell =
  "text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 py-3 px-4 whitespace-nowrap";
export const tableBodyRow = "border-b border-slate-100 hover:bg-slate-50/80 transition-colors";
export const tableBodyCell = "py-3 px-4 text-sm text-slate-800";

export const inputClass =
  "w-full bg-white border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm font-medium " +
  "placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100/80 transition-all min-h-[44px]";

export const selectClass =
  "w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900 min-h-[44px] " +
  "focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100/80";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-bold text-white " +
  "hover:bg-[#000a50] transition-colors min-h-[44px] disabled:opacity-50";

export const btnAmber =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#000435] " +
  "hover:bg-amber-500 transition-colors min-h-[44px] disabled:opacity-50 shadow-sm";

export const labelClass = "block text-[11px] font-semibold text-[#000435] mb-1.5";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 " +
  "hover:bg-slate-50 transition-colors min-h-[44px]";

/** @deprecated use pageCard — kept for gradual migration */
export const cardBorder = "border border-slate-200";

export const agentFontStyle = { fontFamily: BABYEYI_FONT_STACK };
