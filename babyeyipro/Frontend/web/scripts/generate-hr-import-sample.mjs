import * as XLSX from 'xlsx';
import { EMPLOYEE_IMPORT_TEMPLATE_HEADERS } from '../src/manager/utils/hrEmployeeImportTemplate.js';

const firstNames = [
  'Jean', 'Aline', 'Eric', 'Diane', 'Patrick', 'Vestine', 'Emmanuel', 'Claudine', 'Didier', 'Gloria',
  'Samuel', 'Anitha', 'Bosco', 'Sandrine', 'Claude', 'Yvette', 'Theoneste', 'Esperance', 'Fabrice', 'Josiane',
];

const lastNames = [
  'Uwimana', 'Hakizimana', 'Mugisha', 'Ndayisaba', 'Mukamana', 'Niyonzima', 'Umutoni', 'Rukundo', 'Murekatete', 'Nsengiyumva',
];

const departments = ['Academics', 'Administration', 'Finance', 'ICT', 'Library', 'Discipline', 'Human Resources'];
const positions = ['TEACHER', 'SECRETARY', 'ACCOUNTANT', 'LIBRARIAN', 'DISCIPLINE', 'HR', 'STORE_MANAGER'];
const contractTypes = ['Permanent', 'Temporary', 'Probation', 'Internship'];

const rows = [];
for (let i = 1; i <= 50; i += 1) {
  const fn = firstNames[(i - 1) % firstNames.length];
  const ln = lastNames[(i * 3) % lastNames.length];
  const gender = i % 2 === 0 ? 'Female' : 'Male';
  const dept = departments[i % departments.length];
  const pos = positions[i % positions.length];
  const contract = contractTypes[i % contractTypes.length];
  const startMonth = ((i % 12) + 1).toString().padStart(2, '0');
  const startDay = (((i * 2) % 28) + 1).toString().padStart(2, '0');
  const startDate = `2026-${startMonth}-${startDay}`;
  const endDate = contract === 'Permanent' ? '' : `2027-${startMonth}-${startDay}`;
  const salary = contract === 'Internship' ? '' : String(280000 + i * 6500);
  rows.push({
    'First Name': fn,
    'Middle Name': i % 3 === 0 ? 'Uwase' : '',
    'Last Name': ln,
    Gender: gender,
    'Date of Birth': `199${i % 10}-0${((i % 8) + 1)}-1${i % 9}`,
    Phone: `+25078${String(1000000 + i * 731).padStart(7, '0')}`,
    'Alt Phone': i % 5 === 0 ? '' : `+25079${String(1000000 + i * 719).padStart(7, '0')}`,
    Email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@babyeyi.rw`,
    'Marital Status': i % 2 ? 'Single' : 'Married',
    Nationality: 'Rwandan',
    'Birth Country': 'Rwanda',
    'Birth Province': 'Kigali City',
    'Birth District': 'Gasabo',
    'Birth Sector': 'Kimironko',
    'Birth Cell': 'Kibagabaga',
    'Birth Village': `Village-${i}`,
    'Residence Province': 'Kigali City',
    'Residence District': i % 2 ? 'Kicukiro' : 'Gasabo',
    'Residence Sector': 'Nyarugunga',
    'Residence Cell': 'Rwimbogo',
    'Residence Village': `Home-${i}`,
    Department: dept,
    'Position Code': pos,
    'Contract Type': contract,
    'Start Date': startDate,
    'End Date': endDate,
    'Basic Salary': salary,
    'National ID': `1199${String(100000000000 + i).slice(-12)}`,
    'RSSB Number': `RSSB-${2000 + i}`,
    'Medical Insurance': i % 4 === 0 ? '' : `MMI-${3000 + i}`,
    'TIN Number': i % 3 === 0 ? `TIN-${5000 + i}` : '',
    'Payment Method': i % 2 ? 'Bank Transfer' : 'Mobile Money',
    'Bank Name': i % 2 ? 'Bank of Kigali' : '',
    'Bank Account Number': i % 2 ? `10${String(100000 + i)}` : '',
    'Bank Account Holder': i % 2 ? `${fn} ${ln}` : '',
    'Mobile Provider': i % 2 ? '' : 'MTN MoMo',
    'Mobile Money Number': i % 2 ? '' : `0788${String(100000 + i).slice(-6)}`,
    'Next of Kin Name': `Kin ${fn} ${ln}`,
    'Next of Kin Relationship': i % 2 ? 'Sibling' : 'Parent',
    'Next of Kin Phone': `0787${String(100000 + i).slice(-6)}`,
    'Next of Kin Email': i % 3 === 0 ? `kin.${fn.toLowerCase()}${i}@mail.com` : '',
    'Next of Kin Address': `Kigali Block ${i}`,
    'Qualification Level': i % 4 === 0 ? 'Diploma' : "Bachelor's Degree",
    'Qualification Institution': i % 4 === 0 ? 'IPRC Kigali' : 'University of Rwanda',
    'Qualification Year': `${2012 + (i % 12)}`,
    'Qualification Grade': i % 4 === 0 ? 'Merit' : 'Upper Second',
  });
}

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows, { header: EMPLOYEE_IMPORT_TEMPLATE_HEADERS });
ws['!cols'] = [
  ...EMPLOYEE_IMPORT_TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) })),
];
XLSX.utils.book_append_sheet(wb, ws, 'Employees');

XLSX.writeFile(wb, 'public/hr-employee-import-sample-50.xlsx');
XLSX.writeFile(wb, 'public/hr-employee-import-sample-50.csv', { bookType: 'csv' });

console.log('Generated: public/hr-employee-import-sample-50.xlsx and .csv');

