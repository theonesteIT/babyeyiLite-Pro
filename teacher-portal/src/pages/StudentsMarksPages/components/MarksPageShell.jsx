import { GraduationCap } from 'lucide-react';
import { MARKS_AMBER, MARKS_NAVY } from '../marksTheme';

/**
 * Wraps each marks module page inside the main teacher portal layout.
 * Provides a consistent hero + content area without a nested sidebar.
 */
export default function MarksPageShell({ title, subtitle, badge, actions, children }) {
  return (
    <div className="marks-hub animate-in fade-in duration-500 pb-10">
      <section
        className="relative overflow-hidden rounded-2xl md:rounded-3xl mb-6"
        style={{ background: `linear-gradient(135deg, ${MARKS_NAVY} 0%, #0a116b 55%, #001380 100%)` }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/[0.04] blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 px-5 py-6 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/15"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <GraduationCap size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-medium uppercase tracking-[0.12em] mb-1"
                style={{ color: MARKS_AMBER }}
              >
                Marks &amp; Exams
              </p>
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight truncate">{title}</h1>
              {subtitle && (
                <p className="text-sm text-white/55 mt-1 max-w-xl">{subtitle}</p>
              )}
              {badge && (
                <span className="inline-block mt-2 px-3 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wide bg-white/10 text-white/90 border border-white/15">
                  {badge}
                </span>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
      </section>

      <div className="marks-hub-content space-y-6">{children}</div>
    </div>
  );
}
