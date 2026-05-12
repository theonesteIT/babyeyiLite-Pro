/** Demo data — Budget & expenses (Representative finance) */

export const QUARTERLY_PLAN = [
  { quarter: 'Q1', allocated: 420_000_000, spent: 398_000_000 },
  { quarter: 'Q2', allocated: 440_000_000, spent: 312_000_000 },
  { quarter: 'Q3', allocated: 450_000_000, spent: 186_000_000 },
  { quarter: 'Q4', allocated: 460_000_000, spent: 72_000_000 },
];

export const DEPARTMENT_BUDGETS = [
  { dept: 'Administration', budget: 185_000_000, spent: 162_000_000, color: '#000435' },
  { dept: 'Academic', budget: 320_000_000, spent: 278_000_000, color: '#f59e0b' },
  { dept: 'Operations', budget: 142_000_000, spent: 129_000_000, color: '#10b981' },
  { dept: 'Student services', budget: 98_000_000, spent: 88_000_000, color: '#6366f1' },
  { dept: 'IT & digital', budget: 64_000_000, spent: 41_000_000, color: '#ec4899' },
];

export const EXPENSE_CATEGORIES = [
  { key: 'salaries', label: 'Salaries', budget: 580_000_000, spent: 542_000_000, color: '#000435' },
  { key: 'transport', label: 'Transport', budget: 42_000_000, spent: 38_200_000, color: '#f59e0b' },
  { key: 'maintenance', label: 'Maintenance', budget: 48_000_000, spent: 44_100_000, color: '#10b981' },
  { key: 'feeding', label: 'Feeding', budget: 125_000_000, spent: 118_400_000, color: '#6366f1' },
  { key: 'utilities', label: 'Utilities', budget: 36_000_000, spent: 33_800_000, color: '#ec4899' },
  { key: 'equipment', label: 'Equipment', budget: 72_000_000, spent: 51_000_000, color: '#14b8a6' },
  { key: 'construction', label: 'Construction', budget: 210_000_000, spent: 94_000_000, color: '#d97706' },
];

export const RECENT_EXPENSES = [
  { id: 1, ref: 'EXP-240512', school: 'Kicukiro Academy', category: 'Utilities', vendor: 'REG Ltd', amount: 3_400_000, date: '2026-05-08', status: 'posted' },
  { id: 2, ref: 'EXP-240511', school: 'Gasabo Secondary', category: 'Maintenance', vendor: 'FixPro RW', amount: 1_850_000, date: '2026-05-07', status: 'posted' },
  { id: 3, ref: 'EXP-240510', school: 'Nyarugenge Mixed School', category: 'Feeding', vendor: 'Fresh Foods Co.', amount: 8_200_000, date: '2026-05-06', status: 'pending' },
  { id: 4, ref: 'EXP-240509', school: 'Kigali Primary School A', category: 'Equipment', vendor: 'EduSupply', amount: 4_100_000, date: '2026-05-05', status: 'posted' },
  { id: 5, ref: 'EXP-240508', school: 'Kicukiro Academy', category: 'Transport', vendor: 'FleetCare', amount: 2_300_000, date: '2026-05-04', status: 'posted' },
];

export const APPROVAL_QUEUE = [
  { id: 1, title: 'Laboratory equipment — Phase 2', school: 'Gasabo Secondary', amount: 18_500_000, requester: 'J. Habineza', ageDays: 2 },
  { id: 2, title: 'Boarding kitchen upgrade', school: 'Kicukiro Academy', amount: 42_000_000, requester: 'M. Uwase', ageDays: 5 },
  { id: 3, title: 'Internet backbone renewal', school: 'Network-wide', amount: 9_800_000, requester: 'IT Office', ageDays: 1 },
];

export const PROCUREMENT_TRACKING = [
  { po: 'PO-2026-0142', vendor: 'BuildRight Ltd', school: 'Kicukiro Academy', description: 'Roof repair — Block B', amount: 28_400_000, status: 'in_delivery', eta: 'May 18' },
  { po: 'PO-2026-0139', vendor: 'EduSupply', school: 'Nyarugenge Mixed School', description: 'Science kits S4–S6', amount: 12_100_000, status: 'approved', eta: 'May 22' },
  { po: 'PO-2026-0135', vendor: 'Fresh Foods Co.', school: 'Gasabo Secondary', description: 'Term 2 feeding prepayment', amount: 36_000_000, status: 'pending_signature', eta: '—' },
  { po: 'PO-2026-0128', vendor: 'FleetCare', school: 'Kigali Primary School A', description: 'Bus tyres & service', amount: 5_600_000, status: 'paid', eta: 'Completed' },
];

export const SCHOOL_EXPENSE_COMPARE = [
  { schoolId: 1, name: 'Kicukiro Academy', operatingSpend: 118_000_000, studentCount: 1840 },
  { schoolId: 2, name: 'Nyarugenge Mixed School', operatingSpend: 96_000_000, studentCount: 1520 },
  { schoolId: 3, name: 'Gasabo Secondary', operatingSpend: 104_000_000, studentCount: 1680 },
  { schoolId: 4, name: 'Kigali Primary School A', operatingSpend: 82_000_000, studentCount: 1210 },
];
