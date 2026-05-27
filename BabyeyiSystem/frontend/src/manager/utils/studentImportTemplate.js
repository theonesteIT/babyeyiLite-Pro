import * as XLSX from 'xlsx';

/** Column headers aligned with POST /api/students/import generic alias map. */
const TEMPLATE_HEADERS = [
  'Student ID',
  'First Name',
  'Last Name',
  'Gender',
  'Birth Year',
  'Nationality',
  'Province',
  'District',
  'Sector',
  'Cell',
  'Village',
  'Father Name',
  'Father Phone',
  'Father Email',
  'Father National ID',
  'Mother Name',
  'Mother Phone',
  'Mother Email',
  'Mother National ID',
];

const SAMPLE_ROW = {
  'Student ID': '',
  'First Name': 'Jean',
  'Last Name': 'UWIMANA',
  Gender: 'Male',
  'Birth Year': '2012',
  Nationality: 'Rwandan',
  Province: 'Kigali City',
  District: 'Gasabo',
  Sector: 'Kimironko',
  Cell: 'Kibagabaga',
  Village: 'Ubumwe',
  'Father Name': 'Pierre UWIMANA',
  'Father Phone': '0788123456',
  'Father Email': '',
  'Father National ID': '',
  'Mother Name': 'Marie UWIMANA',
  'Mother Phone': '0788987654',
  'Mother Email': '',
  'Mother National ID': '',
};

const INSTRUCTIONS = [
  ['Babyeyi — Student bulk import template'],
  [],
  ['Before you import'],
  ['1. In the Students page, enter Class / stream and Academic year for this batch (applied to every row).'],
  ['2. Fill student rows below (delete the sample row or replace it).'],
  ['3. Upload the saved .xlsx file and click Import.'],
  [],
  ['Required per row'],
  ['• First Name and Last Name (or use a single "Name" column — see alternate headers sheet).'],
  ['• Province, District, Sector, Cell, Village (can be completed later in the app if missing).'],
  [],
  ['Optional'],
  ['• Student ID — leave blank to auto-generate; use Urubuto/SDMS ID if you have one.'],
  ['• Gender: Male / Female / M / F'],
  ['• Birth Year: e.g. 2012'],
  ['• Parent phones: Rwanda format e.g. 0788123456'],
  ['• Father / Mother National ID — optional'],
  [],
  ['Also supported'],
  ['• Official Urubuto Excel exports (upload as-is).'],
  ['• Alternate column names: F. Name, L. Name, Father Tel., Mother Tel., etc.'],
  [],
  ['Do not put Class or Academic Year in this file — set them in the import form.'],
];

const ALTERNATE_HEADERS = [
  ['Primary headers (recommended)', 'Alternate names accepted by import'],
  ['Student ID', 'ID, StudentID, Registration Number'],
  ['First Name', 'F. Name, F Name, Given Name'],
  ['Last Name', 'L. Name, L Name, Surname'],
  ['Gender', 'Sex, Igitsina'],
  ['Birth Year', 'Birth Year, DOB Year, Year Of Birth'],
  ['Nationality', 'Country'],
  ['Province', 'Intara'],
  ['District', 'Akarere'],
  ['Sector', 'Umurenge'],
  ['Cell', 'Akagari'],
  ['Village', 'Umudugudu'],
  ['Father Name', 'FatherName, Father Full Name'],
  ['Father Phone', 'Father Tel., FatherPhone'],
  ['Father Email', 'FatherEmail'],
  ['Father National ID', 'FatherNational_ID, Father National Id, Father NID'],
  ['Mother Name', 'MotherName, Mother Full Name'],
  ['Mother Phone', 'Mother Tel., MotherPhone'],
  ['Mother Email', 'MotherEmail'],
  ['Mother National ID', 'MotherNational_ID, Mother National Id, Mother NID'],
  ['Full name only', 'Name, Student Name (splits into first + last)'],
];

/**
 * Download an empty Excel template for bulk student import.
 */
export function downloadStudentImportTemplate() {
  const wb = XLSX.utils.book_new();

  const studentsSheet = XLSX.utils.json_to_sheet([SAMPLE_ROW], { header: TEMPLATE_HEADERS });
  const colWidths = TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length, String(SAMPLE_ROW[h] || '').length) + 2,
  }));
  studentsSheet['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, studentsSheet, 'Students');

  const instructionsWs = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructionsWs['!cols'] = [{ wch: 72 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

  const altWs = XLSX.utils.aoa_to_sheet(ALTERNATE_HEADERS);
  altWs['!cols'] = [{ wch: 28 }, { wch: 44 }];
  XLSX.utils.book_append_sheet(wb, altWs, 'Column aliases');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `babyeyi-students-import-template-${stamp}.xlsx`);
}
