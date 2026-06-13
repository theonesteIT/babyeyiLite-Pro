import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UserPlus, Camera, Calendar, ChevronRight, ChevronLeft, Check,
  FileText, Mail, IdCard, GraduationCap, ClipboardList, BookOpen, Award,
  Paperclip, Upload, X, Plus, Loader2, Eye, KeyRound, Shield, RefreshCw, AtSign, FileSpreadsheet, AlertTriangle, Trash2,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { h } from '../../utils/href';
import { HrPageLayout, HrPanel, HrModal, HrBtnPrimary, HrBtnOutline } from './hrUi';
import {
  HR_DEPARTMENTS, RW_BANKS, STAFF_POSITIONS, CONTRACT_TYPES, rwProvinces,
  getNextStaffCode, suggestUsername, generateTempPassword, employeeToRegistrationForm, resolveStaffPhotoUrl,
} from './hrConstants';
import hrService from '../../services/hrService';
import staffService from '../../services/staffService';
import {
  downloadEmployeeImportTemplate,
  downloadMinimalEmployeeImportTemplate,
  downloadPayrollEmployeeImportTemplate,
  EMPLOYEE_IMPORT_TEMPLATE_HEADERS,
  MINIMAL_EMPLOYEE_IMPORT_HEADERS,
} from '../../utils/hrEmployeeImportTemplate';

const WIZARD_STEPS = [
  { title: 'Personal Information', short: 'Personal', desc: 'Basic personal details' },
  { title: 'Current Residence', short: 'Residence', desc: 'Address and contact' },
  { title: 'Personal Identification', short: 'Identification', desc: 'IDs and payment details' },
  { title: 'Next of Kin', short: 'Next of Kin', desc: 'Emergency contact' },
  { title: 'Qualifications', short: 'Qualifications', desc: 'Education and employment' },
  { title: 'System Access & Login', short: 'Access', desc: 'Portal account (optional)' },
  { title: 'Documents & Review', short: 'Documents', desc: 'Upload and submit' },
];

const inputCls =
  'w-full px-3 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#c87800]/50 focus:ring-2 focus:ring-[#FEBF10]/15';

const emptyQual = () => ({ level: '', institution: '', year: '', grade: '' });
const emptyExp = () => ({ employer: '', position: '', years: '' });

const INITIAL_FORM = {
  gender: '', first_name: '', middle_name: '', last_name: '', date_of_birth: '',
  father_names: '', mother_names: '', marital_status: '', nationality: '', nationality_other: '',
  birth_country: '', birth_country_other: '',
  birth_village: '', birth_cell: '', birth_sector: '', birth_district: '', birth_province: '',
  res_village: '', res_cell: '', res_sector: '', res_district: '', res_province: '',
  email: '', phone: '', alt_phone: '',
  id_document_number: '', rssb_number: '', medical_insurance: '', tin_number: '',
  payment_method: '', bank_name: '', account_number: '', account_holder: '',
  mobile_provider: '', mobile_money_number: '',
  kin_name: '', kin_relationship: '', kin_relationship_other: '', kin_phone: '', kin_email: '', kin_address: '',
  department: '', position_code: '', position_other: '', contract_type: '',
  start_date: '', end_date: '',
  qualifications: [emptyQual()], experience: [emptyExp()],
  enable_system_access: false,
  login_email: '',
  login_username: '',
  login_password: '',
  login_password_confirm: '',
  send_welcome_email: true,
};

/** Positions that use a Babyeyi Pro portal — auto-enable login step when selected */
const PRO_PORTAL_POSITION_CODES = new Set([
  'TEACHER', 'ACCOUNTANT', 'DOS', 'STORE_MANAGER', 'ASSETS_MANAGER', 'LIBRARIAN',
  'GATE_KEEPER', 'DISCIPLINE', 'SCHOOL_MANAGER', 'HR',
]);

const DOC_ITEMS = [
  { id: 'cv', label: 'CV / Resume', icon: FileText, required: true },
  { id: 'application_letter', label: 'Application Letter', icon: Mail, required: false },
  { id: 'national_id_copy', label: 'National ID Copy', icon: IdCard, required: false },
  { id: 'degree', label: 'Degree / Certificate', icon: GraduationCap, required: false },
  { id: 'contract', label: 'Signed Contract', icon: ClipboardList, required: false },
  { id: 'passport_copy', label: 'Passport Copy', icon: BookOpen, required: false },
  { id: 'certificates', label: 'Professional Certificates', icon: Award, required: false },
  { id: 'other', label: 'Other Attachments', icon: Paperclip, required: false },
];

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ACCEPT_PHOTO = 'image/jpeg,image/png,image/jpg';
const IMPORT_ALIASES = {
  first_name: ['first name', 'firstname', 'given name', 'f name'],
  middle_name: ['middle name', 'middlename', 'second name'],
  last_name: ['last name', 'lastname', 'surname', 'l name'],
  gender: ['gender', 'sex'],
  date_of_birth: ['date of birth', 'dob', 'birth date'],
  phone: ['phone', 'telephone', 'mobile'],
  alt_phone: ['alt phone', 'alternative phone', 'secondary phone'],
  email: ['email', 'mail'],
  marital_status: ['marital status', 'marital'],
  nationality: ['nationality', 'citizen'],
  birth_country: ['birth country', 'country of birth'],
  birth_province: ['birth province'],
  birth_district: ['birth district'],
  birth_sector: ['birth sector'],
  birth_cell: ['birth cell'],
  birth_village: ['birth village'],
  res_province: ['residence province', 'res province'],
  res_district: ['residence district', 'res district'],
  res_sector: ['residence sector', 'res sector'],
  res_cell: ['residence cell', 'res cell'],
  res_village: ['residence village', 'res village'],
  department: ['department', 'dept'],
  position_code: ['position code', 'position', 'role code'],
  contract_type: ['contract type', 'employment type', 'contract'],
  start_date: ['start date', 'date of employment', 'hire date'],
  end_date: ['end date', 'contract end date'],
  basic_salary: ['basic salary', 'basic sl', 'basic sl.', 'salary', 'payroll basic salary', 'payroll_basic_salary'],
  allowance_each: ['allowance each', 'allowance each t/h/others', 'allowance each t h others', 't/h/others', 'each allowance'],
  transport_allowance: ['transport allowance', 'transport allowance t/a', 't/a', 'ta'],
  housing_allowance: ['housing allowance', 'housing allowance h/a', 'h/a', 'ha'],
  others_allowance: ['others allowance', 'others', 'other allowance'],
  id_document_number: ['national id', 'id document number', 'nid'],
  rssb_number: ['rssb number', 'rssb', 'rssb number(rama)', 'rssb number (rama)'],
  medical_insurance: ['medical insurance', 'insurance number'],
  tin_number: ['tin number', 'tax number', 'tin'],
  payment_method: ['payment method', 'payroll payment method'],
  bank_name: ['bank name'],
  account_number: ['bank account number', 'account number'],
  account_holder: ['bank account holder', 'account holder'],
  mobile_provider: ['mobile provider'],
  mobile_money_number: ['mobile money number', 'momo number'],
  kin_name: ['next of kin name', 'kin name', 'emergency contact name'],
  kin_relationship: ['next of kin relationship', 'kin relationship'],
  kin_phone: ['next of kin phone', 'kin phone', 'emergency contact phone'],
  kin_email: ['next of kin email', 'kin email'],
  kin_address: ['next of kin address', 'kin address'],
  qualification_level: ['qualification level', 'education level', 'qualification'],
  qualification_institution: ['qualification institution', 'institution', 'school'],
  qualification_year: ['qualification year', 'education year'],
  qualification_grade: ['qualification grade', 'education grade'],
};

const IMPORT_PREVIEW_HEADER_TO_KEY = {
  'First Name': 'first_name',
  'Middle Name': 'middle_name',
  'Last Name': 'last_name',
  Gender: 'gender',
  'Date of Birth': 'date_of_birth',
  Phone: 'phone',
  'Alt Phone': 'alt_phone',
  Email: 'email',
  'Marital Status': 'marital_status',
  Nationality: 'nationality',
  'Birth Country': 'birth_country',
  'Birth Province': 'birth_province',
  'Birth District': 'birth_district',
  'Birth Sector': 'birth_sector',
  'Birth Cell': 'birth_cell',
  'Birth Village': 'birth_village',
  'Residence Province': 'res_province',
  'Residence District': 'res_district',
  'Residence Sector': 'res_sector',
  'Residence Cell': 'res_cell',
  'Residence Village': 'res_village',
  Department: 'department',
  'Position Code': 'position_code',
  'Contract Type': 'contract_type',
  'Start Date': 'start_date',
  'End Date': 'end_date',
  'Basic Salary': 'basic_salary',
  'Allowance Each (T/H/Others)': 'allowance_each',
  'Transport Allowance (T/A)': 'transport_allowance',
  'Housing Allowance (H/A)': 'housing_allowance',
  'Others Allowance': 'others_allowance',
  'National ID': 'id_document_number',
  'RSSB Number': 'rssb_number',
  'Medical Insurance': 'medical_insurance',
  'TIN Number': 'tin_number',
  'Payment Method': 'payment_method',
  'Bank Name': 'bank_name',
  'Bank Account Number': 'account_number',
  'Bank Account Holder': 'account_holder',
  'Mobile Provider': 'mobile_provider',
  'Mobile Money Number': 'mobile_money_number',
  'Next of Kin Name': 'kin_name',
  'Next of Kin Relationship': 'kin_relationship',
  'Next of Kin Phone': 'kin_phone',
  'Next of Kin Email': 'kin_email',
  'Next of Kin Address': 'kin_address',
  'Qualification Level': 'qualification_level',
  'Qualification Institution': 'qualification_institution',
  'Qualification Year': 'qualification_year',
  'Qualification Grade': 'qualification_grade',
};

/** Default columns for payroll roster files (includes optional allowance columns). */
const IMPORT_MINIMAL_PREVIEW_HEADERS = MINIMAL_EMPLOYEE_IMPORT_HEADERS;

const IMPORT_FIELD_PREVIEW_LABEL = {
  rssb_number: 'RSSB Number',
  id_document_number: 'National ID',
  first_name: 'First Name',
  last_name: 'Last Name',
  gender: 'Gender',
  basic_salary: 'Basic Salary',
  payment_method: 'Payment Method',
  bank_name: 'Bank Name',
  account_number: 'Bank Account Number',
  account_holder: 'Bank Account Holder',
  phone: 'Phone',
  email: 'Email',
};

const IMPORT_PREVIEW_COLUMN_ORDER = [
  'rssb_number', 'id_document_number', 'first_name', 'last_name', 'gender', 'basic_salary',
  'payment_method', 'bank_name', 'account_number', 'account_holder', 'phone', 'email',
  'department', 'position_code', 'contract_type', 'start_date',
];

/** Optional — empty shows warning; not auto-filled from sample defaults */
const IMPORT_OPTIONAL_TRACK = [
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'id_document_number', label: 'National ID' },
  { key: 'rssb_number', label: 'RSSB Number' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'basic_salary', label: 'Basic Salary' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'department', label: 'Department' },
  { key: 'position_code', label: 'Position Code' },
  { key: 'contract_type', label: 'Contract Type' },
  { key: 'start_date', label: 'Start Date' },
];

function normalizeHeader(v) {
  return String(v || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[()]/g, '');
}

/** Parse salary / numeric cells (commas, Excel numbers). */
function parseSalaryValue(val) {
  if (val == null || val === '' || val === '-') return '';
  if (typeof val === 'number' && Number.isFinite(val)) return String(Math.round(val));
  const s = String(val).trim().replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : '';
}

/** Optional per-employee register allowances (accountant import). */
function applyPayrollAllowancesFromRow(row, payload, { include } = {}) {
  const ok = (key) => !include || include(key);
  const each = ok('allowance_each') ? parseSalaryValue(row.allowance_each) : '';
  let transport = ok('transport_allowance') ? parseSalaryValue(row.transport_allowance) : '';
  let housing = ok('housing_allowance') ? parseSalaryValue(row.housing_allowance) : '';
  let others = ok('others_allowance') ? parseSalaryValue(row.others_allowance) : '';
  if (each) {
    transport = each;
    housing = each;
    others = each;
  }
  if (transport) payload.payroll_transport_allowance = Number(transport);
  if (housing) payload.payroll_housing_allowance = Number(housing);
  if (others) {
    payload.payroll_other_allowances = [{ label: 'Others', amount: Number(others) }];
  }
}

/** Keep bank account & national ID as full digit strings (avoid scientific notation loss). */
function parseSpreadsheetIdNumber(val) {
  if (val == null || val === '') return '';
  if (typeof val === 'number' && Number.isFinite(val)) {
    if (Math.abs(val) >= 1e15) return val.toFixed(0);
    if (Math.abs(val) >= 1e10) return String(Math.trunc(val));
    return String(val);
  }
  const s = String(val).trim();
  if (!s || s === '-') return '';
  const sci = s.match(/^([\d.]+)\s*[eE]\+?\s*(\d+)$/);
  if (sci) {
    const mantissa = parseFloat(sci[1]);
    const exp = parseInt(sci[2], 10);
    if (Number.isFinite(mantissa) && Number.isFinite(exp)) {
      return String(Math.round(mantissa * 10 ** exp));
    }
  }
  return s.replace(/,/g, '');
}

