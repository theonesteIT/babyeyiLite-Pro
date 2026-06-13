import { calcStaffSalarySetupTotals } from './staffSalarySetupCalc';
import { resolveCertificateAssetUrl } from './certificateAssets';

function toMoney(v) {  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function getSchoolOrgFromAuth() {
  try {    const raw = localStorage.getItem('user') || localStorage.getItem('authUser') || '{}';
    const u = JSON.parse(raw);
    const school = u?.school || {};
    return {
      name: school.name || u.school_name || 'School',
      address: school.address || school.location || school.physical_address || '',
      phone: school.phone || school.telephone || school.contact_phone || '',
      email: school.email || school.contact_email || '',
      tin: school.tin || school.tax_id || school.tin_number || '',
      logoUrl: resolveCertificateAssetUrl(school.logo_url || school.logo || school.logoUrl || ''),
      website: school.website || '',
    };
  } catch {
    return { name: 'School' };
  }
}

export function getAuthUserMeta() {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('authUser') || '{}';
    const u = JSON.parse(raw);
    const name = u.full_name || u.fullName || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || 'Accountant';
    const roleCode = String(u.role?.code || u.role_code || u.role || '').toUpperCase();
    return {
      name,
      position: roleCode === 'ACCOUNTANT' ? 'Accountant' : (u.role_name || u.position || 'Accountant'),
      email: u.email || '',
    };
  } catch {
    return { name: 'Accountant', position: 'Accountant' };
  }
}
function genderPrefix(gender) {
  const g = String(gender || '').toLowerCase();
  if (g.startsWith('m')) return 'Mr.';
  if (g.startsWith('f')) return 'Ms.';
  return 'Mr./Ms.';
}

function randomVerificationSuffix(staffId) {
  const base = String(staffId || '0').slice(-4).padStart(4, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export function buildSalaryCertificateData(employee = {}, options = {}) {
  const org = { ...getSchoolOrgFromAuth(), ...(options.org || {}) };
  const preparedBy = { ...getAuthUserMeta(), ...(options.preparedBy || {}) };
  const authorizedBy = options.authorizedBy || {
    name: org.headName || 'School Manager',
    position: org.headTitle || 'Head of Institution',
  };

  const basic = toMoney(employee.payroll_basic_salary);

  const setupTotals = calcStaffSalarySetupTotals(employee, {
    allowanceRules: options.allowanceRules || {},
    payeRates: options.payeRates,
    statutory: options.statutory || {},
    customDeductions: options.customDeductions || [],
    advances: options.advances || [],
  });

  const {
    others,
    housing,
    transport,
    responsibility,
    otherBenefits,
    gross,
    deductions,
    paye,
    pension,
    rama,
    maternity,
    mutuelle,
    otherDeductions,
    deductionRows,
    net,
  } = setupTotals;
  const now = options.issueDate ? new Date(options.issueDate) : new Date();
  const year = now.getFullYear();
  const staffId = employee.id || employee.staffUserId || employee.user_id;
  const refNo = options.referenceNo || `SC-${year}-${String(staffId || 0).padStart(4, '0')}`;
  const verifyCode = options.verificationCode || `SAL-${year}-${randomVerificationSuffix(staffId)}`;
  const verifyUrl = options.verifyUrl || `${window.location.origin}/verify/salary/${verifyCode}`;

  const hireDate = employee.hire_date || employee.contract_start;
  const empName = employee.name || employee.fullName || [employee.first_name, employee.last_name].filter(Boolean).join(' ');

  return {
    referenceNo: refNo,
    issueDate: now,
    verificationCode: verifyCode,
    verifyUrl,
    org,
    preparedBy,
    authorizedBy,
    employee: {
      name: empName || '—',
      id: employee.employee_id || employee.staffCode || employee.user_uid || `EMP-${staffId}`,
      position: employee.position || employee.role_name || '—',
      department: employee.department || '—',
      employmentType: employee.employment_type || employee.contract || 'Permanent',
      hireDate,
      gender: employee.gender,
      genderPrefix: genderPrefix(employee.gender),
      photoUrl: options.photoUrl || employee.photo || null,
    },
    salary: {
      basic,
      others,
      housing,
      transport,
      responsibility,
      otherBenefits,
      gross,
      deductions,
      paye,
      pension,
      rama,
      maternity,
      mutuelle,
      otherDeductions,
      deductionRows,
      net,
    },
    certificationText:      `This is to certify that ${genderPrefix(employee.gender)} ${empName || 'the above employee'} is employed by ${org.name} as ${employee.position || 'staff'} and currently receives the salary detailed below.`,
    footerNote:
      'This certificate is issued upon the request of the employee for official purposes. We confirm that the above information is true and accurate according to our employment and payroll records.',
  };
}

export function formatCertificateDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatCertMoney(n) {
  return `${toMoney(n).toLocaleString()} RWF`;
}

/** Earning lines aligned with Staff Salary Setup register columns. */
export function buildCertificateEarningRows(salary = {}) {
  const rows = [
    ['Basic Salary', salary.basic],
    ['Others Allowance', salary.others],
    ['Housing Allowance', salary.housing],
    ['Transport Allowance', salary.transport],
  ];
  if (toMoney(salary.responsibility) > 0) {
    rows.push(['Responsibility Allowance', salary.responsibility]);
  }
  if (toMoney(salary.otherBenefits) > 0) {
    rows.push(['Other Benefits', salary.otherBenefits]);
  }
  rows.push(['Gross Salary', salary.gross]);
  return rows;
}