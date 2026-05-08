import { Link } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import { h } from '../utils/href';

/**
 * Landing for lesson-plan reporting in DOS. Teachers generate plans in Ticha AI;
 * school-wide exports may be added later.
 */
export default function LessonPlanReportsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000435]/50 mb-2">Teachers reports</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#000435] tracking-tight">Lesson plan reports</h1>
        <p className="text-sm text-[#000435]/70 font-bold mt-2 leading-relaxed">
          Create and refine lesson plans with Ticha AI. Use this area for school-level lesson plan reviews and
          exports as your workflow grows.
        </p>
      </div>

      <Link
        to={h('/ticha-ai')}
        className="flex items-center gap-3 p-4 rounded-2xl border border-[#000435]/10 bg-white shadow-sm hover:border-amber-300/50 transition-colors"
      >
        <div className="p-3 rounded-xl bg-[#000435]/10 text-[#000435]">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-sm font-black text-[#000435] uppercase tracking-tight">Open Ticha AI</p>
          <p className="text-xs text-[#000435]/60 font-bold mt-0.5">Auto-lesson plan and teaching assistant</p>
        </div>
        <FileText className="ml-auto shrink-0 text-[#000435]/30" size={18} />
      </Link>
    </div>
  );
}
