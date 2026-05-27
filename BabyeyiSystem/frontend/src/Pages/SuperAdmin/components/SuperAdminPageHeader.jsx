/**
 * Page header for Super Admin routed pages (shell already provides sidebar + top bar).
 */
import { BABYEYI_FONT_STACK, BABYEYI_NAVY } from '../../../theme/babyeyiDashboardTheme';

export default function SuperAdminPageHeader({ title, subtitle, icon: Icon, actions }) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-[#000435] truncate flex items-center gap-2">
            {Icon ? <Icon className="w-5 h-5 text-amber-500 shrink-0" /> : null}
            {title}
          </h1>
          {subtitle ? <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export { BABYEYI_NAVY };
