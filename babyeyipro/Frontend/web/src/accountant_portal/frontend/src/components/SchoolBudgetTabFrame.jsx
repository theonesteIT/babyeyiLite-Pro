import { Loader2, FileText } from "lucide-react";
import BudgetSelectorPanel from "./BudgetSelectorPanel";
import { useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import { SB_FONT_FAMILY, sbPageTitleClass, sbPageSubtitleClass } from '../utils/schoolBudgetTypography';

export default function SchoolBudgetTabFrame({ title, subtitle, fmt, children, requireBudget = true }) {
  const { budgetId, setBudgetId, loading, error, reload, activeBudget } = useSchoolBudgetData();

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 font-sans" style={{ fontFamily: SB_FONT_FAMILY }}>
      <header className="mb-5">
        <h2 className={sbPageTitleClass}>{title}</h2>
        {subtitle ? <p className={sbPageSubtitleClass}>{subtitle}</p> : null}
      </header>

      <div className="mb-5">
        <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={setBudgetId} fmt={fmt} />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800 flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg bg-white border border-red-100 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-red-700 hover:bg-red-50 transition"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-12 gap-2">
          <Loader2 size={32} className="text-[#F59E0B] animate-spin" />
          <span className="text-[11px] font-medium text-slate-500">Loading…</span>
        </div>
      ) : requireBudget && !activeBudget ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-[#000435]">Select a budget</p>
          <p className="text-[11px] font-medium text-slate-500 mt-2">
            Choose a school budget above to view this section.
          </p>
        </div>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );
}
