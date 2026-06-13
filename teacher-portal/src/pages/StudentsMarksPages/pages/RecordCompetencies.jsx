import { useState } from 'react';
import { Award, Plus } from 'lucide-react';
import RecordCompetenciesWizard from '../components/RecordCompetenciesWizard.jsx';

export default function RecordCompetencies() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState(null);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-[0_4px_24px_rgba(0,4,53,0.06)] p-8 md:p-10">
        <div className="max-w-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[#000435]/5 flex items-center justify-center mb-5">
            <Award size={26} className="text-[#ff8c00]" />
          </div>
          <h3 className="text-xl font-semibold text-[#000435] mb-2">Competency analysis</h3>
          <p className="text-sm text-[#000435]/55 leading-relaxed mb-6">
            Rate CBC competencies for your assigned class — categories are configured by DOS
            (Communication, Problem Solving, Research Skills, Leadership, etc.).
          </p>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-[#ff8c00] hover:bg-[#e67e00] transition-colors shadow-sm"
          >
            <Plus size={18} />
            Record competencies
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}

      <RecordCompetenciesWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setToast('Competency ratings saved.');
          setTimeout(() => setToast(null), 3000);
        }}
      />
    </div>
  );
}
