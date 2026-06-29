import React from 'react';
import { Building2, ClipboardList, Wallet } from 'lucide-react';

const TABS = [
  { id: 'requests', label: 'Payroll requests', short: 'Requests', Icon: ClipboardList },
  { id: 'tracker', label: 'Payment tracker', short: 'Tracker', Icon: Wallet },
  { id: 'bankRegister', label: 'Bank register', short: 'Bank', Icon: Building2 },
];

export default function PayrollWorkspaceTabs({ active, onChange, className = '' }) {
  return (
    <nav
      className={`flex gap-1 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 overflow-x-auto ${className}`}
      role="tablist"
      aria-label="Payroll sections"
    >
      {TABS.map((t) => {
        const Icon = t.Icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`flex-1 sm:flex-none min-w-[7.5rem] flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition touch-manipulation ${
              isActive
                ? 'bg-[#000435] text-[#FEBF10] shadow-sm'
                : 'text-slate-500 hover:bg-white hover:text-[#000435]'
            }`}
          >
            <Icon size={14} className="shrink-0" aria-hidden />
            <span className="sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
