export const AP_COLORS = {
  navy: '#000435',
  amber: '#F59E0B',
  amberLight: '#FDE68A',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
};

export const ACTION_PLAN_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Full Academic Year'];

export const FUNDING_SOURCES = [
  'Student Fees',
  'Government Grants',
  'Donations',
  'Projects',
  'PTA Contributions',
  'Sponsors',
  'School Income',
  'Other',
];

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const PLAN_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const AP_RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .ap-grid-4 { grid-template-columns: 1fr 1fr !important; }
  .ap-grid-3 { grid-template-columns: 1fr !important; }
  .ap-grid-2 { grid-template-columns: 1fr !important; }
  .ap-hide-mobile { display: none !important; }
}
@media (max-width: 480px) {
  .ap-grid-4 { grid-template-columns: 1fr !important; }
}
`;
