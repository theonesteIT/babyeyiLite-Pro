import { SB_FONT_FAMILY } from '../utils/schoolBudgetTypography';

/** Consistent page padding + Montserrat for school budget module pages. */
export default function SchoolBudgetPageShell({ children, className = '' }) {
  return (
    <div
      className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-10 font-sans ${className}`.trim()}
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {children}
    </div>
  );
}
