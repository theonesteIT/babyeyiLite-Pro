import { useState } from 'react';
import { ClipboardList, Plus, BookOpen, Zap, Keyboard, Save } from 'lucide-react';
import RecordMarksWizard from '../components/RecordMarksWizard.jsx';

const FEATURES = [
  { icon: BookOpen, title: 'Teaching assignments', desc: 'Pick from your timetable — no hunting through all courses.' },
  { icon: Zap, title: 'Smart suggestions', desc: 'Assessment names and DOS weights applied automatically.' },
  { icon: Keyboard, title: 'Fast entry', desc: 'Enter to move, arrow keys, bulk paste from Excel.' },
  { icon: Save, title: 'Auto-save drafts', desc: 'Never lose data — drafts save every 5 seconds.' },
];

export default function RecordMarks() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_4px_24px_rgba(0,4,53,0.06)] p-8 md:p-10">
        <div className="max-w-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#000435]/5 flex items-center justify-center mb-5">
            <ClipboardList size={26} className="text-[#ff8c00]" />
          </div>
          <h3 className="text-xl font-semibold text-[#000435] mb-2">Record marks</h3>
          <p className="text-sm text-[#000435]/55 leading-relaxed mb-6">
            A guided 4-step flow: select your teaching assignment, create an assessment using DOS assessment types,
            enter marks with keyboard shortcuts, then review and publish.
          </p>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-[#ff8c00] hover:bg-[#e67e00] transition-colors shadow-sm"
          >
            <Plus size={18} />
            Record marks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <Icon size={20} className="text-[#ff8c00] mb-3" />
            <p className="text-sm font-medium text-[#000435]">{title}</p>
            <p className="text-xs text-[#000435]/45 mt-1 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#000435]/8 bg-[#000435]/[0.02] px-5 py-4">
        <p className="text-xs font-medium text-[#000435]/55 mb-2">Recommended workflow</p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-[#000435]/45">
          {['Teaching assignment', 'Create assessment', 'Enter marks', 'Review & publish'].map((s, i, arr) => (
            <span key={s} className="inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-white border border-black/6 text-[#000435]/70">{i + 1}. {s}</span>
              {i < arr.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
      </div>

      <RecordMarksWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
