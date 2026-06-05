function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n) {
  return toNum(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoneyPlain(n) {
  return toNum(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function monthEndDay(month, year) {
  return new Date(year, month, 0).getDate();
}

function monthIndex(label) {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const i = months.indexOf(String(label || '').toLowerCase());
  return i >= 0 ? i + 1 : new Date().getMonth() + 1;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function chunkToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`.trim();
  if (n < 1000) {
    return `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunkToWords(n % 100)}` : ''}`.trim();
  }
  if (n < 1_000_000) {
    return `${chunkToWords(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${chunkToWords(n % 1000)}` : ''}`.trim();
  }
  if (n < 1_000_000_000) {
    return `${chunkToWords(Math.floor(n / 1_000_000))} Million${n % 1_000_000 ? ` ${chunkToWords(n % 1_000_000)}` : ''}`.trim();
  }
  return String(n);
}

export function amountToWords(amount) {
  const n = Math.round(toNum(amount));
  if (!n) return 'Zero Rwandan Francs Only';
  return `${chunkToWords(n)} Rwandan Francs Only`;
}

function maskAccountNumber(account) {
  const s = String(account || '').trim();
  if (!s || s === '—') return '—';
  if (s.length <= 4) return '*'.repeat(s.length);
  return '*'.repeat(Math.max(4, s.length - 4)) + s.slice(-4);
}

function formatTimelineDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSchoolInfo() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser') || '{}';
    const u = JSON.parse(raw);
    const s = u?.school || {};
    const name = s.name || u?.school_name || 'School';
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SC';
    return {
      name,
      initials,
      tagline: s.tagline || 'Excellence in Education',
      address: s.address || u?.school_address || '',
      tin: s.tin || u?.school_tin || u?.tin || '',
      phone: s.phone || u?.school_phone || '',
      email: s.email || u?.school_email || '',
      website: s.website || u?.school_website || '',
    };
  } catch {
    return { name: 'School', initials: 'SC', tagline: 'Excellence in Education' };
  }
}

/**
 * Build payslip view-model from payroll line + run metadata.
 */
export function buildPayslipData(employee = {}, runMeta = {}, school = getSchoolInfo()) {
  const raw = employee.detail?.raw || employee.raw || employee.detail || employee;
  const d = employee.detail || mapFallbackDetail(employee, raw);

  const basic = toNum(d.basic ?? raw.basic);
  const transport = toNum(d.transportAllowance ?? raw.transportAllowance);
  const housing = toNum(d.housingAllowance ?? raw.housingAllowance);
  const others = toNum(d.othersAllowance ?? raw.othersAllowance);
  const gross = toNum(d.gross ?? raw.gross ?? basic + transport + housing + others);

  const paye = toNum(d.paye ?? raw.paye);
  const rssb = toNum(d.rssb ?? raw.rssb ?? raw.csrEmployee6);
  const maternityEmp = toNum(raw.maternityEmployee ?? raw.maternity);
  const ramaEmp = toNum(d.rama ?? raw.rama ?? raw.ramaEmployee);
  const cbhi = toNum(d.cbhi ?? raw.cbhi ?? raw.mutuel);
  const extraDed = toNum(d.extraDeduction ?? raw.extraDeduction);
  const otherDed = Math.max(0, toNum(d.deductions ?? raw.deductions) - cbhi - extraDed);

  const netBeforeCbhi = toNum(raw.netPay ?? raw.netBeforeCbhi ?? gross - paye - rssb - maternityEmp - ramaEmp - otherDed - extraDed);
  const netPay = toNum(d.finalPayable ?? d.netSalary ?? raw.netPayFinal ?? raw.net ?? netBeforeCbhi - cbhi);

  const rssbEmpl = toNum(raw.csrEmployer6 ?? raw.rssbEmployer);
  const maternityEmpl = toNum(raw.maternityEmployer);
  const ramaEmpl = toNum(raw.ramaEmployer);
  const hazard = toNum(raw.csrOccupational2 ?? raw.occupationalHazard);
  const employerTotal = rssbEmpl + maternityEmpl + ramaEmpl + hazard;

  const earnings = [
    { desc: 'Basic Salary', amount: basic },
    ...(transport ? [{ desc: 'Transport Allowance', amount: transport }] : []),
    ...(housing ? [{ desc: 'Housing Allowance', amount: housing }] : []),
    ...(others ? [{ desc: 'Communication / Other Allowances', amount: others }] : []),
  ].filter((e) => e.amount > 0);

  const deductions = [
    ...(rssb ? [{ desc: 'RSSB Pension (Employee) — 6% of Gross', amount: rssb }] : []),
    ...(maternityEmp ? [{ desc: 'Maternity Leave (Employee) — 0.3% of Gross', amount: maternityEmp }] : []),
    ...(ramaEmp ? [{ desc: 'RAMA (Employee) — 7.5% of Basic', amount: ramaEmp }] : []),
    ...(paye ? [{ desc: 'PAYE (Income Tax) — On Basic Salary', amount: paye }] : []),
    ...(extraDed ? [{ desc: 'Additional Deductions', amount: extraDed }] : []),
    ...(otherDed ? [{ desc: 'Other Deductions', amount: otherDed }] : []),
  ].filter((x) => x.amount > 0);

  const totalDeductions = deductions.reduce((s, x) => s + x.amount, 0);
  const totalEarnings = earnings.reduce((s, x) => s + x.amount, 0) || gross;

  const monthLabel = runMeta.monthLabel || employee.month?.split(' ')[0] || 'Month';
  const payYear = runMeta.payYear || Number(employee.month?.split(' ')[1]) || new Date().getFullYear();
  const mNum = monthIndex(monthLabel);
  const lastDay = monthEndDay(mNum, payYear);
  const periodStart = `01 ${monthLabel.slice(0, 3)} ${payYear}`;
  const periodEnd = `${String(lastDay).padStart(2, '0')} ${monthLabel.slice(0, 3)} ${payYear}`;

  const paymentDateRaw = runMeta.paymentDate || runMeta.paidAt;
  const paymentDate = paymentDateRaw
    ? new Date(paymentDateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : periodEnd;

  const payslipNo = `PSLP-${payYear}-${String(mNum).padStart(2, '0')}-${String(employee.id || '000').replace(/\W/g, '').slice(-6).padStart(4, '0')}`;

  const employer = [
    { desc: 'RSSB Pension (Employer)', rate: '6.00% of Gross', amount: rssbEmpl },
    { desc: 'Maternity Leave (Employer)', rate: '0.30% of Gross', amount: maternityEmpl },
    { desc: 'RAMA (Employer)', rate: '7.50% of Basic', amount: ramaEmpl },
    { desc: 'Occupational Hazard', rate: '2.00% of Base Salary', amount: hazard },
  ];

  const accountRaw = d.bankAccount || raw.bankAccount || raw.payroll_account_number || '';
  const paymentMethod = runMeta.paymentMethod || raw.paymentMethod || raw.payroll_payment_method || 'Bank Transfer';
  const employmentType = raw.employmentType || raw.employment_type || 'Full-time';
  const taxStatus = raw.taxStatus || raw.tax_status || (paye > 0 ? 'Taxable' : 'Non-taxable');

  return {
    school: {
      name: school.name,
      initials: school.initials,
      tagline: school.tagline,
      address: school.address || '',
      tin: school.tin || '',
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || '',
      logoUrl: school.logoUrl || null,
      stampUrl: school.stampUrl || null,
      headTeacherName: school.headTeacherName || 'Head Teacher',
      headTeacherTitle: school.headTeacherTitle || 'Head Teacher',
      headTeacherSignatureUrl: school.headTeacherSignatureUrl || null,
      accountantName: school.accountantName || 'Accountant',
      accountantTitle: school.accountantTitle || 'Accountant',
      accountantSignatureUrl: school.accountantSignatureUrl || null,
    },
    meta: {
      payslipNo,
      monthLabel: `${monthLabel} ${payYear}`,
      payrollPeriod: `${periodStart} – ${periodEnd}`,
      paymentDate,
      paymentMethod: String(paymentMethod).trim() || 'Bank Transfer',
      status: String(runMeta.status || 'PAID').toUpperCase() === 'PAID' ? 'PAID' : String(runMeta.status || 'PAID').toUpperCase(),
      academicYear: runMeta.academicYear || '',
      runNumber: runMeta.runNumber || '',
      generatedAt: formatTimelineDate(runMeta.createdAt || runMeta.created_at),
      approvedAt: formatTimelineDate(runMeta.approvedAt || runMeta.approved_at || runMeta.createdAt || runMeta.created_at),
      paidAt: formatTimelineDate(runMeta.paidAt || runMeta.paid_at || paymentDateRaw),
    },
    employee: {
      name: employee.name || d.staff || 'Employee',
      photo: employee.photo || '??',
      id: employee.id || raw.nationalId || raw.staffCode || raw.staff_code || '—',
      department: employee.dept || raw.dept || '—',
      position: employee.position || raw.role || employee.dept || 'Staff',
      bank: d.bankName || raw.bankName || raw.payroll_bank_name || '—',
      account: accountRaw || '—',
      accountMasked: maskAccountNumber(accountRaw),
      employmentType,
      taxStatus,
      rssb: raw.rssbNumber || d.rssbNumber || '—',
      rama: raw.ramaNumber || '—',
    },
    summary: {
      gross: totalEarnings || gross,
      totalDeductions,
      netBeforeCbhi: netBeforeCbhi || netPay + cbhi,
      cbhi,
      net: netPay,
      employerTotal,
    },
    earnings,
    deductions,
    employer,
    amountWords: amountToWords(netPay),
    fmt: fmtMoney,
    fmtPlain: fmtMoneyPlain,
  };
}

function mapFallbackDetail(employee, raw) {
  return {
    basic: raw.basic,
    transportAllowance: raw.transportAllowance,
    housingAllowance: raw.housingAllowance,
    othersAllowance: raw.othersAllowance,
    gross: raw.gross,
    paye: raw.paye,
    rssb: raw.rssb,
    rama: raw.rama,
    cbhi: raw.cbhi,
    netSalary: raw.net,
    finalPayable: raw.finalPayable,
    bankName: raw.bankName,
    bankAccount: raw.bankAccount,
    extraDeduction: raw.extraDeduction,
    deductions: raw.deductions,
  };
}
