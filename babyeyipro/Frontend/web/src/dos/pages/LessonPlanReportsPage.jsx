import { Link } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import { h } from '../utils/href';
import DosOrangePageHero, { DosPageBody } from '../components/DosOrangePageHero';

/**
 * Landing for lesson-plan reporting in DOS. Teachers generate plans in Ticha AI;
 * school-wide exports may be added later.
 */
export default function LessonPlanReportsPage() {
  return (
    <>
      <DosOrangePageHero
        title="Lesson plan reports"
        subtitle="Create and refine lesson plans with Ticha AI. Use this area for school-level reviews and exports as your workflow grows."
      />
      <DosPageBody className="-mt-4 sm:-mt-5 md:-mt-6 pb-10">
        <div className="max-w-2xl mx-auto space-y-5">
          <Link
            to={h('/ticha-ai')}
            className="flex items-center gap-3 p-4 rounded-[28px] border border-black/10 bg-white shadow-sm hover:border-amber-300/40 transition-colors"
          >
            <div className="p-3 rounded-xl bg-slate-100 text-[#0f2247]">
              <Sparkles size={22} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-[#0f2247] tracking-tight">Open Ticha AI</p>
              <p className="text-xs text-slate-600 font-normal mt-0.5">Auto-lesson plan and teaching assistant</p>
            </div>
            <FileText className="ml-auto shrink-0 text-slate-300" size={18} strokeWidth={1.75} />
          </Link>
        </div>
      </DosPageBody>
    </>
  );
}
