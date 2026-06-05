import * as XLSX from 'xlsx';

export const EMPLOYEE_IMPORT_TEMPLATE_HEADERS = [
  'First Name',
  'Middle Name',
  'Last Name',
  'Gender',
  'Date of Birth',
  'Phone',
  'Alt Phone',
  'Email',
  'Marital Status',
  'Nationality',
  'Birth Country',
  'Birth Province',
  'Birth District',
  'Birth Sector',
  'Birth Cell',
  'Birth Village',
  'Residence Province',
  'Residence District',
  'Residence Sector',
  'Residence Cell',
  'Residence Village',
  'Department',
  'Position Code',
  'Contract Type',
  'Start Date',
  'End Date',
  'Basic Salary',
  'National ID',
  'RSSB Number',
  'Medical Insurance',
  'TIN Number',
  'Payment Method',
  'Bank Name',
  'Bank Account Number',
  'Bank Account Holder',
  'Mobile Provider',
  'Mobile Money Number',
  'Next of Kin Name',
  'Next of Kin Relationship',
  'Next of Kin Phone',
  'Next of Kin Email',
  'Next of Kin Address',
  'Qualification Level',
  'Qualification Institution',
  'Qualification Year',
  'Qualification Grade',
];

export const EMPLOYEE_IMPORT_SAMPLE_ROW = {
  'First Name': 'Jeanne',
  'Middle Name': 'Uwase',
  'Last Name': 'Murerwa',
  Gender: 'Female',
  'Date of Birth': '1994-05-12',
  Phone: '+250788123456',
  'Alt Phone': '+250788123450',
  Email: 'jeanne.murerwa@school.rw',
  'Marital Status': 'Single',
  Nationality: 'Rwandan',
  'Birth Country': 'Rwanda',
  'Birth Province': 'Kigali City',
  'Birth District': 'Gasabo',
  'Birth Sector': 'Kacyiru',
  'Birth Cell': 'Kamatamu',
  'Birth Village': 'Amahoro',
  'Residence Province': 'Kigali City',
  'Residence District': 'Kicukiro',
  'Residence Sector': 'Nyarugunga',
  'Residence Cell': 'Rwimbogo',
  'Residence Village': 'Umucyo',
  Department: 'Academics',
  'Position Code': 'TEACHER',
  'Contract Type': 'Permanent',
  'Start Date': '2026-01-10',
  'End Date': '',
  'Basic Salary': '450000',
  'National ID': '1199480067890123',
  'RSSB Number': 'RSSB-7788123',
  'Medical Insurance': 'MMI-9821',
  'TIN Number': 'TIN-14522',
  'Payment Method': 'Bank Transfer',
  'Bank Name': 'Bank of Kigali',
  'Bank Account Number': '100200300',
  'Bank Account Holder': 'Jeanne Uwase Murerwa',
  'Mobile Provider': 'MTN MoMo',
  'Mobile Money Number': '0788123456',
  'Next of Kin Name': 'Alice Murekatete',
  'Next of Kin Relationship': 'Sister',
  'Next of Kin Phone': '0788554433',
  'Next of Kin Email': 'alice@example.com',
  'Next of Kin Address': 'Kigali, Kicukiro',
  'Qualification Level': "Bachelor's Degree",
  'Qualification Institution': 'University of Rwanda',
  'Qualification Year': '2018',
  'Qualification Grade': 'Upper Second',
};

const INSTRUCTIONS = [
  ['Babyeyi HR — Employee Import Template'],
  [],
  ['How to use'],
  ['1. Fill rows in Employees sheet (one employee per row).'],
  ['2. Keep dates in YYYY-MM-DD format.'],
  ['3. Basic Salary is optional; leave empty if not available.'],
  ['4. Upload in Employee Registration -> Import from Excel.'],
  [],
  ['Required columns'],
  ['• First Name, Last Name, Gender'],
  ['• Payroll roster: only RSSB, National ID, names, gender — no auto-filled department or contract'],
  [],
  ['Optional columns'],
  ['• All other columns are optional: residence, identification, next of kin, qualifications, salary, etc.'],
];

