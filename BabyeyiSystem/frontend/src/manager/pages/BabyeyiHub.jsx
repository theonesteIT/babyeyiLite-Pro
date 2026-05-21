import React from 'react';
import { BookOpenCheck, FilePlus2, ListChecks, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { h } from '../utils/href';

const modules = [
  {
    title: 'Babyeyi Wizard',
    desc: 'Create a new babyeyi document in guided steps.',
    to: h('/finance/wizard'),
    icon: FilePlus2,
  },
  {
    title: 'Babyeyi Registry',
    desc: 'View and manage all generated babyeyi records.',
    to: h('/school-console?tab=babyeyi'),
    icon: BookOpenCheck,
  },
  {
    title: 'Babyeyi List',
    desc: 'Quick list view for filtering and review.',
    to: h('/school-console?tab=babyeyi_list'),
    icon: ListChecks,
  },
  {
    title: 'School Console',
    desc: 'Open full school manager console modules.',
    to: h('/school-console?tab=dashboard'),
    icon: Settings2,
  },
];

export default function BabyeyiHub() {
  return (
    <div className="min-h-screen bg-re-bg p-4 sm:p-6 lg:p-8">
      <div className="rounded-3xl border border-black/5 bg-white shadow-sm p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-re-orange font-semibold">Babyeyi workspace</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1E3A5F] mt-2">Babyeyi Professional Hub</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          Access babyeyi creation, registry, and school-console tools from one place.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((module) => (
            <Link
              key={module.title}
              to={module.to}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:shadow-md transition-all"
            >
              <module.icon size={18} className="text-[#1E3A5F]" />
              <p className="mt-2 text-sm font-semibold text-[#1E3A5F]">{module.title}</p>
              <p className="mt-1 text-xs text-slate-500">{module.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