function detectImportPreviewHeaders(rawRows = []) {
  if (!rawRows.length) return [...IMPORT_MINIMAL_PREVIEW_HEADERS];
  const raw = rawRows[0];
  const found = [];
  for (const field of IMPORT_PREVIEW_COLUMN_ORDER) {
    const aliases = IMPORT_ALIASES[field] || [];
    const hasCol = Object.keys(raw).some((k) => {
      const nh = normalizeHeader(k);
      return aliases.some((a) => nh === a || nh === normalizeHeader(a));
    });
    if (hasCol) found.push(IMPORT_FIELD_PREVIEW_LABEL[field] || field);
  }
  return found.length ? found : [...IMPORT_MINIMAL_PREVIEW_HEADERS];
}

function previewHeaderToRowKey(header) {
  return IMPORT_PREVIEW_HEADER_TO_KEY[header]
    || Object.entries(IMPORT_FIELD_PREVIEW_LABEL).find(([, label]) => label === header)?.[0]
    || null;
}

function normalizeGenderImport(value) {
  const g = String(value || '').trim().toUpperCase();
  if (g === 'F' || g === 'FEMALE') return 'Female';
  if (g === 'M' || g === 'MALE') return 'Male';
  return String(value || '').trim();
}

function detectImportProfile(rows = []) {
  if (!rows.length) return 'full';
  const headerKeys = Object.keys(rows[0] || {}).map((k) => normalizeHeader(k));
  const hasRssbOrNid = headerKeys.some((k) => k.includes('rssb') || k.includes('national id') || k === 'nid');
  const hasEmploymentCols = headerKeys.some((k) => k === 'department' || k === 'dept' || k.includes('position') || k.includes('contract type'));
  if (hasRssbOrNid && !hasEmploymentCols) return 'minimal';
  return 'full';
}

/** Which template columns had a non-empty value in this spreadsheet row. */
function detectPresentImportFields(raw = {}) {
  const present = new Set();
  for (const [fieldKey, aliases] of Object.entries(IMPORT_ALIASES)) {
    for (const alias of aliases) {
      const na = normalizeHeader(alias);
      const matchKey = Object.keys(raw).find((k) => {
        const nh = normalizeHeader(k);
        return nh === na || nh === alias || nh.endsWith(na) || nh.startsWith(na);
      });
      if (matchKey == null || matchKey === '') continue;
      const val = raw[matchKey];
      if (val == null || val === '') continue;
      const s = String(val).trim();
      if (s && s !== '-') present.add(fieldKey);
      break;
    }
  }
  return present;
}

function collectRowMissingFields(row, { forCreate = false } = {}) {
  const missing = [];
  const present = row.presentFields;

  if (forCreate) {
    if (!String(row.first_name || '').trim()) missing.push('First Name');
    if (!String(row.last_name || '').trim()) missing.push('Last Name');
    if (!String(row.gender || '').trim()) missing.push('Gender');
  }

  if (!String(row.id_document_number || '').trim() && !String(row.rssb_number || '').trim()) {
    missing.push('National ID or RSSB');
  }

  for (const { key, label } of IMPORT_OPTIONAL_TRACK) {
    if (present?.size && !present.has(key)) continue;
    if (!String(row[key] || '').trim()) missing.push(label);
  }
  return missing;
}

function findDuplicateProblems(rows, existingStaff = []) {
  const duplicateProblems = [];
  const fileEmailMap = new Map();
  const filePhoneMap = new Map();
  const fileNidMap = new Map();
  const fileRssbMap = new Map();
  const norm = normImportKey;
  const staffRows = enrichStaffForImportMatch(existingStaff);

  const existingEmails = new Set(staffRows.map((s) => norm(s.email)).filter(Boolean));
  const existingPhones = new Set(staffRows.map((s) => String(s.phone || '').trim()).filter(Boolean));
  const existingRssb = new Set(
    staffRows.map((s) => norm(s.rssb_number || parseHrProfile(s).rssb_number)).filter(Boolean)
  );

  rows.forEach((r) => {
    const email = norm(r.email);
    const phone = String(r.phone || '').trim();
    const nid = norm(r.id_document_number);
    const rssb = norm(r.rssb_number);
    const nidExists = nid && staffRows.some((s) => staffMatchesNationalId(s, nid));

    if (email) {
      if (existingEmails.has(email)) duplicateProblems.push({ rowNo: r.rowNo, type: 'Email', value: email, source: 'already exists in system' });
      if (fileEmailMap.has(email)) duplicateProblems.push({ rowNo: r.rowNo, type: 'Email', value: email, source: `duplicate of row ${fileEmailMap.get(email)}` });
      else fileEmailMap.set(email, r.rowNo);
    }
    if (phone) {
      if (existingPhones.has(phone)) duplicateProblems.push({ rowNo: r.rowNo, type: 'Phone', value: phone, source: 'already exists in system' });
      if (filePhoneMap.has(phone)) duplicateProblems.push({ rowNo: r.rowNo, type: 'Phone', value: phone, source: `duplicate of row ${filePhoneMap.get(phone)}` });
      else filePhoneMap.set(phone, r.rowNo);
    }
    if (nid) {
      if (nidExists) {
        duplicateProblems.push({ rowNo: r.rowNo, type: 'National ID', value: r.id_document_number, source: 'already exists in system' });
      }
      if (fileNidMap.has(nid)) duplicateProblems.push({ rowNo: r.rowNo, type: 'National ID', value: r.id_document_number, source: `duplicate of row ${fileNidMap.get(nid)}` });
      else fileNidMap.set(nid, r.rowNo);
    }
    if (rssb) {
      if (existingRssb.has(rssb)) duplicateProblems.push({ rowNo: r.rowNo, type: 'RSSB', value: r.rssb_number, source: 'already exists in system' });
      if (fileRssbMap.has(rssb)) duplicateProblems.push({ rowNo: r.rowNo, type: 'RSSB', value: r.rssb_number, source: `duplicate of row ${fileRssbMap.get(rssb)}` });
      else fileRssbMap.set(rssb, r.rowNo);
    }
  });

  return duplicateProblems;
}

function isExistingRecordConflict(message = '', status) {
  if (Number(status) === 409) return true;
  return /already in use|already exists|duplicate entry/i.test(String(message));
}

function extractConflictUserId(err) {
  const data = err?.response?.data;
  return Number(data?.existingUserId || data?.existing_user_id || 0) || null;
}

async function reloadStaffSnapshotForImport() {
  const staffRes = await staffService.getStaff();
  return staffRes?.success ? enrichStaffForImportMatch(staffRes.data || []) : [];
}

function formatImportErrorMessage(err) {
  const msg = err?.response?.data?.message || err?.message || 'Import failed';
  if (/route not found/i.test(String(msg))) {
    return 'Server API is out of date — deploy the latest backend (staff update routes), then retry import.';
  }
  if (/staff member not found/i.test(String(msg))) {
    return 'Employee login exists but is not linked to your school staff list. Deploy the latest backend and retry import.';
  }
  return msg;
}

function patchStaffSnapshotAfterImport(staffSnapshot, row, userId, hrPayload) {
  const mergedHr = mergeHrProfileFromImport({ hr_profile_json: hrPayload }, row);
  const patched = {
    id: userId,
    user_id: userId,
    national_id: row.id_document_number,
    email: row.email,
    phone: row.phone,
    rssb_number: row.rssb_number,
    hr_profile_json: mergedHr,
    hr_profile: mergedHr,
  };
  const idx = staffSnapshot.findIndex((s) => staffRecordId(s) === userId);
  if (idx >= 0) staffSnapshot[idx] = { ...staffSnapshot[idx], ...patched };
  else staffSnapshot.push(patched);
  return staffSnapshot;
}

async function fetchStaffForImportLookup(row) {
  try {
    const res = await staffService.lookupStaffForImport({
      national_id: row.id_document_number,
      rssb_number: row.rssb_number,
    });
    if (res?.success && res.data) {
      return enrichStaffForImportMatch([res.data])[0];
    }
  } catch {
    /* not found */
  }
  return null;
}

async function resolveImportConflictAndUpdate(row, err, staffSnapshot) {
  try {
    const importPayload = buildEmployeeImportPayload(row, staffSnapshot);
    const res = await hrService.registerEmployee(importPayload, null, null);
    if (res?.success) {
      const userId = Number(res.data?.id || res.data?.user_id || extractConflictUserId(err) || 0) || null;
      if (userId) patchStaffSnapshotAfterImport(staffSnapshot, row, userId, importPayload.hr_profile_json);
      return { updated: true, staffSnapshot };
    }
  } catch {
    /* fall through to direct PATCH */
  }

  const conflictUserId = extractConflictUserId(err);
  let staff = null;

  if (conflictUserId) {
    staff = staffSnapshot.find((s) => staffRecordId(s) === conflictUserId) || null;
  }
  if (!staff) {
    const refreshed = await reloadStaffSnapshotForImport();
    staffSnapshot.length = 0;
    staffSnapshot.push(...refreshed);
    if (conflictUserId) {
      staff = staffSnapshot.find((s) => staffRecordId(s) === conflictUserId) || null;
    }
    if (!staff) {
      const lookup = findStaffForUpsert(row, staffSnapshot);
      if (lookup.staff) staff = lookup.staff;
    }
    if (!staff) {
      staff = await fetchStaffForImportLookup(row);
      if (staff) staffSnapshot.push(staff);
    }
    if (!staff && conflictUserId) {
      staff = { id: conflictUserId, user_id: conflictUserId };
    }
  }

  if (!staff) return { updated: false, staffSnapshot };

  await applyStaffRowUpdate(row, staff, staffSnapshot);
  return { updated: true, staffSnapshot };
}

function staffRecordId(s) {
  return Number(s?.user_id ?? s?.id ?? s?.staffUserId ?? 0) || null;
}

function parseHrProfile(staff) {
  if (staff?.hr_profile && typeof staff.hr_profile === 'object') return staff.hr_profile;
  if (typeof staff?.hr_profile === 'string') {
    try { return JSON.parse(staff.hr_profile || '{}'); } catch { return {}; }
  }
  if (staff?.hr_profile_json != null) {
    try {
      return typeof staff.hr_profile_json === 'string'
        ? JSON.parse(staff.hr_profile_json || '{}')
        : (staff.hr_profile_json || {});
    } catch {
      return {};
    }
  }
  return {};
}

function normImportKey(v) {
  return String(v || '').trim().toLowerCase();
}

/** Excel sometimes truncates long national IDs — allow near-matches. */
function nationalIdsMatch(a, b) {
  const x = normImportKey(a);
  const y = normImportKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 8 && y.length >= 8) {
    if (x.startsWith(y) || y.startsWith(x)) return Math.abs(x.length - y.length) <= 3;
    if (x.endsWith(y) || y.endsWith(x)) return Math.abs(x.length - y.length) <= 3;
  }
  return false;
}

function staffIdentityValues(staff) {
  const hr = parseHrProfile(staff);
  return [
    staff?.national_id,
    staff?.passport_number,
    hr?.national_id,
  ].map(normImportKey).filter(Boolean);
}

function enrichStaffForImportMatch(staffList = []) {
  return (staffList || []).map((s) => {
    const hr = parseHrProfile(s);
    return {
      ...s,
      hr_profile: hr,
      national_id: s.national_id || hr.national_id || '',
      rssb_number: hr.rssb_number || s.rssb_number || '',
    };
  });
}

function staffMatchesNationalId(staff, rowNid) {
  const nid = normImportKey(rowNid);
  if (!nid) return false;
  return staffIdentityValues(staff).some((v) => nationalIdsMatch(v, nid));
}

/** Find directory staff that block importing this spreadsheet row. */
function findExistingStaffForImportRow(row, existingStaff = []) {
  const norm = normImportKey;
  const nid = norm(row.id_document_number);
  const email = norm(row.email);
  const phone = String(row.phone || '').trim();
  const rssb = norm(row.rssb_number);
  const byId = new Map();
  const staffRows = enrichStaffForImportMatch(existingStaff);

  for (const s of staffRows) {
    const id = staffRecordId(s);
    if (!id) continue;
    const hr = parseHrProfile(s);
    const match =
      (nid && staffMatchesNationalId(s, nid))
      || (email && norm(s.email) === email)
      || (phone && String(s.phone || '').trim() === phone)
      || (rssb && norm(hr.rssb_number || s.rssb_number) === rssb);
    if (match) byId.set(id, s);
  }
  return [...byId.values()];
}

