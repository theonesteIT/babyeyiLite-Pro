export const DIRECTORY_MONTHS = [
  { value: 'All', label: 'All months' },
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

export function buildDirectoryYearOptions(extraYears = 10) {
  const current = new Date().getFullYear();
  const years = [{ value: 'All', label: 'All years' }];
  for (let y = current; y >= current - extraYears; y -= 1) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

/** Join date by default; termination date when viewing terminated staff. */
export function directoryFilterDate(emp, statusFilter = 'All') {
  const useTermination = statusFilter === 'Terminated';
  const raw = useTermination ? (emp.termination_date || emp.hire_date) : emp.hire_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function matchesDirectoryYearMonth(emp, { year = 'All', month = 'All', status = 'All' } = {}) {
  if ((!year || year === 'All') && (!month || month === 'All')) return true;
  const d = directoryFilterDate(emp, status);
  if (!d) return false;
  if (year && year !== 'All' && d.getFullYear() !== Number(year)) return false;
  if (month && month !== 'All' && d.getMonth() + 1 !== Number(month)) return false;
  return true;
}
