/** Shared HR Center constants — departments, banks, portal roles (from HRCentral) */

export const HR_DEPARTMENTS = [
  'Leadership',
  'Teaching Staff',
  'Student Welfare',
  'Administration',
  'Finance',
  'ICT',
  'Laboratory',
  'Library',
  'Boarding',
  'Support Staff',
  'Sports & Clubs',
];

export const RW_BANKS = [
  'Bank of Kigali',
  'BPR Bank Rwanda',
  'I&M Bank Rwanda',
  'Equity Bank Rwanda',
  'Umwalimu SACCO',
  'Ecobank Rwanda',
  'Access Bank Rwanda',
  'Bank of Africa Rwanda',
  'NCBA Rwanda',
  'Guaranty Trust Bank Rwanda',
  'Urwego Bank',
  'Development Bank of Rwanda (BRD)',
  'AB Bank Rwanda',
  'Unguka Bank',
  'Zigama Credit and Savings Bank',
  'Umurenge SACCO',
];

/** Portal login roles — same set as HRCentral role assignment */
export const STAFF_POSITIONS = [
  { code: 'TEACHER', label: 'Teacher' },
  { code: 'ACCOUNTANT', label: 'Accountant' },
  { code: 'HR', label: 'HR' },
  { code: 'DOS', label: 'DOS' },
  { code: 'STORE_MANAGER', label: 'Store Manager' },
  { code: 'ASSETS_MANAGER', label: 'Assets Manager' },
  { code: 'LIBRARIAN', label: 'Librarian' },
  { code: 'DISCIPLINE', label: 'Head of Discipline' },
  { code: 'GATE_KEEPER', label: 'Gate Keeper' },
  { code: 'SECRETARY', label: 'Secretary' },
  { code: 'HOD', label: 'Staff' },
  { code: 'SCHOOL_MANAGER', label: 'School Manager' },
  { code: 'SCHOOL_DIRECTOR', label: 'School Director' },
  { code: 'CUSTOM', label: 'Others' },
];

export const CONTRACT_TYPES = [
  'Permanent',
  'Temporary',
  'Probation',
  'Internship',
  'Part-Time',
];

export const rwProvinces = [
  'Kigali City',
  'Eastern Province',
  'Western Province',
  'Northern Province',
  'Southern Province',
];

export function getRoleAbbr(roleCode) {
  const role = String(roleCode || '').toUpperCase();
  if (role.includes('MANAGER')) return 'SM';
  if (role.includes('DIRECTOR')) return 'SD';
  if (role.includes('ACCOUNTANT')) return 'AC';
  if (role.includes('ASSETS')) return 'AM';
  if (role.includes('TEACHER')) return 'TR';
  return 'SS';
}

export function getNextStaffCode(roleCode, existingStaff = []) {
  const prefix = getRoleAbbr(roleCode);
  let maxCodeNumber = 0;
  (existingStaff || []).forEach((s) => {
    const rawCode = String(s?.staff_id || s?.staffId || '').trim().toUpperCase();
    const match = rawCode.match(/^([A-Z]{2})-(\d+)$/);
    if (match && match[1] === prefix) {
      const n = Number(match[2]);
      if (Number.isFinite(n)) maxCodeNumber = Math.max(maxCodeNumber, n);
    }
  });
  return `${prefix}-${String(maxCodeNumber + 1).padStart(3, '0')}`;
}

export function suggestUsername(firstName, lastName, email) {
  const fromEmail = String(email || '').trim().split('@')[0];
  if (fromEmail && fromEmail.length >= 3) return fromEmail.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const base = `${String(firstName || '').trim()}.${String(lastName || '').trim()}`
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
  return base.length >= 3 ? base : `staff${Date.now().toString().slice(-6)}`;
}

export function generateTempPassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$';
  const all = upper + lower + digits + special;
  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + lower[Math.floor(Math.random() * lower.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];
  for (let i = pwd.length; i < length; i += 1) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

export function isPlaceholderStaffEmail(email) {
  return String(email || '').toLowerCase().includes('staff.noemail.local');
}

export const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Study Leave',
  'Compassionate Leave',
  'Emergency Leave',
  'Special Leave',
  'Official Duty Leave',
  'Training Leave',
  'Conference Leave',
  'Examination Leave',
  'Others',
];

export const LEAVE_DOC_REQUIREMENTS = {
  'Sick Leave': ['Medical Certificate'],
  'Study Leave': ['Admission Letter', 'Training Invitation'],
  'Official Duty Leave': ['Authorization Letter'],
  'Training Leave': ['Training Invitation'],
  'Conference Leave': ['Conference Invitation'],
};

export function calcLeaveDays(startStr, endStr, { excludeWeekends = false, halfDay = false } = {}) {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    const isWeekend = dow === 0 || dow === 6;
    if (!excludeWeekends || !isWeekend) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  if (halfDay && days > 0) return 0.5;
  return days;
}