function mergeHrProfileFromImport(staff, row) {
  const hr = parseHrProfile(staff);
  const present = row.presentFields;
  const include = (key) => !present?.size || present.has(key);
  const missingFields = row.missingFields || collectRowMissingFields(row);
  const merged = { ...hr };
  if (include('rssb_number') && row.rssb_number) merged.rssb_number = String(row.rssb_number).trim();
  if (include('id_document_number') && row.id_document_number) {
    merged.national_id = String(row.id_document_number).trim();
  }
  if (include('middle_name') && row.middle_name) merged.middle_name = row.middle_name;
  if (include('medical_insurance') && row.medical_insurance) merged.medical_insurance = row.medical_insurance;
  if (include('tin_number') && row.tin_number) merged.tin_number = row.tin_number;
  if (include('marital_status') && row.marital_status) merged.marital_status = row.marital_status;
  if (include('nationality') && row.nationality) merged.nationality = row.nationality;
  if (include('kin_name') && row.kin_name) {
    merged.next_of_kin = { ...(merged.next_of_kin || {}), name: row.kin_name };
  }
  if (include('kin_phone') && row.kin_phone) {
    merged.next_of_kin = { ...(merged.next_of_kin || {}), phone: row.kin_phone };
  }
  merged.import_missing_fields = missingFields;
  merged.profile_incomplete = missingFields.length > 0;
  merged.last_import_at = new Date().toISOString();
  return merged;
}

/** Match existing directory record — National ID first, then phone/email/RSSB. */
function findStaffForUpsert(row, existingStaff = []) {
  const staffRows = enrichStaffForImportMatch(existingStaff);
  const nid = normImportKey(row.id_document_number);

  if (nid) {
    const byNid = staffRows.filter((s) => staffMatchesNationalId(s, nid));
    if (byNid.length === 1) return { staff: byNid[0] };
    if (byNid.length > 1) {
      return { error: `Row ${row.rowNo}: multiple employees share National ID ${row.id_document_number}` };
    }
  }

  const others = findExistingStaffForImportRow(row, staffRows);
  if (others.length === 1) return { staff: others[0] };
  if (others.length > 1) {
    return { error: `Row ${row.rowNo}: multiple directory matches (use unique National ID)` };
  }
  return { staff: null };
}

async function applyStaffRowUpdate(row, staff, staffSnapshot) {
  const userId = staffRecordId(staff);
  if (!userId) throw new Error('Matched employee has no user id');
  const payload = buildEmployeeUpdatePayload(row, staff, { onlyPresentFields: !!row.presentFields?.size });
  try {
    const res = await hrService.updateEmployee(userId, payload, null, null);
    if (!res?.success) throw new Error(res?.message || 'Update failed');
    const mergedHr = mergeHrProfileFromImport(staff, row);
    const patched = {
      ...staff,
      id: userId,
      user_id: userId,
      first_name: payload.first_name || staff.first_name,
      last_name: payload.last_name || staff.last_name,
      full_name: payload.full_name || staff.full_name,
      national_id: payload.national_id || staff.national_id,
      payroll_basic_salary: payload.payroll_basic_salary ?? staff.payroll_basic_salary,
      hr_profile_json: mergedHr,
      hr_profile: mergedHr,
    };
    const idx = staffSnapshot.findIndex((s) => staffRecordId(s) === userId);
    if (idx >= 0) staffSnapshot[idx] = patched;
    else staffSnapshot.push(patched);
    return staffSnapshot;
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '';
    if (!/staff member not found/i.test(msg)) throw err;
    const importPayload = buildEmployeeImportPayload(row, staffSnapshot);
    const res = await hrService.registerEmployee(importPayload, null, null);
    if (!res?.success) throw new Error(res?.message || msg);
    const resolvedId = Number(res.data?.id || res.data?.user_id || userId) || userId;
    return patchStaffSnapshotAfterImport(staffSnapshot, row, resolvedId, importPayload.hr_profile_json);
  }
}

