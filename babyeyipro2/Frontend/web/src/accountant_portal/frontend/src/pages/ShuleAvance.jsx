import React from 'react';
import ShuleAvanceFinanceApprovals from '../components/ShuleAvanceFinanceApprovals';

export default function ShuleAvance() {
  return (
    <div className="min-h-screen bg-re-bg p-6 md:p-10 space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000435]">Accountant Portal</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#000435] tracking-tight">ShuleAvance Review Desk</h1>
        <p className="text-xs font-bold text-[#000435] mt-1">
          Review teacher requests and route them to the school manager for final approval.
        </p>
      </div>
      <ShuleAvanceFinanceApprovals />
    </div>
  );
}
