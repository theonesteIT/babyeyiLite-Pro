export const T = {
  navy: '#000435',
  navyDeep: '#00022a',
  amber: '#F59E0B',
  amberLight: '#FCD34D',
  amberPale: '#FEF3C7',
  white: '#FFFFFF',
  off: '#F7F8FC',
  border: '#E4E8F0',
  text: '#111827',
  muted: '#6B7280',
  success: '#059669',
  danger: '#DC2626',
  info: '#2563EB',
};

export const REQUEST_STATUSES = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Under Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
  converted: { label: 'Converted', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const REQN_STATUSES = {
  pending: { label: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' },
};

export const PO_STATUSES = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  issued: { label: 'Issued', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
];

export const PORTAL_SOURCES = {
  teacher: 'Teacher Portal',
  discipline: 'Discipline Portal',
  dos: 'DOS Portal',
  librarian: 'Librarian Portal',
  storekeeper: 'Storekeeper Portal',
  assets: 'Assets Portal',
  accountant: 'Accountant Portal',
  manager: 'Manager Portal',
  representative: 'Representative Portal',
  gatekeeper: 'Gate Keeper Portal',
};
