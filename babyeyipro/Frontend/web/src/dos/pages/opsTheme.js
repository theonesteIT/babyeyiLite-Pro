/** Shared Operations Command Center palette — white, #000435, amber only */
export const NAVY = '#000435';
export const AMBER = '#f59e0b';

export const STATUS_META = {
  live: { label: 'LESSON LIVE', dot: 'bg-[#f59e0b]', card: 'bg-amber-50 border-amber-300 ring-amber-200' },
  teaching: { label: 'TEACHING', dot: 'bg-[#f59e0b]', card: 'bg-amber-50 border-amber-300 ring-amber-200' },
  late: { label: 'LATE', dot: 'bg-[#f59e0b]', card: 'bg-amber-50/80 border-amber-400 ring-amber-200' },
  missing: { label: 'NO TEACHER', dot: 'bg-[#000435]', card: 'bg-white border-[#000435]/30 ring-[#000435]/10' },
  waiting: { label: 'WAITING', dot: 'bg-[#000435]/40', card: 'bg-white border-[#000435]/15 ring-[#000435]/5' },
  break: { label: 'BREAK', dot: 'bg-[#000435]/25', card: 'bg-[#000435]/[0.03] border-[#000435]/10' },
  completed: { label: 'DONE', dot: 'bg-[#000435]', card: 'bg-[#000435]/[0.04] border-[#000435]/20' },
  scheduled: { label: 'SCHEDULED', dot: 'bg-[#000435]/30', card: 'bg-white border-[#000435]/10' },
  expected: { label: 'EXPECTED', dot: 'bg-[#f59e0b]/60', card: 'bg-white border-amber-200' },
};
