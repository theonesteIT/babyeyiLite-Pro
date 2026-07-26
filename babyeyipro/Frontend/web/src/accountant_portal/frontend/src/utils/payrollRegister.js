import * as XLSX from 'xlsx';

/** Column headers matching Rwanda school payroll register (Kigali Parents format). */
export const PAYROLL_REGISTER_HEADERS = [
  'RSSB NUMBER(RAMA)',
  'ID',
  'FIRST NAME',
  'FAMILY NAME',
  'SEX',
  'BASIC SL',
  'Totals ALLOWANCES',
  'Others',
  'H/A',
  'T/A',
  'GROSS',
  'PAYE',
  'BASE',
  'CSR 6%',
  'M.LEAVE 0.3%',
  'M.LEAVE 0.3%',
  'TOT MLD',
  'CSR 6%',
  'CSR 2%',
  'CSR 8%',
  'TOTAL CSR14%',
  'RAMA 7.5%',
  'RAMA 7.5%',
  'TOTAL RAMA',
  'NET PAY',
  'NET PAY',
  'MUTUEL',
  'NET PAY',
];

/** RSSB, national ID, names, sex — display as plain text (no thousand separators). */
export const PAYROLL_REGISTER_TEXT_COL_COUNT = 5;

/** Trailing report columns that must never be locale-formatted as numbers. */
export const PAYROLL_PLAIN_TEXT_HEADERS = new Set([
  'BANK',
  'ACCOUNT',
  'OTHER DED. DETAIL',
  'STATUS',
]);

export function isPayrollPlainTextColumn(columnIndex, columnHeader = '') {
  if (columnIndex != null && columnIndex < PAYROLL_REGISTER_TEXT_COL_COUNT) return true;
  const header = String(columnHeader || '').trim().toUpperCase();
  return PAYROLL_PLAIN_TEXT_HEADERS.has(header);
}

