import { useState } from 'react';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  HrPageLayout, HrPanel, HrBtnPrimary, HrBtnOutline, HrModal, HrField, HrInput, HrTextarea, HrBtnGhost, HrHeroAction,
} from './hrUi';

const categories = [
  { id: 1, name: 'Teaching Staff', description: 'All academic and instructional staff', count: 142 },
  { id: 2, name: 'Administrative Staff', description: 'Office and administrative support', count: 28 },
  { id: 3, name: 'Support Staff', description: 'Drivers, security, cleaners, etc.', count: 15 },
  { id: 4, name: 'Management', description: 'Directors, heads, and managers', count: 8 },
  { id: 5, name: 'Temporary Staff', description: 'Short-term and seasonal employees', count: 5 },
  { id: 6, name: 'Interns', description: 'Student interns and trainees', count: 2 },
];

const accent = ['border-amber-200', 'border-sky-200', 'border-emerald-200', 'border-violet-200', 'border-orange-200', 'border-teal-200'];
const accentBg = ['bg-amber-50 text-amber-800', 'bg-sky-50 text-sky-800', 'bg-emerald-50 text-emerald-800', 'bg-violet-50 text-violet-800', 'bg-orange-50 text-orange-800', 'bg-teal-50 text-teal-800'];

export default function EmploymentCategories() {
  const [showModal, setShowModal] = useState(false);
  const total = categories.reduce((s, c) => s + c.count, 0);

  const kpiTiles = [
    { icon: Tags, label: 'Categories', value: String(categories.length), subValue: 'Employment types' },
    { icon: Tags, label: 'Total Staff', value: String(total), subValue: 'Across categories' },
  ];

  return (
    <HrPageLayout
      title="Employment Categories"
      subtitle="Organize staff by employment type and role classification"
      HeroIcon={Tags}
      kpiTiles={kpiTiles}
      headerRight={<HrHeroAction icon={Plus} onClick={() => setShowModal(true)}>Create category</HrHeroAction>}
    >
      <div className="flex justify-end sm:hidden">
        <HrBtnPrimary icon={Plus} onClick={() => setShowModal(true)}>Create category</HrBtnPrimary>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((cat, i) => (
          <HrPanel key={cat.id} className="p-5 hover:border-[#FEBF10]/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wide border ${accent[i % accent.length]} ${accentBg[i % accentBg.length]}`} style={{ fontWeight: 500 }}>
                {cat.name}
              </span>
              <div className="flex gap-1">
                <HrBtnGhost><Pencil size={14} strokeWidth={1.75} /></HrBtnGhost>
                <HrBtnGhost className="hover:text-red-600"><Trash2 size={14} strokeWidth={1.75} /></HrBtnGhost>
              </div>
            </div>
            <p className="text-slate-500 text-xs mb-4">{cat.description}</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl text-[#000435] tabular-nums" style={{ fontWeight: 500 }}>{cat.count}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide mt-0.5">employees</p>
              </div>
              <p className="text-slate-400 text-xs">{Math.round((cat.count / total) * 100)}% of total</p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-[#FEBF10] rounded-full" style={{ width: `${(cat.count / total) * 100}%` }} />
            </div>
            <button type="button" className="mt-4 w-full py-2 text-xs text-slate-500 rounded-xl border border-slate-200 hover:border-[#c87800]/40 hover:text-[#c87800] transition-colors" style={{ fontWeight: 500 }}>
              View employees
            </button>
          </HrPanel>
        ))}
      </div>

      <HrModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create category"
        footer={
          <>
            <HrBtnOutline className="flex-1" onClick={() => setShowModal(false)}>Cancel</HrBtnOutline>
            <HrBtnPrimary className="flex-1">Create</HrBtnPrimary>
          </>
        }
      >
        <HrField label="Category name" required><HrInput placeholder="e.g. Teaching Staff" /></HrField>
        <HrField label="Description"><HrTextarea rows={3} placeholder="Brief description" /></HrField>
      </HrModal>
    </HrPageLayout>
  );
}
