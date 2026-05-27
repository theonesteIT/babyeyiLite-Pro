import { ALL_TERMS_VALUE, ALL_TERMS_LABEL } from '../../../../utils/babyeyiAcademicPeriod';

export const DASHBOARD_STATUS_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'needs_action', label: 'Needs Action' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'reconciled', label: 'Reconciled' },
  { id: 'violations', label: 'Violations' },
];

export const FEE_LIMIT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Exceeded' },
  { value: 'no', label: 'Within limit' },
];

export const VIOLATIONS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'With violations' },
  { value: 'no', label: 'No violations' },
];

export function createDefaultDashboardFilters(academicPeriod = {}) {
  return {
    academicYear: academicPeriod?.academicYear || '',
    term: academicPeriod?.term ?? '',
    statuses: ['all'],
    schoolId: '',
    feeLimitExceeded: 'all',
    violations: 'all',
  };
}

export function countActiveDashboardFilters(filters) {
  if (!filters) return 0;
  let n = 0;
  if (filters.academicYear) n += 1;
  if (filters.term) n += 1;
  if (filters.statuses?.length && !filters.statuses.includes('all')) n += 1;
  if (filters.schoolId) n += 1;
  if (filters.feeLimitExceeded && filters.feeLimitExceeded !== 'all') n += 1;
  if (filters.violations && filters.violations !== 'all') n += 1;
  return n;
}

/** @alias — same query shape for stats, analytics, violations, requests */
export function buildNesaPortalQuery(filters = {}) {
  return buildDashboardStatsQuery(filters);
}

export function buildDashboardStatsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.academicYear) params.set('academic_year', filters.academicYear);
  if (filters.term) params.set('term', filters.term);
  if (filters.schoolId) params.set('school_id', filters.schoolId);
  if (filters.feeLimitExceeded && filters.feeLimitExceeded !== 'all') {
    params.set('fee_limit_exceeded', filters.feeLimitExceeded);
  }
  if (filters.violations && filters.violations !== 'all') {
    params.set('violations', filters.violations);
  }
  const statuses = filters.statuses || ['all'];
  if (statuses.length && !statuses.includes('all')) {
    params.set('status', statuses.join(','));
  }
  return params.toString();
}

export function formatDashboardFilterSummary(filters) {
  if (!filters || countActiveDashboardFilters(filters) === 0) {
    return 'Showing all national data';
  }
  const parts = [];
  if (filters.academicYear) parts.push(filters.academicYear);
  if (filters.term) parts.push(filters.term);
  else parts.push(ALL_TERMS_LABEL);
  const st = filters.statuses || [];
  if (st.length && !st.includes('all')) {
    parts.push(
      st
        .map((id) => DASHBOARD_STATUS_OPTIONS.find((o) => o.id === id)?.label || id)
        .join(', '),
    );
  }
  if (filters.schoolId) parts.push('Selected school');
  if (filters.feeLimitExceeded === 'yes') parts.push('Fee limit exceeded');
  if (filters.feeLimitExceeded === 'no') parts.push('Within fee limit');
  if (filters.violations === 'yes') parts.push('Violations only');
  return `Showing results for ${parts.join(' · ')}`;
}

export function portalFiltersToAcademicPeriod(filters) {
  return {
    academicYear: filters?.academicYear || '',
    term: filters?.term ?? '',
  };
}

/** Map portal status checkboxes → approvals API `status` param (null = use page tab). */
export function resolveApprovalsStatus(portalFilters, pageStatus = 'pending') {
  const st = portalFilters?.statuses || ['all'];
  if (!st.length || st.includes('all')) return pageStatus;
  if (st.includes('needs_action') && st.length === 1) return 'pending';
  if (st.includes('approved') && st.length === 1) return 'approved';
  if (st.includes('rejected') && st.length === 1) return 'rejected';
  if (st.includes('reconciled') && st.length === 1) return 'approved';
  return pageStatus;
}

export { ALL_TERMS_VALUE, ALL_TERMS_LABEL };