export function formatPayrollRegisterCell(value, columnIndex, columnHeader = '') {
  if (isPayrollPlainTextColumn(columnIndex, columnHeader)) {
    if (value === '-' || value === '' || value == null) return value === '-' ? '-' : '';
    return String(value);
  }
  if (value === '-' || value === '') return value === '-' ? '-' : '';
  const n = Number(value);
  if (Number.isFinite(n) && String(value).trim() !== '') return n.toLocaleString();
  return value;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function splitAllowanceBreakdown(breakdown = []) {
  let housing = 0;
  let transport = 0;
  let others = 0;
  let total = 0;
  for (const item of breakdown) {
    const name = String(item?.name || '').toLowerCase();
    const amt = toNum(item?.amount);
    total += amt;
    if (name.includes('transport')) transport += amt;
    else if (name.includes('housing')) housing += amt;
    else others += amt;
  }
  return {
    totalAllowances: Math.round(total),
    housing: Math.round(housing),
    transport: Math.round(transport),
    others: Math.round(others),
  };
}

export function enrichPayrollCalc(calc = {}) {
  const rssbEmployee = toNum(calc.rssbEmployee);
  const rssbEmployer = toNum(calc.rssbEmployer);
  const maternityEmployee = toNum(calc.maternityEmployee);
  const maternityEmployer = toNum(calc.maternityEmployer);
  const occupationalHazard = toNum(calc.occupationalHazard);
  const ramaEmployee = toNum(calc.ramaEmployee);
  const ramaEmployer = toNum(calc.ramaEmployer);

  const maternityTotal = maternityEmployee + maternityEmployer;
  const csrEmployer8 = rssbEmployer + occupationalHazard;
  // CSR 14% = pension 6% emp + 6% empl (gross) + hazard 2% (base); maternity is separate columns
  const totalCsr14 = rssbEmployee + rssbEmployer + occupationalHazard;
  const ramaTotal = ramaEmployee + ramaEmployer;

  return {
    ...calc,
    maternityTotal,
    csrEmployer8,
    totalCsr14,
    ramaTotal,
    netPay: toNum(calc.incomeSalary ?? calc.netBeforeCbhi),
    netPayAfterMutuel: toNum(calc.finalNet),
  };
}

function parseName(fullName = '') {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', familyName: '' };
  if (parts.length === 1) return { firstName: parts[0], familyName: '' };
  return { firstName: parts[0], familyName: parts.slice(1).join(' ') };
}

export const TERMINATED_REGISTER_DASH = '-';

function dashIfZero(n, hasRama) {
  if (!hasRama && toNum(n) === 0) return TERMINATED_REGISTER_DASH;
  return toNum(n);
}

export function isTerminatedMonthPayroll(source = {}) {
  return source.mode === 'terminated_month'
    || source.isTerminationPayroll === true
    || source.allowanceSource === 'terminated_month';
}

/** Terminated-month rows skip basic/allowances/RAMA/maternity — show dash in register columns. */
export function applyTerminatedMonthRegisterDashes(row = {}) {
  return {
    ...row,
    basicSalary: TERMINATED_REGISTER_DASH,
    totalAllowances: TERMINATED_REGISTER_DASH,
    othersAllowance: TERMINATED_REGISTER_DASH,
    housingAllowance: TERMINATED_REGISTER_DASH,
    transportAllowance: TERMINATED_REGISTER_DASH,
    maternityEmployee: TERMINATED_REGISTER_DASH,
    maternityEmployer: TERMINATED_REGISTER_DASH,
    maternityTotal: TERMINATED_REGISTER_DASH,
    ramaEmployee: TERMINATED_REGISTER_DASH,
    ramaEmployer: TERMINATED_REGISTER_DASH,
    ramaTotal: TERMINATED_REGISTER_DASH,
  };
}

function isSummableRegisterValue(v) {
  return v !== TERMINATED_REGISTER_DASH && v !== '—';
}

/**
 * Build one register row (school spreadsheet layout).
 */
export function buildPayrollRegisterRow(staff = {}, calcInput = {}) {
  const calc = enrichPayrollCalc(calcInput);
  const split = calc.registerAllowanceSplit
    ? {
        totalAllowances: toNum(calc.registerAllowanceSplit.totalAllowances),
        housing: toNum(calc.registerAllowanceSplit.housing),
        transport: toNum(calc.registerAllowanceSplit.transport),
        others: toNum(calc.registerAllowanceSplit.others),
      }
    : splitAllowanceBreakdown(calc.allowanceBreakdown);
  const { firstName, familyName } = parseName(staff.fullName || staff.staff || staff.name);
  const hasRama = toNum(calc.ramaEmployee) > 0 || toNum(calc.ramaEmployer) > 0;

  const row = {
    rssbNumber: staff.rssbNumber || staff.rssb || '',
    nationalId: staff.nationalId || staff.idNumber || staff.staffCode || '',
    firstName: staff.firstName || firstName,
    familyName: staff.familyName || familyName,
    sex: staff.sex || staff.gender || '',
    basicSalary: toNum(calc.basicSalary),
    totalAllowances: split.totalAllowances,
    othersAllowance: split.others,
    housingAllowance: split.housing,
    transportAllowance: split.transport,
    gross: toNum(calc.grossSalary),
    paye: toNum(calc.paye),
    base: toNum(calc.baseSalary),
    csrEmployee6: toNum(calc.rssbEmployee),
    maternityEmployee: toNum(calc.maternityEmployee),
    maternityEmployer: toNum(calc.maternityEmployer),
    maternityTotal: calc.maternityTotal,
    csrEmployer6: toNum(calc.rssbEmployer),
    csrOccupational2: toNum(calc.occupationalHazard),
    csrEmployer8: calc.csrEmployer8,
    totalCsr14: calc.totalCsr14,
    ramaEmployee: dashIfZero(calc.ramaEmployee, hasRama),
    ramaEmployer: dashIfZero(calc.ramaEmployer, hasRama),
    ramaTotal: hasRama ? calc.ramaTotal : TERMINATED_REGISTER_DASH,
    netPay: calc.netPay,
    netPayDuplicate: calc.netPay,
    mutuel: toNum(calc.cbhi),
    netPayFinal: calc.netPayAfterMutuel,
  };
  return isTerminatedMonthPayroll(calcInput) ? applyTerminatedMonthRegisterDashes(row) : row;
}

export function registerRowToValues(row) {
  return [
    row.rssbNumber,
    row.nationalId,
    row.firstName,
    row.familyName,
    row.sex,
    row.basicSalary,
    row.totalAllowances,
    row.othersAllowance,
    row.housingAllowance,
    row.transportAllowance,
    row.gross,
    row.paye,
    row.base,
    row.csrEmployee6,
    row.maternityEmployee,
    row.maternityEmployer,
    row.maternityTotal,
    row.csrEmployer6,
    row.csrOccupational2,
    row.csrEmployer8,
    row.totalCsr14,
    row.ramaEmployee,
    row.ramaEmployer,
    row.ramaTotal,
    row.netPay,
    row.netPayDuplicate,
    row.mutuel,
    row.netPayFinal,
  ];
}

export function sumPayrollRegisterRows(rows = []) {
  const sumKeys = [
    'basicSalary', 'totalAllowances', 'othersAllowance', 'housingAllowance', 'transportAllowance',
    'gross', 'paye', 'base', 'csrEmployee6', 'maternityEmployee', 'maternityEmployer', 'maternityTotal',
    'csrEmployer6', 'csrOccupational2', 'csrEmployer8', 'totalCsr14',
    'netPay', 'netPayDuplicate', 'mutuel', 'netPayFinal',
  ];
  const totals = {};
  for (const key of sumKeys) totals[key] = 0;
  let ramaEmp = 0;
  let ramaEmpl = 0;
  let ramaTot = 0;
  for (const row of rows) {
    for (const key of sumKeys) {
      if (isSummableRegisterValue(row[key])) totals[key] += toNum(row[key]);
    }
    if (isSummableRegisterValue(row.ramaEmployee)) ramaEmp += toNum(row.ramaEmployee);
    if (isSummableRegisterValue(row.ramaEmployer)) ramaEmpl += toNum(row.ramaEmployer);
    if (isSummableRegisterValue(row.ramaTotal)) ramaTot += toNum(row.ramaTotal);
  }
  totals.ramaEmployee = ramaEmp || TERMINATED_REGISTER_DASH;
  totals.ramaEmployer = ramaEmpl || TERMINATED_REGISTER_DASH;
  totals.ramaTotal = ramaTot || TERMINATED_REGISTER_DASH;
  totals.firstName = '';
  totals.familyName = 'TOTAL';
  totals.rssbNumber = '';
  totals.nationalId = 'TOTAL';
  totals.sex = '';
  return totals;
}

function escCsv(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildRegisterSheetAoa({ schoolName = 'School', periodLabel = 'PAYROLL', rows = [] }) {
  const titleRow = [schoolName.toUpperCase(), periodLabel, ...Array(PAYROLL_REGISTER_HEADERS.length - 2).fill('')];
  const blankRow = Array(PAYROLL_REGISTER_HEADERS.length).fill('');
  const headerRow = [...PAYROLL_REGISTER_HEADERS];
  const dataRows = rows.map((r) => registerRowToValues(r));
  const totalRow = rows.length ? registerRowToValues(sumPayrollRegisterRows(rows)) : null;
  const aoa = [titleRow, blankRow, headerRow, ...dataRows];
  if (totalRow) aoa.push(totalRow);
  return aoa;
}

export function downloadPayrollRegisterCsv({ schoolName, periodLabel, rows, filename }) {
  const aoa = buildRegisterSheetAoa({ schoolName, periodLabel, rows });
  const csv = `\uFEFF${aoa.map((line) => line.map(escCsv).join(',')).join('\n')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `payroll-register-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPayrollRegisterExcel({ schoolName, periodLabel, rows, filename }) {
  const aoa = buildRegisterSheetAoa({ schoolName, periodLabel, rows });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
  XLSX.writeFile(wb, filename || `payroll-register-${Date.now()}.xlsx`);
}

export function mapApiLineToRegisterRow(line = {}) {
  const hasRama = toNum(line.ramaEmployee ?? line.rama) > 0;
  const maternityTotal = toNum(line.maternityTotal)
    || (toNum(line.maternityEmployee ?? line.maternity) + toNum(line.maternityEmployer));
  const csrEmployer6 = toNum(line.csrEmployer6 ?? line.rssbEmployer);
  const csrOccupational2 = toNum(line.csrOccupational2 ?? line.occupationalHazard);
  const csrEmployer8 = toNum(line.csrEmployer8) || (csrEmployer6 + csrOccupational2);
  const csrEmployee6 = toNum(line.csrEmployee6 ?? line.rssb);
  const totalCsr14 = toNum(line.totalCsr14)
    || (csrEmployee6 + csrEmployer6 + csrOccupational2);

  let firstName = line.firstName || '';
  let familyName = line.familyName || '';
  if (!firstName && line.staff) {
    const parts = String(line.staff).trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] || '';
    familyName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  const row = {
    rssbNumber: line.rssbNumber || line.rssb || '',
    nationalId: line.nationalId || line.staffCode || '',
    sex: line.sex || line.gender || '',
    firstName,
    familyName: familyName || line.staff || '',
    basicSalary: toNum(line.basic ?? line.basicSalary),
    totalAllowances: toNum(line.totalAllowances ?? line.allowances),
    othersAllowance: toNum(line.othersAllowance),
    housingAllowance: toNum(line.housingAllowance),
    transportAllowance: toNum(line.transportAllowance),
    gross: toNum(line.gross),
    paye: toNum(line.paye),
    base: toNum(line.base),
    csrEmployee6,
    maternityEmployee: toNum(line.maternityEmployee ?? line.maternity),
    maternityEmployer: toNum(line.maternityEmployer),
    maternityTotal,
    csrEmployer6,
    csrOccupational2,
    csrEmployer8,
    totalCsr14,
    ramaEmployee: hasRama ? toNum(line.ramaEmployee ?? line.rama) : TERMINATED_REGISTER_DASH,
    ramaEmployer: hasRama ? toNum(line.ramaEmployer) : TERMINATED_REGISTER_DASH,
    ramaTotal: hasRama
      ? toNum(line.ramaTotal ?? (toNum(line.ramaEmployee ?? line.rama) + toNum(line.ramaEmployer)))
      : TERMINATED_REGISTER_DASH,
    netPay: toNum(line.netPay ?? line.netBeforeCbhi ?? line.net),
    netPayDuplicate: toNum(line.netPay ?? line.netBeforeCbhi ?? line.net),
    mutuel: toNum(line.mutuel ?? line.cbhi),
    netPayFinal: toNum(line.netPayFinal ?? line.net),
  };
  return isTerminatedMonthPayroll(line) ? applyTerminatedMonthRegisterDashes(row) : row;
}
