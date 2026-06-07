import { HR_DEPARTMENTS, CONTRACT_TYPES } from '../../manager/pages/HRPages/hrConstants';

export const TERMINATION_MONTHS = [
  { value: '', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function buildYearOptions(records = [], extraYears = 3) {
  const years = new Set();
  const current = new Date().getFullYear();
  for (let y = current; y >= current - extraYears; y -= 1) years.add(y);
  for (const r of records) {
    const d = r?.terminationDate ? new Date(r.terminationDate) : null;
    if (d && !Number.isNaN(d.getTime())) years.add(d.getFullYear());
  }
  return [{ value: '', label: 'All years' }, ...[...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: String(y) }))];
}

export function filterTerminationRecords(records = [], { query = '', year = '', month = '', department = '', contractType = '', status = '' } = {}) {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (status && r.status !== status) return false;
    if (q) {
      const hay = `${r.staffName || ''} ${r.staffCode || ''} ${r.position || ''} ${r.department || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (department && String(r.department || '') !== department) return false;
    if (contractType && String(r.contractType || r.employmentType || r.contract || '') !== contractType) return false;
    if (year || month) {
      const d = r.terminationDate ? new Date(r.terminationDate) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      if (year && d.getFullYear() !== Number(year)) return false;
      if (month && d.getMonth() + 1 !== Number(month)) return false;
    }
    return true;
  });
}

export const TERMINATION_DEPARTMENT_OPTIONS = ['', ...HR_DEPARTMENTS];
export const TERMINATION_CONTRACT_OPTIONS = ['', ...CONTRACT_TYPES];
