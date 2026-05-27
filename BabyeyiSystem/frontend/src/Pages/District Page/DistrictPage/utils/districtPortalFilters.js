import { ALL_TERMS_VALUE, ALL_TERMS_LABEL } from '../../../../utils/babyeyiAcademicPeriod';

export { ALL_TERMS_VALUE, ALL_TERMS_LABEL };

export const DEO_BABYEYI_STATUS_OPTIONS = [
  { id: 'all', label: 'All Status' },
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'draft', label: 'Draft' },
];

export const DEO_REQUEST_STATUS_OPTIONS = [
  { value: '', label: 'All request statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'recommended', label: 'Sent to NESA' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/** Pill UI keys (synced with increase-requests tab + filter drawer). */
export const DEO_REQUEST_STATUS_PILLS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'recommended', label: 'Sent to NESA' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export const DEO_EXCEEDS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Exceeds fee limit' },
  { value: 'no', label: 'Within limit' },
];

export const DEO_CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'Government', label: 'Government' },
  { value: 'Private', label: 'Private' },
  { value: 'Government Aided', label: 'Government Aided' },
];

export const DEO_LEVEL_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: 'Nursery', label: 'Nursery' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
];

export function createDefaultDeoPortalFilters(academicPeriod = {}) {
  return {
    academicYear: academicPeriod?.academicYear || '',
    term: academicPeriod?.term ?? '',
    babyeyiStatuses: ['all'],
    schoolId: '',
    sector: '',
    category: '',
    level: '',
    exceedsLimit: 'all',
    requestStatus: '',
  };
}

export function countActiveDeoPortalFilters(filters) {
  if (!filters) return 0;
  let n = 0;
  if (filters.academicYear) n += 1;
  if (filters.term) n += 1;
  if (filters.babyeyiStatuses?.length && !filters.babyeyiStatuses.includes('all')) n += 1;
  if (filters.schoolId) n += 1;
  if (filters.sector) n += 1;
  if (filters.category) n += 1;
  if (filters.level) n += 1;
  if (filters.exceedsLimit && filters.exceedsLimit !== 'all') n += 1;
  if (filters.requestStatus) n += 1;
  return n;
}

export function portalFiltersToAcademicPeriod(filters) {
  return {
    academicYear: filters?.academicYear || '',
    term: filters?.term ?? '',
  };
}

/** Map portal drawer → legacy list-tab `filters` object (search kept separate). */
export function portalFiltersToListFilters(portalFilters, search = '') {
  const st = portalFilters?.babyeyiStatuses || ['all'];
  let status = '';
  if (st.length && !st.includes('all')) {
    status = st.length === 1 ? st[0] : st.join(',');
  }
  return {
    status,
    year: portalFilters?.academicYear || '',
    term: portalFilters?.term || '',
    category: portalFilters?.category || '',
    level: portalFilters?.level || '',
    sector: portalFilters?.sector || '',
    school_id: portalFilters?.schoolId || '',
    search: search || '',
    request_status: portalFilters?.requestStatus || '',
    exceeds_limit:
      portalFilters?.exceedsLimit === 'yes'
        ? '1'
        : portalFilters?.exceedsLimit === 'no'
          ? '0'
          : '',
  };
}

export function buildDistrictPortalQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.academicYear) params.set('academic_year', filters.academicYear);
  if (filters.term) params.set('term', filters.term);
  if (filters.schoolId) params.set('school_id', filters.schoolId);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.category) params.set('category', filters.category);
  if (filters.level) params.set('level', filters.level);
  if (filters.requestStatus) params.set('request_status', filters.requestStatus);

  const st = filters.babyeyiStatuses || ['all'];
  if (st.length && !st.includes('all')) {
    params.set('status', st.length === 1 ? st[0] : st.join(','));
  }

  if (filters.exceedsLimit === 'yes') params.set('exceeds_limit', '1');
  if (filters.exceedsLimit === 'no') params.set('exceeds_limit', '0');

  return params.toString();
}

export function formatDeoFilterSummary(filters, districtName = '') {
  if (!filters || countActiveDeoPortalFilters(filters) === 0) {
    return districtName
      ? `Showing all Babyeyi in ${districtName} District`
      : 'Showing all district data';
  }
  const parts = [];
  if (filters.academicYear) parts.push(filters.academicYear);
  if (filters.term) parts.push(filters.term);
  else parts.push(ALL_TERMS_LABEL);
  const st = filters.babyeyiStatuses || [];
  if (st.length && !st.includes('all')) {
    parts.push(
      st
        .map((id) => DEO_BABYEYI_STATUS_OPTIONS.find((o) => o.id === id)?.label || id)
        .join(', '),
    );
  }
  if (filters.schoolId) parts.push('Selected school');
  if (filters.sector) parts.push(filters.sector);
  if (filters.category) parts.push(filters.category);
  if (filters.level) parts.push(filters.level);
  if (filters.exceedsLimit === 'yes') parts.push('Exceeds limit');
  if (filters.exceedsLimit === 'no') parts.push('Within limit');
  if (filters.requestStatus) {
    const lbl = DEO_REQUEST_STATUS_OPTIONS.find((o) => o.value === filters.requestStatus)?.label;
    if (lbl) parts.push(lbl);
  }
  const prefix = districtName ? `${districtName} District · ` : '';
  return `${prefix}Showing ${parts.join(' · ')}`;
}