function buildEmployeeUpdatePayload(row, staff, { onlyPresentFields = false } = {}) {
  const present = row.presentFields;
  const include = (key) => !onlyPresentFields || !present?.size || present.has(key);
  const firstName = String(row.first_name || '').trim();
  const lastName = String(row.last_name || '').trim();
  const payload = {};
  if (include('first_name') && firstName) payload.first_name = firstName;
  if (include('last_name') && lastName) payload.last_name = lastName;
  if ((include('first_name') || include('last_name')) && (firstName || lastName)) {
    payload.full_name = [firstName, include('middle_name') ? row.middle_name : '', lastName].filter(Boolean).join(' ').trim()
      || staff.full_name
      || `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
  }
  if (include('gender') && row.gender) payload.gender = normalizeGenderImport(row.gender);
  if (include('id_document_number') && row.id_document_number) {
    const nextNid = String(row.id_document_number).trim();
    const currentNid = String(staff.national_id || parseHrProfile(staff).national_id || '').trim();
    if (!currentNid || nationalIdsMatch(currentNid, nextNid)) {
      payload.national_id = nextNid;
    }
  }
  if (include('phone') && row.phone) payload.phone = row.phone;
  if (include('email') && row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email).trim())) {
    payload.email = String(row.email).trim().toLowerCase();
  }
  if (include('department') && row.department) payload.department = row.department;
  if (include('contract_type') && row.contract_type) payload.employment_type = row.contract_type;
  if (include('start_date') && row.start_date) {
    payload.date_of_employment = row.start_date;
    payload.contract_start_date = row.start_date;
  }
  if (include('end_date') && row.end_date) payload.contract_end_date = row.end_date;
  if (include('basic_salary')) {
    const basicNum = parseSalaryValue(row.basic_salary);
    if (basicNum) payload.payroll_basic_salary = Number(basicNum);
  }
  applyPayrollAllowancesFromRow(row, payload, { include });
  if (include('payment_method') && row.payment_method) payload.payroll_payment_method = row.payment_method;
  if (include('bank_name') && row.bank_name) payload.payroll_bank_name = row.bank_name;
  if (include('account_number') && row.account_number) payload.payroll_account_number = row.account_number;
  if (include('account_holder') && row.account_holder) payload.payroll_account_holder = row.account_holder;
  if (include('mobile_money_number') && row.mobile_money_number) {
    payload.payroll_mobile_money_phone = row.mobile_money_number;
  }
  payload.hr_profile_json = mergeHrProfileFromImport(staff, row);
  return payload;
}

function buildEmployeeImportPayload(row, existingStaff) {
  const firstName = String(row.first_name || '').trim() || `Employee-${row.rowNo}`;
  const lastName = String(row.last_name || '').trim() || '-';
  const gender = String(row.gender || '').trim() || 'Not specified';
  const missingFields = row.missingFields || collectRowMissingFields(row, { forCreate: true });
  const positionCode = String(row.position_code || '').trim();
  const roleCode = positionCode || 'STAFF';
  const payload = {
    first_name: firstName,
    last_name: lastName,
    full_name: [firstName, row.middle_name, lastName].filter(Boolean).join(' ').trim(),
    gender,
    date_of_birth: row.date_of_birth || null,
    national_id: row.id_document_number || null,
    passport_number: null,
    phone: row.phone || null,
    email: row.email || null,
    address: [row.res_village, row.res_cell, row.res_sector, row.res_district, row.res_province].filter(Boolean).join(', ') || null,
    staff_id: getNextStaffCode(roleCode, existingStaff),
    role_code: roleCode,
    custom_role_name: null,
    job_title: positionCode
      ? (STAFF_POSITIONS.find((p) => p.code === positionCode)?.label || positionCode)
      : null,
    employment_type: row.contract_type || null,
    date_of_employment: row.start_date || null,
    contract_start_date: row.start_date || null,
    contract_end_date: row.end_date || null,
    employment_status: 'Active',
    department: row.department || null,
    payroll_payment_method: row.payment_method || null,
    payroll_bank_name: row.bank_name || null,
    payroll_account_number: row.account_number || null,
    payroll_account_holder: row.account_holder || null,
    payroll_mobile_money_phone: row.mobile_money_number || null,
    account_enabled: false,
    is_active: true,
    import_upsert: true,
    hr_profile_json: {
      middle_name: row.middle_name || '',
      marital_status: row.marital_status || '',
      nationality: row.nationality || '',
      birth_country: row.birth_country || '',
      birth_place: {
        village: row.birth_village || '',
        cell: row.birth_cell || '',
        sector: row.birth_sector || '',
        district: row.birth_district || '',
        province: row.birth_province || '',
      },
      residence: {
        village: row.res_village || '',
        cell: row.res_cell || '',
        sector: row.res_sector || '',
        district: row.res_district || '',
        province: row.res_province || '',
      },
      alt_phone: row.alt_phone || '',
      rssb_number: row.rssb_number || '',
      medical_insurance: row.medical_insurance || '',
      tin_number: row.tin_number || '',
      mobile_provider: row.mobile_provider || '',
      next_of_kin: {
        name: row.kin_name || '',
        relationship: row.kin_relationship || '',
        phone: row.kin_phone || '',
        email: row.kin_email || '',
        address: row.kin_address || '',
      },
      qualifications: row.qualification_level || row.qualification_institution ? [{
        level: row.qualification_level || '',
        institution: row.qualification_institution || '',
        year: row.qualification_year || '',
        grade: row.qualification_grade || '',
      }] : [],
      contract_ongoing: !row.end_date,
      import_missing_fields: missingFields,
      profile_incomplete: missingFields.length > 0,
    },
    ...(parseSalaryValue(row.basic_salary) ? { payroll_basic_salary: Number(parseSalaryValue(row.basic_salary)) } : {}),
  };
  applyPayrollAllowancesFromRow(row, payload);
  return payload;
}


function toIsoDate(value) {
  if (!value && value !== 0) return '';
  if (typeof value === 'number') {
    const dt = XLSX.SSF.parse_date_code(value);
    if (!dt) return '';
    const mm = String(dt.m).padStart(2, '0');
    const dd = String(dt.d).padStart(2, '0');
    return `${dt.y}-${mm}-${dd}`;
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const asDate = new Date(raw);
  if (Number.isNaN(asDate.getTime())) return raw;
  return asDate.toISOString().slice(0, 10);
}

function Field({ label, type = 'text', placeholder, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-slate-500 uppercase tracking-wide mb-1.5" style={{ fontWeight: 500 }}>
        {label}
        {required ? <span className="text-red-500 ml-0.5">*</span> : null}
      </label>
      {children || <input type={type} placeholder={placeholder} className={inputCls} style={{ fontWeight: 500 }} />}
    </div>
  );
}

function TextInput({ value, onChange, type = 'text', placeholder, disabled, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ fontWeight: 500 }}
    />
  );
}

function SelectField({ label, options, required, className = '', value, onChange, placeholder = 'Select…', optionValue = (o) => o, optionLabel = (o) => o }) {
  return (
    <Field label={label} required={required} className={className}>
      <select
        className={inputCls}
        style={{ fontWeight: 500 }}
        value={value}
        onChange={onChange}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const val = optionValue(o);
          const lbl = optionLabel(o);
          return (
            <option key={String(val)} value={val}>{lbl}</option>
          );
        })}
      </select>
    </Field>
  );
}

function ProfilePhotoUpload({ preview, fileName, error, onPick, onClear }) {
  const inputRef = useRef(null);
  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pb-6 border-b border-slate-100">
      <div className="relative shrink-0 mx-auto sm:mx-0">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Profile preview" className="w-full h-full object-cover" />
          ) : (
            <UserPlus size={32} className="text-slate-300" strokeWidth={1.25} />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#c87800] text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-[#b36d00] transition-colors"
          aria-label="Upload photo"
        >
          <Camera size={16} strokeWidth={1.75} />
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT_PHOTO} className="sr-only" onChange={onPick} />
      </div>
      <div className="text-center sm:text-left flex flex-col justify-center gap-2 min-w-0">
        <p className="text-sm text-slate-600" style={{ fontWeight: 500 }}>Profile photo</p>
        <p className="text-xs text-slate-400">JPG or PNG, max 2MB</p>
        {fileName ? <p className="text-xs text-[#c87800] truncate max-w-[240px] mx-auto sm:mx-0">{fileName}</p> : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-[#c87800] text-xs hover:bg-amber-50" style={{ fontWeight: 500 }}>
            <Upload size={14} /> {preview ? 'Change photo' : 'Upload photo'}
          </button>
          {preview ? (
            <button type="button" onClick={onClear} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:bg-slate-100" style={{ fontWeight: 500 }}>
              <X size={14} /> Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodToggle({ value, onChange }) {
  const opts = [{ id: 'bank', label: 'Bank' }, { id: 'mobile_money', label: 'Mobile Money' }];
  return (
    <div className="col-span-full">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-2" style={{ fontWeight: 500 }}>
        Payment method <span className="text-red-500">*</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider border transition-colors ${
              value === o.id ? 'bg-[#c87800] border-[#c87800] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#c87800]/40'
            }`}
            style={{ fontWeight: 500 }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HorizontalStepper({ step, onStep }) {
  return (
    <div>
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex min-w-[42rem] md:min-w-0 gap-1 md:gap-0">
          {WIZARD_STEPS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button key={s.title} type="button" onClick={() => onStep(i)} className={`flex-1 min-w-[4.5rem] md:min-w-0 flex flex-col items-center px-1 py-2 rounded-xl transition-colors ${active ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all ${active ? 'bg-[#c87800] border-[#c87800] text-white' : done ? 'bg-amber-50 border-[#c87800] text-[#c87800]' : 'bg-white border-slate-200 text-slate-400'}`} style={{ fontWeight: 500 }}>
                  {done ? <Check size={14} strokeWidth={2} /> : i + 1}
                </div>
                <span className={`mt-2 text-[9px] md:text-[10px] text-center leading-tight line-clamp-2 ${active ? 'text-[#c87800]' : 'text-slate-500'}`} style={{ fontWeight: active ? 500 : 400 }}>
                  <span className="md:hidden">{s.short}</span>
                  <span className="hidden md:inline">{s.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#c87800] to-[#FEBF10] transition-all duration-500" style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%` }} />
      </div>
    </div>
  );
}

function ReviewSection({ title, rows }) {
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100">
        <p className="text-xs text-[#000435] uppercase tracking-wide" style={{ fontWeight: 500 }}>{title}</p>
      </div>
      <dl className="divide-y divide-slate-50">
        {rows.filter(([, v]) => v != null && String(v).trim() !== '').map(([k, v]) => (
          <div key={k} className="flex flex-col sm:flex-row sm:gap-4 px-4 py-2.5 text-sm">
            <dt className="text-slate-400 text-xs uppercase tracking-wide sm:w-40 shrink-0">{k}</dt>
            <dd className="text-slate-700 break-words" style={{ fontWeight: 500 }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function EmployeeRegistration() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employeeId } = useParams();
  const isEditMode = Boolean(employeeId);
  const inAccountant = location.pathname.startsWith('/accountant');
  const routePath = (path) => {
    if (!inAccountant) return h(path);
    const mapped = path
      .replace('/hr/directory/', '/payroll/employees/')
      .replace('/hr/directory', '/payroll/employees')
      .replace('/hr/registration', '/payroll/employees/import');
    return `/accountant${mapped}`;
  };
  const [storedStaffId, setStoredStaffId] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [departments, setDepartments] = useState(HR_DEPARTMENTS);
  const [existingStaff, setExistingStaff] = useState([]);
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [contractOngoing, setContractOngoing] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importIssues, setImportIssues] = useState([]);
  const [duplicateIssues, setDuplicateIssues] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importProfile, setImportProfile] = useState(inAccountant ? 'minimal' : 'full');
  const [importPreviewHeaders, setImportPreviewHeaders] = useState([...IMPORT_MINIMAL_PREVIEW_HEADERS]);
  const [dryRunSummary, setDryRunSummary] = useState(null);
  const [replaceNotice, setReplaceNotice] = useState('');
  const docInputRefs = useRef({});

  const refreshExistingStaff = useCallback(async () => {
    const staffRes = await staffService.getStaff();
    const rows = staffRes?.success ? enrichStaffForImportMatch(staffRes.data || []) : [];
    setExistingStaff(rows);
    return rows;
  }, []);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateQual = (index, key, value) => {
    setForm((prev) => {
      const list = [...prev.qualifications];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, qualifications: list };
    });
  };

  const updateExp = (index, key, value) => {
    setForm((prev) => {
      const list = [...prev.experience];
      list[index] = { ...list[index], [key]: value };
      return { ...prev, experience: list };
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, staffRes] = await Promise.all([
          hrService.getDepartments(),
          staffService.getStaff(),
        ]);
        if (deptRes?.success && deptRes.data?.length) {
          setDepartments(deptRes.data.map((d) => d.name));
        } else {
          await hrService.seedDefaultDepartments();
          const seeded = await hrService.getDepartments();
          if (seeded?.success && seeded.data?.length) {
            setDepartments(seeded.data.map((d) => d.name));
          }
        }
        if (staffRes?.success) setExistingStaff(enrichStaffForImportMatch(staffRes.data || []));

        if (isEditMode && employeeId) {
          setLoadingEdit(true);
          const res = await hrService.getEmployee(employeeId);
          if (res?.success && res.data) {
            const emp = res.data;
            setForm(employeeToRegistrationForm(emp));
            setStoredStaffId(emp.employee_id || '');
            setContractOngoing(!emp.contract_end);
            if (emp.photo) setProfilePreview(resolveStaffPhotoUrl(emp.photo));
            const docs = emp.hr_profile?.documents || {};
            setDocFiles(Object.fromEntries(
              Object.entries(docs).map(([k, val]) => {
                const norm = typeof val === 'string' ? { name: val, path: null } : { name: val?.name || '', path: val?.path || null };
                return [k, { name: norm.name, path: norm.path, existing: true }];
              })
            ));
          }
        }
      } catch {
        /* keep defaults */
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [isEditMode, employeeId]);

  const staffCodePreview = isEditMode && storedStaffId
    ? storedStaffId
    : getNextStaffCode(
      form.position_code === 'CUSTOM' ? form.position_other : form.position_code || 'TEACHER',
      existingStaff
    );

  const handleProfilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setProfileError('Please choose a JPG or PNG image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setProfileError('Image must be 2MB or smaller.');
      return;
    }
    setProfileError('');
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDocPick = (docId) => (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDocFiles((prev) => ({ ...prev, [docId]: { file, name: file.name, path: prev[docId]?.path || null } }));
  };

  const parseImportSheet = (rows = [], staffOverride = null) => {
    const staffForDupes = staffOverride ?? existingStaff;
    const normalized = rows
      .map((raw, idx) => {
        const getByAlias = (key) => {
          const aliases = IMPORT_ALIASES[key] || [];
          for (const alias of aliases) {
            const na = normalizeHeader(alias);
            const matchKey = Object.keys(raw).find((k) => {
              const nh = normalizeHeader(k);
              return nh === na || nh === alias || nh.endsWith(na) || nh.startsWith(na);
            });
            if (matchKey != null && matchKey !== '') return raw[matchKey];
          }
          return '';
        };
        const positionRaw = String(getByAlias('position_code') || '').trim();
        const foundPos = STAFF_POSITIONS.find(
          (p) => p.code === positionRaw.toUpperCase() || p.label.toLowerCase() === positionRaw.toLowerCase()
        );
        const presentFields = detectPresentImportFields(raw);
        return {
          rowNo: idx + 2,
          presentFields,
          first_name: String(getByAlias('first_name') || '').trim(),
          middle_name: String(getByAlias('middle_name') || '').trim(),
          last_name: String(getByAlias('last_name') || '').trim(),
          gender: normalizeGenderImport(getByAlias('gender')),
          date_of_birth: toIsoDate(getByAlias('date_of_birth')),
          phone: String(getByAlias('phone') || '').trim(),
          alt_phone: String(getByAlias('alt_phone') || '').trim(),
          email: String(getByAlias('email') || '').trim(),
          marital_status: String(getByAlias('marital_status') || '').trim(),
          nationality: String(getByAlias('nationality') || '').trim(),
          birth_country: String(getByAlias('birth_country') || '').trim(),
          birth_province: String(getByAlias('birth_province') || '').trim(),
          birth_district: String(getByAlias('birth_district') || '').trim(),
          birth_sector: String(getByAlias('birth_sector') || '').trim(),
          birth_cell: String(getByAlias('birth_cell') || '').trim(),
          birth_village: String(getByAlias('birth_village') || '').trim(),
          res_province: String(getByAlias('res_province') || '').trim(),
          res_district: String(getByAlias('res_district') || '').trim(),
          res_sector: String(getByAlias('res_sector') || '').trim(),
          res_cell: String(getByAlias('res_cell') || '').trim(),
          res_village: String(getByAlias('res_village') || '').trim(),
          department: String(getByAlias('department') || '').trim(),
          position_code: foundPos?.code || String(positionRaw || '').toUpperCase(),
          contract_type: String(getByAlias('contract_type') || '').trim(),
          start_date: toIsoDate(getByAlias('start_date')),
          end_date: toIsoDate(getByAlias('end_date')),
          basic_salary: parseSalaryValue(getByAlias('basic_salary')),
          id_document_number: parseSpreadsheetIdNumber(getByAlias('id_document_number'))
            || String(getByAlias('id_document_number') || '').trim(),
          rssb_number: parseSpreadsheetIdNumber(getByAlias('rssb_number'))
            || String(getByAlias('rssb_number') || '').trim(),
          medical_insurance: String(getByAlias('medical_insurance') || '').trim(),
          tin_number: String(getByAlias('tin_number') || '').trim(),
          payment_method: String(getByAlias('payment_method') || '').trim(),
          bank_name: String(getByAlias('bank_name') || '').trim(),
          account_number: parseSpreadsheetIdNumber(getByAlias('account_number'))
            || String(getByAlias('account_number') || '').trim(),
          account_holder: String(getByAlias('account_holder') || '').trim(),
          mobile_provider: String(getByAlias('mobile_provider') || '').trim(),
          mobile_money_number: String(getByAlias('mobile_money_number') || '').trim(),
          kin_name: String(getByAlias('kin_name') || '').trim(),
          kin_relationship: String(getByAlias('kin_relationship') || '').trim(),
          kin_phone: String(getByAlias('kin_phone') || '').trim(),
          kin_email: String(getByAlias('kin_email') || '').trim(),
          kin_address: String(getByAlias('kin_address') || '').trim(),
          qualification_level: String(getByAlias('qualification_level') || '').trim(),
          qualification_institution: String(getByAlias('qualification_institution') || '').trim(),
          qualification_year: String(getByAlias('qualification_year') || '').trim(),
          qualification_grade: String(getByAlias('qualification_grade') || '').trim(),
        };
      })
      .filter((r) => Object.keys(r)
        .filter((k) => k !== 'rowNo')
        .some((k) => String(r[k] || '').trim() !== '' && r[k] !== '-'));

    const issues = [];
    normalized.forEach((r) => {
      const missingFields = collectRowMissingFields(r);
      r.missingFields = missingFields;
      if (missingFields.length) {
        issues.push({ rowNo: r.rowNo, missing: missingFields });
      }
    });
    const duplicateProblems = findDuplicateProblems(normalized, staffForDupes);
    return { normalized, issues, duplicateProblems };
  };

  const isRowFileDuplicate = (rowNo) => duplicateIssues.some(
    (d) => d.rowNo === rowNo && String(d.source || '').includes('duplicate of row')
  );

  const isRowSystemExisting = (rowNo) => duplicateIssues.some(
    (d) => d.rowNo === rowNo && d.source === 'already exists in system'
  );

  /** Only in-file duplicates block import; system matches are updated (upsert). */
  const isRowDuplicate = (rowNo) => isRowFileDuplicate(rowNo);

  const getRowMissing = (rowNo) => {
    const fromRow = importRows.find((r) => r.rowNo === rowNo);
    if (fromRow?.missingFields?.length) return fromRow.missingFields;
    return importIssues.find((i) => i.rowNo === rowNo)?.missing || [];
  };

  const importableRowCount = () => importRows.filter((r) => !isRowDuplicate(r.rowNo)).length;

  const removeDuplicateRowsFromPreview = () => {
    const dupRows = new Set(duplicateIssues.map((d) => d.rowNo));
    const kept = importRows.filter((r) => !dupRows.has(r.rowNo));
    const dupProblems = findDuplicateProblems(kept, existingStaff);
    const issues = [];
    kept.forEach((r) => {
      const missingFields = collectRowMissingFields(r);
      r.missingFields = missingFields;
      if (missingFields.length) issues.push({ rowNo: r.rowNo, missing: missingFields });
    });
    setImportRows(kept);
    setImportIssues(issues);
    setDuplicateIssues(dupProblems);
    setDryRunSummary(null);
  };

  const buildFailedRowsExport = (rows, errorsByRow = new Map()) => {
    const exportRows = rows.filter((r) => errorsByRow.has(r.rowNo)).map((r) => ({
      Row: r.rowNo,
      'First Name': r.first_name,
      'Last Name': r.last_name,
      Gender: r.gender,
      Phone: r.phone,
      Email: r.email,
      Department: r.department,
      'Position Code': r.position_code,
      'Contract Type': r.contract_type,
      'Start Date': r.start_date,
      'End Date': r.end_date,
      'Basic Salary': r.basic_salary,
      Errors: errorsByRow.get(r.rowNo).join(' | '),
    }));
    if (!exportRows.length) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = Object.keys(exportRows[0]).map((k) => ({ wch: Math.max(14, String(k).length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Failed rows');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `employee-import-failed-rows-${stamp}.xlsx`);
  };

  const handleImportFilePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const staffRes = await staffService.getStaff();
      const staffRows = staffRes?.success ? enrichStaffForImportMatch(staffRes.data || []) : [];
      setExistingStaff(staffRows);

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames.find((n) => /employees/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
      const profile = detectImportProfile(json);
      setImportPreviewHeaders(detectImportPreviewHeaders(json));
      const { normalized, issues, duplicateProblems } = parseImportSheet(json, staffRows);
      setImportProfile(profile);
      setImportRows(normalized);
      setImportIssues(issues);
      setDuplicateIssues(duplicateProblems);
      setImportSummary(null);
      setDryRunSummary(null);
    } catch (err) {
      setImportRows([]);
      setImportIssues([{ rowNo: '-', missing: [err?.message || 'Failed to read excel file'] }]);
      setDuplicateIssues([]);
    }
  };

  const runImportDryRun = () => {
    if (!importRows.length) return;
    const fileDupCount = importRows.filter((r) => isRowFileDuplicate(r.rowNo)).length;
    const updateCount = importRows.filter((r) => isRowSystemExisting(r.rowNo)).length;
    const incompleteCount = importRows.filter(
      (r) => getRowMissing(r.rowNo).length > 0 && !isRowFileDuplicate(r.rowNo) && !isRowSystemExisting(r.rowNo)
    ).length;
    setDryRunSummary({
      total: importRows.length,
      ready: importRows.length - fileDupCount - incompleteCount,
      incomplete: incompleteCount,
      duplicate: fileDupCount,
      willUpdate: updateCount,
      importable: importableRowCount(),
    });
  };

  const importOrUpsertEmployeeRows = async (rowsToImport, staffList, { updateOnly = false } = {}) => {
    const errors = [];
    let createdCount = 0;
    let updatedCount = 0;
    let staffSnapshot = enrichStaffForImportMatch(staffList || []);

    for (const row of rowsToImport) {
      try {
        let lookup = findStaffForUpsert(row, staffSnapshot);
        if (lookup.error) throw new Error(lookup.error);

        if (!lookup.staff) {
          staffSnapshot = await reloadStaffSnapshotForImport();
          lookup = findStaffForUpsert(row, staffSnapshot);
          if (lookup.error) throw new Error(lookup.error);
        }

        if (!lookup.staff && !updateOnly) {
          lookup.staff = await fetchStaffForImportLookup(row);
          if (lookup.staff) staffSnapshot.push(lookup.staff);
        }

        if (lookup.staff) {
          await applyStaffRowUpdate(row, lookup.staff, staffSnapshot);
          updatedCount += 1;
        } else if (updateOnly) {
          const remote = await fetchStaffForImportLookup(row);
          if (remote) {
            await applyStaffRowUpdate(row, remote, staffSnapshot);
            updatedCount += 1;
          } else {
            throw new Error('No matching employee in directory (National ID / RSSB / phone / email)');
          }
        } else {
          try {
            const payload = buildEmployeeImportPayload(row, staffSnapshot);
            const res = await hrService.registerEmployee(payload, null, null);
            if (!res?.success) {
              const msg = res?.message || 'Import failed';
              if (isExistingRecordConflict(msg)) {
                const resolved = await resolveImportConflictAndUpdate(row, { response: { data: { message: msg, existingUserId: res?.existingUserId } } }, staffSnapshot);
                if (resolved.updated) {
                  updatedCount += 1;
                  continue;
                }
              }
              throw new Error(msg);
            }
            const wasUpdated = res?.data?.action === 'updated' || /updated/i.test(String(res?.message || ''));
            if (wasUpdated) {
              updatedCount += 1;
            } else {
              createdCount += 1;
            }
            staffSnapshot.push({
              id: res.data?.user_id || res.data?.id,
              national_id: row.id_document_number,
              email: row.email,
              phone: row.phone,
              rssb_number: row.rssb_number,
              hr_profile: { rssb_number: row.rssb_number, national_id: row.id_document_number },
              hr_profile_json: payload.hr_profile_json,
            });
          } catch (createErr) {
            const status = createErr?.response?.status;
            const msg = createErr?.response?.data?.message || createErr?.message || 'Import failed';
            if (isExistingRecordConflict(msg, status)) {
              const resolved = await resolveImportConflictAndUpdate(row, createErr, staffSnapshot);
              if (resolved.updated) {
                updatedCount += 1;
                continue;
              }
            }
            throw createErr;
          }
        }
      } catch (err) {
        errors.push({
          rowNo: row.rowNo,
          message: formatImportErrorMessage(err),
        });
      }
    }

    return {
      successCount: createdCount + updatedCount,
      createdCount,
      updatedCount,
      errors,
      staffSnapshot,
    };
  };

  const applyImportResult = (result, { navigateOnFullSuccess = true } = {}) => {
    const conflictRowNos = [...new Set(
      result.errors.filter((e) => isExistingRecordConflict(e.message)).map((e) => e.rowNo)
    )];
    setImportSummary({
      successCount: result.successCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      errorCount: result.errors.length,
      errors: result.errors,
      conflictRowNos,
    });
    if (!result.errors.length && navigateOnFullSuccess) {
      setShowImportModal(false);
      navigate(routePath('/hr/directory'));
    }
  };

  const handleImportEmployees = async () => {
    if (!importRows.length) return;
    setImporting(true);
    setReplaceNotice('');
    const rowsToImport = importRows.filter((r) => !isRowDuplicate(r.rowNo));
    const refreshed = await refreshExistingStaff();
    const systemRows = rowsToImport.filter((r) => isRowSystemExisting(r.rowNo));
    const newRows = rowsToImport.filter((r) => !isRowSystemExisting(r.rowNo));

    const updateResult = systemRows.length
      ? await importOrUpsertEmployeeRows(systemRows, refreshed, { updateOnly: true })
      : { successCount: 0, createdCount: 0, updatedCount: 0, errors: [], staffSnapshot: refreshed };

    const snapshotAfterUpdate = updateResult.staffSnapshot || refreshed;
    const createResult = newRows.length
      ? await importOrUpsertEmployeeRows(newRows, snapshotAfterUpdate)
      : { successCount: 0, createdCount: 0, updatedCount: 0, errors: [] };

    const result = {
      successCount: updateResult.successCount + createResult.successCount,
      createdCount: createResult.createdCount,
      updatedCount: updateResult.updatedCount,
      errors: [...updateResult.errors, ...createResult.errors],
      staffSnapshot: createResult.staffSnapshot || snapshotAfterUpdate,
    };

    const after = result.staffSnapshot || refreshed;
    setExistingStaff(after);
    setDuplicateIssues(findDuplicateProblems(importRows, after));
    setImporting(false);
    if (result.updatedCount > 0 || result.createdCount > 0) {
      setReplaceNotice(
        `Done: ${result.updatedCount} updated, ${result.createdCount} new employee(s) added.`
      );
    }
    applyImportResult(result);
  };

  const handleUpdateExistingFromFile = async (rowNos) => {
    if (!rowNos?.length) return;
    const rows = importRows.filter((r) => rowNos.includes(r.rowNo));
    const ok = window.confirm(
      `Update ${rows.length} existing employee(s) from your file?\n\n`
      + 'Matches by National ID first, then RSSB / phone / email.\n'
      + 'Existing payroll history and records are kept.\n\nContinue?'
    );
    if (!ok) return;

    setImporting(true);
    setReplaceNotice('');
    const refreshed = await refreshExistingStaff();
    const updateResult = await importOrUpsertEmployeeRows(rows, refreshed, { updateOnly: true });
    const remaining = importRows.filter(
      (r) => !rowNos.includes(r.rowNo) && !isRowFileDuplicate(r.rowNo)
    );
    const createResult = remaining.length
      ? await importOrUpsertEmployeeRows(remaining, updateResult.staffSnapshot || refreshed)
      : { successCount: 0, createdCount: 0, updatedCount: 0, errors: [] };

    const after = createResult.staffSnapshot || updateResult.staffSnapshot || refreshed;
    const allErrors = [...updateResult.errors, ...createResult.errors];
    const merged = {
      successCount: updateResult.successCount + createResult.successCount,
      createdCount: createResult.createdCount,
      updatedCount: updateResult.updatedCount,
      errors: allErrors,
    };
    setExistingStaff(after);
    setDuplicateIssues(findDuplicateProblems(importRows, after));
    setImporting(false);
    setReplaceNotice(
      `Updated ${updateResult.updatedCount}, added ${createResult.createdCount} new.`
      + (allErrors.length ? ` ${allErrors.length} row(s) still failed.` : '')
    );
    applyImportResult(merged, { navigateOnFullSuccess: !allErrors.length });
  };

  const collectStaffToReplace = (rowNos, staffList) => {
    const byId = new Map();
    for (const rowNo of rowNos) {
      const row = importRows.find((r) => r.rowNo === rowNo);
      if (!row) continue;
      for (const s of findExistingStaffForImportRow(row, staffList)) {
        const id = staffRecordId(s);
        if (id) byId.set(id, s);
      }
    }
    return [...byId.values()];
  };

  const systemDuplicateRowNos = useMemo(() => {
    const rows = new Set();
    duplicateIssues.forEach((d) => {
      if (d.source === 'already exists in system') rows.add(d.rowNo);
    });
    return [...rows];
  }, [duplicateIssues]);

  const handleDeleteExistingAndReimport = async (rowNos) => {
    if (!rowNos?.length) return;
    const refreshed = await refreshExistingStaff();
    let staffToRemove = collectStaffToReplace(rowNos, refreshed);
    if (!staffToRemove.length) {
      for (const rowNo of rowNos) {
        const row = importRows.find((r) => r.rowNo === rowNo);
        if (!row) continue;
        const remote = await fetchStaffForImportLookup(row);
        if (remote) staffToRemove.push(remote);
      }
    }
    if (!staffToRemove.length) {
      setReplaceNotice('No matching employees found in the directory. Refresh the page or check National ID / RSSB in the file.');
      return;
    }
    const names = staffToRemove.map((s) => s.name || s.full_name || `Staff #${staffRecordId(s)}`).slice(0, 6);
    const more = staffToRemove.length > 6 ? ` and ${staffToRemove.length - 6} more` : '';
    const ok = window.confirm(
      `This will permanently remove ${staffToRemove.length} existing employee record(s) from the directory:\n\n`
      + `${names.join('\n')}${more}\n\n`
      + `Then ${rowNos.length} row(s) from your file will be imported again with the new data.\n\nContinue?`
    );
    if (!ok) return;

    setImporting(true);
    setReplaceNotice('');
    const deleteFailed = [];
    for (const s of staffToRemove) {
      const id = staffRecordId(s);
      try {
        const res = await staffService.deleteStaff(id);
        if (!res?.success) deleteFailed.push(id);
      } catch {
        deleteFailed.push(id);
      }
    }
    const afterDelete = await refreshExistingStaff();
    const rowsToImport = importRows.filter((r) => rowNos.includes(r.rowNo));
    const result = await importOrUpsertEmployeeRows(rowsToImport, afterDelete);
    const dupProblems = findDuplicateProblems(importRows, afterDelete);
    setDuplicateIssues(dupProblems);
    setImporting(false);

    const conflictRowNos = [...new Set(
      result.errors.filter((e) => isExistingRecordConflict(e.message)).map((e) => e.rowNo)
    )];
    setImportSummary({
      successCount: result.successCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      errorCount: result.errors.length,
      errors: result.errors,
      conflictRowNos,
      replacedCount: staffToRemove.length - deleteFailed.length,
    });

    if (deleteFailed.length) {
      setReplaceNotice(
        `Removed ${staffToRemove.length - deleteFailed.length} record(s). ${deleteFailed.length} could not be deleted (protected account).`
      );
    } else if (!result.errors.length) {
      setReplaceNotice(`Removed ${staffToRemove.length} employee(s) and imported ${result.successCount} row(s) successfully.`);
      setTimeout(() => {
        setShowImportModal(false);
        navigate(routePath('/hr/directory'));
      }, 1200);
    } else {
      setReplaceNotice(
        `Removed ${staffToRemove.length - deleteFailed.length} existing record(s). Imported ${result.successCount}; ${result.errors.length} row(s) still failed.`
      );
    }
  };

  const downloadFailedImportRows = () => {
    if (!importSummary?.errors?.length) return;
    const errs = new Map();
    importSummary.errors.forEach((e) => {
      const prev = errs.get(e.rowNo) || [];
      errs.set(e.rowNo, [...prev, e.message]);
    });
    buildFailedRowsExport(importRows, errs);
  };

  const next = () => step < WIZARD_STEPS.length - 1 && setStep((s) => s + 1);
  const prev = () => step > 0 && setStep((s) => s - 1);
  const isLast = step === WIZARD_STEPS.length - 1;

  const positionLabel = () => {
    if (form.position_code === 'CUSTOM') return form.position_other || 'Others';
    return STAFF_POSITIONS.find((p) => p.code === form.position_code)?.label || form.position_code;
  };

  const buildHrProfile = () => ({
    middle_name: form.middle_name,
    father_names: form.father_names,
    mother_names: form.mother_names,
    marital_status: form.marital_status,
    nationality: form.nationality === 'Other' ? form.nationality_other : form.nationality,
    birth_country: form.birth_country === 'Other' ? form.birth_country_other : form.birth_country,
    birth_place: {
      village: form.birth_village, cell: form.birth_cell, sector: form.birth_sector,
      district: form.birth_district, province: form.birth_province,
    },
    residence: {
      village: form.res_village, cell: form.res_cell, sector: form.res_sector,
      district: form.res_district, province: form.res_province,
    },
    alt_phone: form.alt_phone,
    rssb_number: form.rssb_number,
    medical_insurance: form.medical_insurance,
    tin_number: form.tin_number,
    mobile_provider: form.mobile_provider,
    next_of_kin: {
      name: form.kin_name,
      relationship: form.kin_relationship === 'Other' ? form.kin_relationship_other : form.kin_relationship,
      phone: form.kin_phone,
      email: form.kin_email,
      address: form.kin_address,
    },
    qualifications: form.qualifications.filter((q) => q.level || q.institution),
    experience: form.experience.filter((e) => e.employer || e.position),
    documents: Object.fromEntries(
      Object.entries(docFiles)
        .map(([k, v]) => {
          const name = v?.name || v?.file?.name || '';
          if (!name) return null;
          if (v?.path) return [k, { name, path: v.path }];
          return [k, { name }];
        })
        .filter(Boolean)
    ),
    contract_ongoing: contractOngoing,
  });

  const buildPayload = () => {
    const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');
    const loginEmail = (form.login_email || form.email || '').trim().toLowerCase();
    const username = form.enable_system_access
      ? (form.login_username.trim() || suggestUsername(form.first_name, form.last_name, loginEmail || form.email))
      : suggestUsername(form.first_name, form.last_name, form.email);
    const roleCode = form.position_code === 'CUSTOM' ? 'CUSTOM' : form.position_code;
    const resAddress = [form.res_village, form.res_cell, form.res_sector, form.res_district, form.res_province].filter(Boolean).join(', ');
    const paymentMethod = form.payment_method === 'bank' ? 'Bank Transfer' : form.payment_method === 'mobile_money' ? 'Mobile Money' : null;

    return {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || '-',
      full_name: fullName,
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
      national_id: form.id_document_number.trim() || null,
      passport_number: null,
      phone: form.phone.trim() || null,
      email: form.enable_system_access ? (loginEmail || form.email.trim() || null) : (form.email.trim() || null),
      address: resAddress || null,
      staff_id: staffCodePreview,
      role_code: roleCode,
      custom_role_name: form.position_code === 'CUSTOM' ? form.position_other.trim() : null,
      job_title: positionLabel(),
      employment_type: form.contract_type,
      date_of_employment: form.start_date || null,
      contract_start_date: form.start_date || null,
      contract_end_date: contractOngoing ? null : (form.end_date || null),
      employment_status: 'Active',
      department: form.department,
      payroll_payment_method: paymentMethod,
      payroll_bank_name: form.payment_method === 'bank' ? form.bank_name : null,
      payroll_account_number: form.payment_method === 'bank' ? form.account_number : null,
      payroll_account_holder: form.payment_method === 'bank' ? form.account_holder : null,
      payroll_mobile_money_phone: form.payment_method === 'mobile_money' ? form.mobile_money_number : null,
      account_enabled: form.enable_system_access,
      is_active: form.enable_system_access,
      username,
      send_welcome_email: form.enable_system_access && form.send_welcome_email,
      hr_profile_json: buildHrProfile(),
      ...(form.enable_system_access && form.login_password.trim().length >= 8
        ? { password: form.login_password.trim() }
        : {}),
    };
  };

  const validateAccessStep = () => {
    if (!form.enable_system_access) return '';
    const email = (form.login_email || form.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'A valid login email is required when portal access is enabled.';
    }
    const un = form.login_username.trim();
    if (un.length < 3) return 'Username must be at least 3 characters.';
    if (!isEditMode || form.login_password) {
      if (form.login_password.length < 8) return 'Password must be at least 8 characters.';
      if (form.login_password !== form.login_password_confirm) return 'Passwords do not match.';
    }
    return '';
  };

  const handleNext = () => {
    if (step === 5) {
      const err = validateAccessStep();
      if (err) {
        setSubmitError(err);
        return;
      }
      setSubmitError('');
    }
    next();
  };

  const handleSave = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = buildPayload();
      if (isEditMode) {
        const res = await hrService.updateEmployee(employeeId, payload, profileFile, docFiles);
        if (res?.success) {
          setShowReview(false);
          navigate(routePath(`/hr/directory/${employeeId}`));
          return;
        }
        setSubmitError(res?.message || res?.data?.message || 'Update failed.');
      } else {
        const res = await hrService.registerEmployee(payload, profileFile, docFiles);
        if (res?.success) {
          setShowReview(false);
          const newId = res?.data?.id;
          navigate(newId ? routePath(`/hr/directory/${newId}`) : routePath('/hr/directory'));
          return;
        }
        setSubmitError(res?.message || res?.data?.message || 'Registration failed.');
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err.message || (isEditMode ? 'Update failed.' : 'Registration failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRows = () => {
    const pos = positionLabel();
    const nat = form.nationality === 'Other' ? form.nationality_other : form.nationality;
    const birthC = form.birth_country === 'Other' ? form.birth_country_other : form.birth_country;
    const kinRel = form.kin_relationship === 'Other' ? form.kin_relationship_other : form.kin_relationship;
    return {
      personal: [
        ['Staff ID', staffCodePreview],
        ['Full name', [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')],
        ['Gender', form.gender],
        ['Date of birth', form.date_of_birth],
        ['Marital status', form.marital_status],
        ['Nationality', nat],
        ['Birth country', birthC],
      ],
      contact: [
        ['Email', form.email],
        ['Phone', form.phone],
        ['Alt. phone', form.alt_phone],
        ['Address', [form.res_village, form.res_cell, form.res_sector, form.res_district, form.res_province].filter(Boolean).join(', ')],
      ],
      identification: [
        ['National ID / Passport', form.id_document_number],
        ['RSSB', form.rssb_number],
        ['Medical insurance', form.medical_insurance],
        ['TIN', form.tin_number],
        ['Payment', form.payment_method === 'bank' ? `Bank — ${form.bank_name}` : form.payment_method === 'mobile_money' ? `Mobile — ${form.mobile_provider}` : '—'],
        ...(form.payment_method === 'bank' ? [['Account', `${form.account_number} (${form.account_holder})`]] : []),
        ...(form.payment_method === 'mobile_money' ? [['MoMo number', form.mobile_money_number]] : []),
      ],
      employment: [
        ['Department', form.department],
        ['Position', pos],
        ['Contract', form.contract_type],
        ['Start date', form.start_date],
        ['End date', contractOngoing ? 'Ongoing (no end date)' : form.end_date],
      ],
      kin: [
        ['Name', form.kin_name],
        ['Relationship', kinRel],
        ['Phone', form.kin_phone],
        ['Email', form.kin_email],
        ['Address', form.kin_address],
      ],
      access: form.enable_system_access ? [
        ['Portal access', 'Enabled'],
        ['Login email', form.login_email || form.email],
        ['Username', form.login_username],
        ['Send welcome email', form.send_welcome_email ? 'Yes' : 'No'],
        ...(form.login_password ? [['Password', '•••••••• (set)']] : isEditMode ? [['Password', 'Unchanged']] : []),
      ] : [['Portal access', 'Not enabled — HR record only']],
    };
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <ProfilePhotoUpload preview={profilePreview} fileName={profileFile?.name} error={profileError} onPick={handleProfilePick} onClear={() => { setProfilePreview(null); setProfileFile(null); setProfileError(''); }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Employee number">
                <div className={`${inputCls} bg-amber-50/80 border-amber-200 text-[#c87800] font-mono`}>{staffCodePreview || 'EMP-AUTO'}</div>
              </Field>
              <SelectField label="Gender" options={['Male', 'Female']} required value={form.gender} onChange={(e) => setField('gender', e.target.value)} />
              <Field label="First name" required><TextInput value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="e.g. Jean" /></Field>
              <Field label="Middle name"><TextInput value={form.middle_name} onChange={(e) => setField('middle_name', e.target.value)} placeholder="e.g. Paul" /></Field>
              <Field label="Last name" required><TextInput value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="e.g. Hakizimana" /></Field>
              <Field label="Date of birth" required>
                <div className="relative">
                  <TextInput type="date" value={form.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} />
                  <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>
              <Field label="Father's names"><TextInput value={form.father_names} onChange={(e) => setField('father_names', e.target.value)} placeholder="Father's full name" /></Field>
              <Field label="Mother's names"><TextInput value={form.mother_names} onChange={(e) => setField('mother_names', e.target.value)} placeholder="Mother's full name" /></Field>
              <SelectField label="Marital status" options={['Single', 'Married', 'Divorced', 'Widowed']} required value={form.marital_status} onChange={(e) => setField('marital_status', e.target.value)} />
              <SelectField label="Nationality" options={['Rwandan', 'Other']} required value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
              {form.nationality === 'Other' && (
                <Field label="Specify nationality" required><TextInput value={form.nationality_other} onChange={(e) => setField('nationality_other', e.target.value)} placeholder="Enter nationality" /></Field>
              )}
              <SelectField label="Birth country" options={['Rwanda', 'Uganda', 'Kenya', 'DRC', 'Burundi', 'Other']} value={form.birth_country} onChange={(e) => setField('birth_country', e.target.value)} />
              {form.birth_country === 'Other' && (
                <Field label="Specify birth country"><TextInput value={form.birth_country_other} onChange={(e) => setField('birth_country_other', e.target.value)} placeholder="Country name" /></Field>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
              <p className="col-span-full text-xs text-slate-500">Place of birth (Rwanda)</p>
              {[
                ['birth_village', 'Village'], ['birth_cell', 'Cell'], ['birth_sector', 'Sector'], ['birth_district', 'District'],
              ].map(([key, lbl]) => (
                <Field key={key} label={lbl}><TextInput value={form[key]} onChange={(e) => setField(key, e.target.value)} placeholder={`Enter ${lbl}`} /></Field>
              ))}
              <SelectField label="Province" options={rwProvinces} required value={form.birth_province} onChange={(e) => setField('birth_province', e.target.value)} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <p className="col-span-full text-xs text-slate-500">Current residential address</p>
            {[
              ['res_village', 'Village'], ['res_cell', 'Cell'], ['res_sector', 'Sector'], ['res_district', 'District'],
            ].map(([key, lbl]) => (
              <Field key={key} label={lbl}><TextInput value={form[key]} onChange={(e) => setField(key, e.target.value)} placeholder={`Enter ${lbl}`} /></Field>
            ))}
            <SelectField label="Province" options={rwProvinces} required value={form.res_province} onChange={(e) => setField('res_province', e.target.value)} />
            <div className="col-span-full border-t border-slate-100 pt-4 mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <p className="col-span-full text-xs text-slate-500 uppercase tracking-wide" style={{ fontWeight: 500 }}>Contact details</p>
              <Field label="Email address" type="email"><TextInput type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="name@email.com" /></Field>
              <Field label="Phone number" required><TextInput value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+250 7XX XXX XXX" /></Field>
              <Field label="Alternative phone"><TextInput value={form.alt_phone} onChange={(e) => setField('alt_phone', e.target.value)} placeholder="+250 7XX XXX XXX" /></Field>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 500 }}>Identification documents</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="National ID / Passport number" placeholder="1 XXXX X XXXXXXX X XX or passport no." required className="sm:col-span-2">
                  <TextInput value={form.id_document_number} onChange={(e) => setField('id_document_number', e.target.value)} placeholder="National ID or passport number" />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <Field label="RSSB number"><TextInput value={form.rssb_number} onChange={(e) => setField('rssb_number', e.target.value)} placeholder="RSSB number" /></Field>
                <Field label="Medical insurance no."><TextInput value={form.medical_insurance} onChange={(e) => setField('medical_insurance', e.target.value)} placeholder="Insurance number" /></Field>
                <Field label="TIN number"><TextInput value={form.tin_number} onChange={(e) => setField('tin_number', e.target.value)} placeholder="Tax ID (optional)" /></Field>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-4" style={{ fontWeight: 500 }}>Payment details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <PaymentMethodToggle value={form.payment_method} onChange={(v) => setField('payment_method', v)} />
                {form.payment_method === 'bank' && (
                  <>
                    <SelectField label="Bank name" options={RW_BANKS} required value={form.bank_name} onChange={(e) => setField('bank_name', e.target.value)} className="sm:col-span-2 lg:col-span-1" />
                    <Field label="Account number" required><TextInput value={form.account_number} onChange={(e) => setField('account_number', e.target.value)} placeholder="Account number" /></Field>
                    <Field label="Account holder name" required className="sm:col-span-2"><TextInput value={form.account_holder} onChange={(e) => setField('account_holder', e.target.value)} placeholder="As on bank card" /></Field>
                  </>
                )}
                {form.payment_method === 'mobile_money' && (
                  <>
                    <SelectField label="Mobile money provider" options={['MTN MoMo', 'Airtel Money']} required value={form.mobile_provider} onChange={(e) => setField('mobile_provider', e.target.value)} />
                    <Field label="Mobile money number" required className="sm:col-span-2"><TextInput value={form.mobile_money_number} onChange={(e) => setField('mobile_money_number', e.target.value)} placeholder="+250 7XX XXX XXX" /></Field>
                  </>
                )}
                {!form.payment_method && (
                  <p className="col-span-full text-xs text-slate-400 italic">Select Bank or Mobile Money to enter payment details.</p>
                )}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Full name" required><TextInput value={form.kin_name} onChange={(e) => setField('kin_name', e.target.value)} placeholder="Next of kin full name" /></Field>
            <SelectField label="Relationship" options={['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']} required value={form.kin_relationship} onChange={(e) => setField('kin_relationship', e.target.value)} />
            {form.kin_relationship === 'Other' && (
              <Field label="Specify relationship" required><TextInput value={form.kin_relationship_other} onChange={(e) => setField('kin_relationship_other', e.target.value)} placeholder="Relationship" /></Field>
            )}
            <Field label="Phone number" required><TextInput value={form.kin_phone} onChange={(e) => setField('kin_phone', e.target.value)} placeholder="+250 7XX XXX XXX" /></Field>
            <Field label="Email" type="email"><TextInput type="email" value={form.kin_email} onChange={(e) => setField('kin_email', e.target.value)} placeholder="email@example.com" /></Field>
            <Field label="Address" className="sm:col-span-2"><TextInput value={form.kin_address} onChange={(e) => setField('kin_address', e.target.value)} placeholder="Physical address" /></Field>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 500 }}>Employment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <SelectField label="Department" options={departments} required value={form.department} onChange={(e) => setField('department', e.target.value)} />
                <SelectField
                  label="Position"
                  options={STAFF_POSITIONS}
                  optionValue={(o) => o.code}
                  optionLabel={(o) => o.label}
                  required
                  value={form.position_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    setField('position_code', code);
                    if (PRO_PORTAL_POSITION_CODES.has(code)) {
                      setForm((prev) => {
                        const loginEmail = prev.login_email || prev.email || '';
                        const next = {
                          ...prev,
                          position_code: code,
                          enable_system_access: true,
                          login_email: loginEmail,
                          login_username: prev.login_username
                            || suggestUsername(prev.first_name, prev.last_name, loginEmail || prev.email),
                        };
                        if (!prev.login_password && !isEditMode) {
                          const pwd = generateTempPassword();
                          next.login_password = pwd;
                          next.login_password_confirm = pwd;
                        }
                        return next;
                      });
                    }
                  }}
                />
                {form.position_code === 'CUSTOM' && (
                  <Field label="Specify position" required className="sm:col-span-2">
                    <TextInput value={form.position_other} onChange={(e) => setField('position_other', e.target.value)} placeholder="e.g. Welfare Officer, Lab Assistant" />
                  </Field>
                )}
                <SelectField label="Contract type" options={CONTRACT_TYPES} required value={form.contract_type} onChange={(e) => setField('contract_type', e.target.value)} />
                <Field label="Start date" required><TextInput type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} /></Field>
                <div className="sm:col-span-2 lg:col-span-1 space-y-2">
                  <Field label="End date"><TextInput type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} disabled={contractOngoing} /></Field>
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={contractOngoing} onChange={(e) => setContractOngoing(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#c87800] accent-[#c87800]" />
                    <span className="text-xs text-slate-600 leading-relaxed group-hover:text-slate-800">
                      <span className="block text-[#000435]" style={{ fontWeight: 500 }}>Ongoing contract (no end date)</span>
                      Fixed for all years — end date not required
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 500 }}>Qualifications</p>
              {form.qualifications.map((row, i) => (
                <div key={i} className="relative mb-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] text-[#c87800] uppercase tracking-wide" style={{ fontWeight: 500 }}>Qualification {i + 1}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                    <SelectField label="Level" options={['A1', 'A2', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD']} value={row.level} onChange={(e) => updateQual(i, 'level', e.target.value)} />
                    <Field label="Institution"><TextInput value={row.institution} onChange={(e) => updateQual(i, 'institution', e.target.value)} placeholder="School / University" /></Field>
                    <Field label="Year" type="number"><TextInput type="number" value={row.year} onChange={(e) => updateQual(i, 'year', e.target.value)} placeholder="2020" /></Field>
                    <Field label="Grade"><TextInput value={row.grade} onChange={(e) => updateQual(i, 'grade', e.target.value)} placeholder="e.g. Upper Second" /></Field>
                  </div>
                  {form.qualifications.length > 1 && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, qualifications: p.qualifications.filter((_, j) => j !== i) }))} className="absolute top-3 right-3 text-red-500 text-[10px] flex items-center gap-1">
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setForm((p) => ({ ...p, qualifications: [...p.qualifications, emptyQual()] }))} className="w-full py-2.5 border border-dashed border-[#c87800]/40 rounded-xl text-[#c87800] text-sm flex items-center justify-center gap-2 hover:bg-amber-50/50" style={{ fontWeight: 500 }}>
                <Plus size={16} /> Add qualification
              </button>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-3" style={{ fontWeight: 500 }}>Experience</p>
              {form.experience.map((row, i) => (
                <div key={i} className="relative mb-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-[10px] text-[#c87800] uppercase tracking-wide" style={{ fontWeight: 500 }}>Experience {i + 1}</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    <Field label="Employer"><TextInput value={row.employer} onChange={(e) => updateExp(i, 'employer', e.target.value)} placeholder="Organization" /></Field>
                    <Field label="Position"><TextInput value={row.position} onChange={(e) => updateExp(i, 'position', e.target.value)} placeholder="e.g. Teacher" /></Field>
                    <Field label="Years" type="number"><TextInput type="number" value={row.years} onChange={(e) => updateExp(i, 'years', e.target.value)} placeholder="3" /></Field>
                  </div>
                  {form.experience.length > 1 && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, experience: p.experience.filter((_, j) => j !== i) }))} className="absolute top-3 right-3 text-red-500 text-[10px] flex items-center gap-1">
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setForm((p) => ({ ...p, experience: [...p.experience, emptyExp()] }))} className="w-full py-2.5 border border-dashed border-[#c87800]/40 rounded-xl text-[#c87800] text-sm flex items-center justify-center gap-2 hover:bg-amber-50/50" style={{ fontWeight: 500 }}>
                <Plus size={16} /> Add experience
              </button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-5">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-[#c87800]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enable_system_access}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setField('enable_system_access', on);
                      if (on && !form.login_email && form.email) {
                        setField('login_email', form.email);
                      }
                      if (on && !form.login_username) {
                        setField('login_username', suggestUsername(form.first_name, form.last_name, form.login_email || form.email));
                      }
                    }}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-[#c87800] accent-[#c87800]"
                  />
                  <span>
                    <span className="text-sm text-[#000435] block" style={{ fontWeight: 500 }}>Enable system access & login</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">Optional — creates a portal account so this employee can sign in to their personal dashboard. Leave unchecked for HR records only.</span>
                  </span>
                </label>
              </div>
            </div>
            {form.enable_system_access ? (
              <div className="p-5 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-100/80">
                  <KeyRound size={18} className="text-[#c87800]" />
                  <h4 className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>Account information</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Login email" required>
                    <div className="relative">
                      <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <TextInput
                        type="email"
                        value={form.login_email}
                        onChange={(e) => setField('login_email', e.target.value)}
                        placeholder={form.email || 'name@school.com'}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Credentials will be sent to this address</p>
                  </Field>
                  <Field label="Username" required>
                    <div className="flex gap-2">
                      <TextInput
                        value={form.login_username}
                        onChange={(e) => setField('login_username', e.target.value.replace(/\s/g, '').toLowerCase())}
                        placeholder="e.g. jean.murerwa"
                      />
                      <button
                        type="button"
                        onClick={() => setField('login_username', suggestUsername(form.first_name, form.last_name, form.login_email || form.email))}
                        className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-white text-xs"
                        title="Suggest username"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </Field>
                  <Field label={isEditMode ? 'New password (optional)' : 'Temporary password'} required={!isEditMode}>
                    <TextInput
                      type="password"
                      value={form.login_password}
                      onChange={(e) => setField('login_password', e.target.value)}
                      placeholder="Min. 8 characters"
                    />
                  </Field>
                  <Field label="Confirm password" required={!isEditMode && !!form.login_password}>
                    <TextInput
                      type="password"
                      value={form.login_password_confirm}
                      onChange={(e) => setField('login_password_confirm', e.target.value)}
                      placeholder="Repeat password"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = generateTempPassword();
                      setField('login_password', pwd);
                      setField('login_password_confirm', pwd);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-[#c87800] text-xs hover:bg-amber-50"
                    style={{ fontWeight: 500 }}
                  >
                    <RefreshCw size={13} /> Generate secure password
                  </button>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.send_welcome_email}
                      onChange={(e) => setField('send_welcome_email', e.target.checked)}
                      className="w-4 h-4 rounded accent-[#c87800]"
                    />
                    Send welcome email with login details
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-xl">
                Portal login skipped. You can enable access later from the employee profile.
              </p>
            )}
            {submitError && step === 5 ? <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p> : null}
          </div>
        );
      case 6:
        return (
          <div className="space-y-3">
            {DOC_ITEMS.map(({ id, label, icon: Icon, required }) => {
              const uploaded = docFiles[id];
              return (
                <div key={id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50/80 border border-slate-100 rounded-xl hover:border-[#c87800]/25 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#c87800] shrink-0">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700" style={{ fontWeight: 500 }}>
                        {label}
                        {required ? <span className="text-red-500 ml-1 text-xs">*</span> : <span className="text-slate-400 ml-1 text-xs">(optional)</span>}
                      </p>
                      <p className="text-xs text-slate-400">PDF, JPG, PNG — max 5MB</p>
                      {uploaded ? <p className="text-xs text-[#c87800] mt-0.5 truncate">{uploaded.name}</p> : null}
                    </div>
                  </div>
                  <input ref={(el) => { docInputRefs.current[id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="sr-only" onChange={handleDocPick(id)} />
                  <button type="button" onClick={() => docInputRefs.current[id]?.click()} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-amber-200 text-[#c87800] rounded-xl text-xs hover:bg-amber-50 shrink-0" style={{ fontWeight: 500 }}>
                    <Upload size={14} /> {uploaded ? 'Replace' : 'Upload'}
                  </button>
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const rows = reviewRows();

  if (loadingEdit) {
    return (
      <HrPageLayout title={isEditMode ? 'Edit Employee' : 'Employee Registration'} subtitle="Loading…" HeroIcon={UserPlus} contentClassName="max-w-4xl mx-auto px-4 pb-16">
        <div className="flex justify-center py-24 text-slate-400 gap-2"><Loader2 className="animate-spin" size={22} /> Loading employee…</div>
      </HrPageLayout>
    );
  }

  return (
    <HrPageLayout
      title={isEditMode ? 'Edit Employee Profile' : 'Employee Registration'}
      subtitle={isEditMode ? 'Update employee record' : 'Create a new employee record'}
      HeroIcon={UserPlus}
      contentClassName="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
    >
      <HrPanel className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/40">
          {!isEditMode ? (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={inAccountant ? downloadPayrollEmployeeImportTemplate : downloadEmployeeImportTemplate}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs hover:bg-slate-50"
                style={{ fontWeight: 500 }}
              >
                <FileSpreadsheet size={14} />
                {inAccountant ? 'Payroll import template (basic + allowances)' : 'Download import template'}
              </button>
              <button
                type="button"
                onClick={() => { setShowImportModal(true); setImportRows([]); setImportIssues([]); setImportSummary(null); }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#000435] text-white text-xs hover:bg-[#0d1a4d]"
                style={{ fontWeight: 500 }}
              >
                <Upload size={14} /> Import from Excel
              </button>
            </div>
          ) : null}
          <HorizontalStepper step={step} onStep={setStep} />
        </div>

        <div className="p-5 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.14em]">Step {step + 1} of {WIZARD_STEPS.length}</p>
            <h3 className="text-lg sm:text-xl text-[#000435] mt-1 tracking-tight" style={{ fontWeight: 500 }}>{WIZARD_STEPS[step].title}</h3>
            <p className="text-sm text-slate-500 mt-1">{WIZARD_STEPS[step].desc}</p>
          </div>
          {renderStepContent()}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-slate-50/30">
          <button type="button" onClick={() => (step === 0 ? navigate(isEditMode ? routePath(`/hr/directory/${employeeId}`) : routePath('/hr/directory')) : prev())} className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs uppercase tracking-wider hover:bg-slate-50 w-full sm:w-auto" style={{ fontWeight: 500 }}>
            {step === 0 ? 'Cancel' : <><ChevronLeft size={15} /> Previous</>}
          </button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isLast ? (
              <button type="button" onClick={() => setShowReview(true)} className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#c87800] text-white text-xs uppercase tracking-wider hover:bg-[#b36d00] w-full sm:w-auto" style={{ fontWeight: 500 }}>
                <Eye size={15} /> Review & submit
              </button>
            ) : (
              <button type="button" onClick={handleNext} className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#c87800] text-white text-xs uppercase tracking-wider hover:bg-[#b36d00] w-full sm:w-auto" style={{ fontWeight: 500 }}>
                Next step <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </HrPanel>

      <HrModal
        open={showImportModal}
        onClose={() => !importing && setShowImportModal(false)}
        title="Import employees from Excel"
        wide
        footer={(
          <>
            <HrBtnOutline className="flex-1" onClick={() => setShowImportModal(false)} disabled={importing}>Close</HrBtnOutline>
            <HrBtnOutline className="flex-1" onClick={runImportDryRun} disabled={importing || !importRows.length}>Dry run (validate only)</HrBtnOutline>
            <HrBtnPrimary className="flex-1" onClick={handleImportEmployees} disabled={importing || importableRowCount() === 0}>
              {importing ? (
                <><Loader2 size={14} className="animate-spin" /> Importing…</>
              ) : (
                <>Import / update {importableRowCount()} row(s)</>
              )}
            </HrBtnPrimary>
          </>
        )}
      >
        <div className="space-y-4">
          {inAccountant ? (
            <p className="text-[11px] text-slate-600 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
              <strong>Accountant payroll import:</strong> optional columns{' '}
              <em>Allowance Each (T/H/Others)</em> or separate T/A, H/A, Others — saved per employee for Payroll Run.
              If empty, payroll auto-calculates allowances from Basic Salary.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 text-[#c87800] text-xs cursor-pointer hover:bg-amber-50" style={{ fontWeight: 500 }}>
              <Upload size={14} /> Choose Excel file
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFilePick} />
            </label>
              <a
                href="/hr-employee-import-minimal.csv"
                download="hr-employee-import-minimal.csv"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
                style={{ fontWeight: 500 }}
              >
                <FileSpreadsheet size={14} /> Sample CSV (public)
              </a>
              <button
                type="button"
                onClick={inAccountant ? downloadPayrollEmployeeImportTemplate : downloadMinimalEmployeeImportTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-[#c87800] text-xs hover:bg-amber-50"
                style={{ fontWeight: 500 }}
              >
                <FileSpreadsheet size={14} />
                {inAccountant ? 'Payroll template (with allowances)' : 'Minimal template'}
              </button>
              <button
                type="button"
                onClick={downloadEmployeeImportTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
                style={{ fontWeight: 500 }}
              >
                <FileSpreadsheet size={14} /> Full template
              </button>
          </div>

          {importRows.length > 0 ? (
            <div className="p-3 rounded-xl border border-sky-100 bg-sky-50 text-[11px] text-sky-800">
              <p style={{ fontWeight: 600 }}>Columns matched from your file → saved to employee record:</p>
              <p className="mt-1">{importPreviewHeaders.join(' · ')}</p>
              <p className="mt-2 text-sky-700">
                Header names can match the template (e.g. RSSB NUMBER, Basic Salary, Bank Account Number).
                Salaries with commas (549,419) and long bank accounts are parsed correctly.
                Existing employees (same National ID) are updated — use <strong>Import / update</strong> or <strong>Update existing</strong>.
              </p>
            </div>
          ) : null}

          {importIssues.length > 0 ? (
            <div className="p-3 rounded-xl border border-amber-100 bg-amber-50">
              <p className="text-xs text-amber-900 mb-2 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                <AlertTriangle size={13} /> Incomplete profile (will still import — edit in directory after)
              </p>
              <div className="space-y-1 max-h-28 overflow-auto">
                {importIssues.map((i, idx) => (
                  <p key={`${i.rowNo}-${idx}`} className="text-[11px] text-amber-800">
                    Row {i.rowNo}: missing {i.missing.join(', ')}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {duplicateIssues.length > 0 ? (
            <div className="p-3 rounded-xl border border-red-100 bg-red-50">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="text-xs text-red-700 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                  <AlertTriangle size={13} />
                  {systemDuplicateRowNos.length
                    ? 'Already in directory — will update on import (recommended)'
                    : 'Duplicates in file — remove before import'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {systemDuplicateRowNos.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateExistingFromFile(systemDuplicateRowNos)}
                        disabled={importing}
                        className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg bg-[#c87800] text-white hover:bg-[#b36d00] disabled:opacity-50 inline-flex items-center gap-1"
                        style={{ fontWeight: 600 }}
                      >
                        <RefreshCw size={11} /> Update existing ({systemDuplicateRowNos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAndReimport(systemDuplicateRowNos)}
                        disabled={importing}
                        className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1"
                        style={{ fontWeight: 600 }}
                      >
                        <Trash2 size={11} /> Delete &amp; re-import
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={removeDuplicateRowsFromPreview}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    style={{ fontWeight: 600 }}
                  >
                    Remove duplicate rows
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-red-800/90 mb-2">
                {systemDuplicateRowNos.length
                  ? 'Update keeps payroll history. Use delete & re-import only for wrong test data.'
                  : 'Same National ID / email / phone appears twice in your file — fix the spreadsheet or remove rows.'}
              </p>
              <div className="space-y-1 max-h-24 overflow-auto">
                {duplicateIssues.map((d, idx) => (
                  <p key={`${d.rowNo}-${d.type}-${idx}`} className="text-[11px] text-red-600">
                    Row {d.rowNo}: {d.type} `{d.value}` ({d.source})
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {importRows.length > 0 ? (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-xs text-slate-500">
                Review before import ({importRows.length} rows)
                {importProfile === 'minimal' ? ' · compact payroll columns' : ''}
              </div>
              <div className="overflow-auto max-h-[40vh]">
                <table className="w-full text-xs min-w-[900px]">
                  <thead className="bg-slate-50/70 border-b border-slate-100">
                    <tr>
                      {['Status', ...(importProfile === 'minimal'
                        ? ['Row', ...importPreviewHeaders]
                        : ['Row', ...EMPLOYEE_IMPORT_TEMPLATE_HEADERS]
                      )].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] uppercase text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {importRows.map((r) => {
                      const headers = importProfile === 'minimal'
                        ? importPreviewHeaders
                        : EMPLOYEE_IMPORT_TEMPLATE_HEADERS;
                      const missing = getRowMissing(r.rowNo);
                      const fileDup = isRowFileDuplicate(r.rowNo);
                      const willUpdate = isRowSystemExisting(r.rowNo);
                      const missingBasic = importProfile === 'minimal' && !parseSalaryValue(r.basic_salary);
                      const rowCls = fileDup || missingBasic
                        ? 'bg-red-50/70'
                        : willUpdate
                          ? 'bg-sky-50/60'
                          : missing.length
                            ? 'bg-amber-50/50'
                            : '';
                      return (
                        <tr key={r.rowNo} className={rowCls}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {fileDup ? (
                              <span className="text-[10px] font-semibold text-red-600">✗ Duplicate</span>
                            ) : willUpdate ? (
                              <span className="text-[10px] font-semibold text-sky-700">↻ Will update</span>
                            ) : missing.length ? (
                              <span className="text-[10px] font-semibold text-amber-700" title={missing.join(', ')}>
                                ⚠ Incomplete
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-600">✓ Ready</span>
                            )}
                          </td>
                          <td className="px-3 py-2">{r.rowNo}</td>
                          {headers.map((header) => {
                            const key = importProfile === 'minimal'
                              ? previewHeaderToRowKey(header)
                              : IMPORT_PREVIEW_HEADER_TO_KEY[header];
                            const value = key ? r[key] : '';
                            const optionalLabel = IMPORT_OPTIONAL_TRACK.find((f) => f.key === key)?.label;
                            const isMissingCell = key && (
                              (key === 'basic_salary' && missingBasic)
                              || (optionalLabel && missing.includes(optionalLabel))
                              || (key === 'first_name' && missing.includes('First Name'))
                              || (key === 'last_name' && missing.includes('Last Name'))
                              || (key === 'gender' && missing.includes('Gender'))
                            );
                            return (
                              <td
                                key={`${r.rowNo}-${header}`}
                                className={`px-3 py-2 whitespace-nowrap ${isMissingCell && !fileDup ? 'text-red-600 font-medium' : ''}`}
                              >
                                {value != null && String(value).trim() !== '' ? String(value) : (
                                  <span className={isMissingCell && !fileDup ? 'text-red-400' : 'text-slate-300'}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Upload template file first to preview and validate rows.</p>
          )}

          {replaceNotice ? (
            <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 text-xs text-sky-900" style={{ fontWeight: 500 }}>
              {replaceNotice}
            </div>
          ) : null}

          {importSummary ? (
            <div className={`p-3 rounded-xl border ${importSummary.errorCount ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <p className="text-xs" style={{ fontWeight: 600 }}>
                Imported: {importSummary.successCount} success
                {importSummary.updatedCount != null ? ` (${importSummary.updatedCount} updated, ${importSummary.createdCount || 0} new)` : ''}
                {importSummary.errorCount ? `, ${importSummary.errorCount} failed` : ''}.
                {importSummary.replacedCount ? ` · Deleted ${importSummary.replacedCount} before re-import` : ''}
              </p>
              {importSummary.conflictRowNos?.length ? (
                <p className="text-[11px] text-amber-900 mt-2">
                  {importSummary.conflictRowNos.length} row(s) still conflict with the directory.
                  Recommended: <strong>Update existing</strong> (keeps records). Advanced: delete &amp; re-import.
                </p>
              ) : null}
              {importSummary.errors?.length ? (
                <div className="mt-2 max-h-24 overflow-auto space-y-1">
                  {importSummary.errors.map((e, idx) => (
                    <p key={`${e.rowNo}-${idx}`} className="text-[11px] text-red-600">Row {e.rowNo}: {e.message}</p>
                  ))}
                </div>
              ) : null}
              {importSummary.errors?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadFailedImportRows}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 text-amber-800 text-xs hover:bg-amber-100"
                    style={{ fontWeight: 500 }}
                  >
                    <FileSpreadsheet size={13} /> Download failed rows
                  </button>
                  {importSummary.conflictRowNos?.length ? (
                    <>
                      <button
                        type="button"
                        disabled={importing}
                        onClick={() => handleUpdateExistingFromFile(importSummary.conflictRowNos)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#c87800] text-white text-xs hover:bg-[#b36d00] disabled:opacity-50"
                        style={{ fontWeight: 600 }}
                      >
                        {importing ? (
                          <><Loader2 size={13} className="animate-spin" /> Working…</>
                        ) : (
                          <><RefreshCw size={13} /> Update existing ({importSummary.conflictRowNos.length})</>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={importing}
                        onClick={() => handleDeleteExistingAndReimport(importSummary.conflictRowNos)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 text-red-700 text-xs hover:bg-red-50 disabled:opacity-50"
                        style={{ fontWeight: 600 }}
                      >
                        <Trash2 size={13} /> Delete &amp; re-import
                      </button>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {dryRunSummary ? (
            <div className={`p-3 rounded-xl border ${dryRunSummary.invalid ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <p className="text-xs" style={{ fontWeight: 600 }}>
                Dry-run result: {dryRunSummary.valid} valid, {dryRunSummary.invalid} invalid, total {dryRunSummary.total}.
              </p>
              {dryRunSummary.invalid > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const errs = new Map();
                    importIssues.forEach((i) => errs.set(i.rowNo, [...(errs.get(i.rowNo) || []), `Missing: ${i.missing.join(', ')}`]));
                    duplicateIssues.forEach((d) => errs.set(d.rowNo, [...(errs.get(d.rowNo) || []), `${d.type} duplicate: ${d.value} (${d.source})`]));
                    buildFailedRowsExport(importRows, errs);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 text-amber-800 text-xs hover:bg-amber-100"
                  style={{ fontWeight: 500 }}
                >
                  <FileSpreadsheet size={13} /> Download failed rows
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </HrModal>

      <HrModal
        open={showReview}
        onClose={() => !submitting && setShowReview(false)}
        title="Review employee registration"
        wide
        footer={
          <>
            <HrBtnOutline className="flex-1" onClick={() => setShowReview(false)} disabled={submitting}>Edit</HrBtnOutline>
            <HrBtnPrimary className="flex-1" onClick={handleSave} disabled={submitting}>
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> {isEditMode ? 'Save changes' : 'Save employee'}</>}
            </HrBtnPrimary>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {submitError ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{submitError}</p> : null}
          <ReviewSection title="Personal" rows={rows.personal} />
          <ReviewSection title="Contact & residence" rows={rows.contact} />
          <ReviewSection title="Identification & payment" rows={rows.identification} />
          <ReviewSection title="Employment" rows={rows.employment} />
          <ReviewSection title="Next of kin" rows={rows.kin} />
          <ReviewSection title="System access" rows={rows.access} />
          {form.qualifications.some((q) => q.level || q.institution) && (
            <ReviewSection title="Qualifications" rows={form.qualifications.filter((q) => q.level || q.institution).map((q, i) => [`Qualification ${i + 1}`, `${q.level} — ${q.institution} (${q.year || '—'})`])} />
          )}
          {Object.keys(docFiles).length > 0 && (
            <ReviewSection title="Documents" rows={Object.entries(docFiles).map(([k, v]) => [k.replace(/_/g, ' '), v.name])} />
          )}
        </div>
      </HrModal>
    </HrPageLayout>
  );
}