const ALIASES = [
  ['Primary header', 'Accepted aliases'],
  ['First Name', 'Firstname, Given Name, F Name'],
  ['Middle Name', 'Middlename, Second Name'],
  ['Last Name', 'Lastname, Surname, L Name'],
  ['Gender', 'Sex'],
  ['Date of Birth', 'DOB, Birth Date'],
  ['Phone', 'Telephone, Mobile'],
  ['Alt Phone', 'Alternative Phone, Secondary Phone'],
  ['Email', 'Mail'],
  ['Marital Status', 'Marital'],
  ['Nationality', 'Citizen'],
  ['Birth Country', 'Country of Birth'],
  ['Residence Province', 'Res Province'],
  ['Residence District', 'Res District'],
  ['Residence Sector', 'Res Sector'],
  ['Residence Cell', 'Res Cell'],
  ['Residence Village', 'Res Village'],
  ['Department', 'Dept'],
  ['Position Code', 'Position, Role Code'],
  ['Contract Type', 'Employment Type, Contract'],
  ['Start Date', 'Date of Employment, Hire Date'],
  ['End Date', 'Contract End Date'],
  ['Basic Salary', 'Salary, Payroll Basic Salary'],
  ['National ID', 'ID Document Number, NID'],
  ['RSSB Number', 'RSSB'],
  ['Medical Insurance', 'Insurance Number'],
  ['TIN Number', 'Tax Number, TIN'],
  ['Payment Method', 'Payroll Payment Method'],
  ['Next of Kin Name', 'Kin Name, Emergency Contact Name'],
  ['Next of Kin Relationship', 'Kin Relationship'],
  ['Next of Kin Phone', 'Kin Phone, Emergency Contact Phone'],
  ['Qualification Level', 'Education Level, Qualification'],
  ['Qualification Institution', 'Institution, School'],
  ['Qualification Year', 'Education Year'],
  ['Qualification Grade', 'Education Grade'],
];

/** Optional payroll columns — accountant import only (T/A, H/A, Others per employee). */
export const PAYROLL_ALLOWANCE_IMPORT_HEADERS = [
  'Allowance Each (T/H/Others)',
  'Transport Allowance (T/A)',
  'Housing Allowance (H/A)',
  'Others Allowance',
];

export const MINIMAL_EMPLOYEE_IMPORT_HEADERS = [
  'RSSB Number',
  'National ID',
  'First Name',
  'Last Name',
  'Gender',
  'Basic Salary',
  ...PAYROLL_ALLOWANCE_IMPORT_HEADERS,
  'Payment Method',
  'Bank Name',
  'Bank Account Number',
];

export const MINIMAL_EMPLOYEE_IMPORT_SAMPLE_ROWS = [
  {
    'RSSB Number': '10215340',
    'National ID': '1197570011937388',
    'First Name': 'ABERA',
    'Last Name': 'VALLY',
    Gender: 'F',
    'Basic Salary': 549419,
    'Allowance Each (T/H/Others)': 78488,
    'Transport Allowance (T/A)': '',
    'Housing Allowance (H/A)': '',
    'Others Allowance': '',
    'Payment Method': 'Bank Transfer',
    'Bank Name': 'Bank of Kigali',
    'Bank Account Number': '100200300',
  },
  {
    'RSSB Number': '19983446K',
    'National ID': 'CM84101104ZD7F',
    'First Name': 'AGABA',
    'Last Name': 'ALBERT',
    Gender: 'M',
    'Basic Salary': 639193,
    'Allowance Each (T/H/Others)': 91313,
    'Transport Allowance (T/A)': '',
    'Housing Allowance (H/A)': '',
    'Others Allowance': '',
    'Payment Method': 'Bank Transfer',
    'Bank Name': 'Equity Bank',
    'Bank Account Number': '20034567890',
  },
];

/** Compact payroll roster — only names, gender, RSSB & National ID required */
export function downloadMinimalEmployeeImportTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(MINIMAL_EMPLOYEE_IMPORT_SAMPLE_ROWS, { header: MINIMAL_EMPLOYEE_IMPORT_HEADERS });
  ws['!cols'] = MINIMAL_EMPLOYEE_IMPORT_HEADERS.map((h) => ({ wch: Math.max(16, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  const info = XLSX.utils.aoa_to_sheet([
    ['Minimal HR import — payroll roster'],
    [],
    ['Required: First Name, Last Name, Gender'],
    ['Optional: RSSB Number, National ID, Basic Salary'],
    ['Optional (accountant payroll): Allowance Each, or separate T/A, H/A, Others columns'],
    ['Allowance Each sets the same value for Transport, Housing and Others (like your payroll register)'],
    ['Only data in the file is imported — empty columns stay empty in the employee profile'],
  ]);
  XLSX.utils.book_append_sheet(wb, info, 'Instructions');
  XLSX.writeFile(wb, `hr-employee-import-minimal-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Minimal roster + optional per-employee allowance columns (accountant portal). */
export function downloadPayrollEmployeeImportTemplate() {
  return downloadMinimalEmployeeImportTemplate();
}

export function downloadEmployeeImportTemplate() {
  const wb = XLSX.utils.book_new();
  const mainSheet = XLSX.utils.json_to_sheet([EMPLOYEE_IMPORT_SAMPLE_ROW], { header: EMPLOYEE_IMPORT_TEMPLATE_HEADERS });
  mainSheet['!cols'] = EMPLOYEE_IMPORT_TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(16, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, mainSheet, 'Employees');

  const instructions = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructions['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, instructions, 'Instructions');

  const aliasSheet = XLSX.utils.aoa_to_sheet(ALIASES);
  aliasSheet['!cols'] = [{ wch: 28 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, aliasSheet, 'Column aliases');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `babyeyi-employee-import-template-${stamp}.xlsx`);
}