export function yearsOfService(hireDate) {
  if (!hireDate) return null;
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime())) return null;
  const diff = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

export function resolveStaffPhotoUrl(photo) {
  if (!photo) return null;
  const raw = String(photo).trim();
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

/** HR document entry from hr_profile_json.documents (string legacy or { name, path }) */
export function normalizeHrDocument(doc) {
  if (!doc) return { name: '', path: null };
  if (typeof doc === 'string') return { name: doc, path: null };
  const name = doc.name || doc.filename || '';
  const filePath = doc.path || doc.url || null;
  return { name, path: filePath };
}

export function resolveHrDocumentUrl(doc) {
  const { path: filePath } = normalizeHrDocument(doc);
  if (!filePath) return null;
  return resolveStaffPhotoUrl(filePath);
}

const emptyQual = () => ({ level: '', institution: '', year: '', grade: '' });
const emptyExp = () => ({ employer: '', position: '', years: '' });

/** Map API employee record → registration wizard form */
export function employeeToRegistrationForm(emp) {
  const hr = emp?.hr_profile || {};
  const bp = hr.birth_place || {};
  const res = hr.residence || {};
  const kin = hr.next_of_kin || {};
  const nat = hr.nationality || '';
  const isNatOther = nat && !['Rwandan'].includes(nat);
  const birthC = hr.birth_country || '';
  const isBirthOther = birthC && !['Rwanda', 'Uganda', 'Kenya', 'DRC', 'Burundi'].includes(birthC);
  const kinRel = kin.relationship || '';
  const isKinOther = kinRel && !['Spouse', 'Parent', 'Sibling', 'Child', 'Friend'].includes(kinRel);
  const pm = emp.payroll_payment_method === 'Bank Transfer' ? 'bank'
    : emp.payroll_payment_method === 'Mobile Money' ? 'mobile_money' : '';

  const knownPos = STAFF_POSITIONS.find((p) => p.code === emp.role_code);
  const positionCode = knownPos ? emp.role_code : (emp.role_code ? 'CUSTOM' : '');

  return {
    gender: emp.gender || '',
    first_name: emp.first_name || '',
    middle_name: hr.middle_name || '',
    last_name: emp.last_name || '',
    date_of_birth: emp.date_of_birth ? String(emp.date_of_birth).slice(0, 10) : '',
    father_names: hr.father_names || '',
    mother_names: hr.mother_names || '',
    marital_status: hr.marital_status || '',
    nationality: isNatOther ? 'Other' : (nat || ''),
    nationality_other: isNatOther ? nat : '',
    birth_country: isBirthOther ? 'Other' : (birthC || ''),
    birth_country_other: isBirthOther ? birthC : '',
    birth_village: bp.village || '', birth_cell: bp.cell || '', birth_sector: bp.sector || '',
    birth_district: bp.district || '', birth_province: bp.province || '',
    res_village: res.village || '', res_cell: res.cell || '', res_sector: res.sector || '',
    res_district: res.district || '', res_province: res.province || '',
    email: emp.email || '', phone: emp.phone || '', alt_phone: hr.alt_phone || '',
    id_document_number: emp.national_id || emp.passport_number || '',
    rssb_number: hr.rssb_number || '', medical_insurance: hr.medical_insurance || '', tin_number: hr.tin_number || '',
    payment_method: pm,
    bank_name: emp.payroll_bank_name || '', account_number: emp.payroll_account_number || '',
    account_holder: emp.payroll_account_holder || '',
    mobile_provider: hr.mobile_provider || '', mobile_money_number: emp.payroll_mobile_money_phone || '',
    kin_name: kin.name || '', kin_relationship: isKinOther ? 'Other' : (kinRel || ''),
    kin_relationship_other: isKinOther ? kinRel : '',
    kin_phone: kin.phone || '', kin_email: kin.email || '', kin_address: kin.address || '',
    department: emp.department || '',
    position_code: positionCode,
    position_other: knownPos ? '' : (emp.position || emp.job_title || ''),
    contract_type: emp.employment_type || '',
    start_date: emp.contract_start ? String(emp.contract_start).slice(0, 10) : (emp.hire_date ? String(emp.hire_date).slice(0, 10) : ''),
    end_date: emp.contract_end ? String(emp.contract_end).slice(0, 10) : '',
    qualifications: (hr.qualifications?.length ? hr.qualifications : [emptyQual()]),
    experience: (hr.experience?.length ? hr.experience : [emptyExp()]),
    enable_system_access: emp.account_enabled !== false,
    login_email: emp.email && !isPlaceholderStaffEmail(emp.email) ? emp.email : '',
    login_username: emp.username || '',
    login_password: '',
    login_password_confirm: '',
    send_welcome_email: true,
  };
}
