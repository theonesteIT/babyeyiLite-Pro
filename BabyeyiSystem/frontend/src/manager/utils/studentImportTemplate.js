import * as XLSX from 'xlsx';

/** Recommended class roster — matches School Manager rich import. */
const ROSTER_HEADERS = [
  'NO',
  'Code',
  'Student ID',
  'Photo',
  'Names',
  'Gender',
  'Age',
  'grade',
  'Father Name',
  'Mother Name',
  'Father Phone',
  'Mother Phone',
  'Province',
  'District',
  'Sector',
  'Cell',
  'Village',
];

const ROSTER_SAMPLE_ROWS = [
  {
    NO: 1,
    Code: '130713220035',
    'Student ID': '',
    Photo: '130713220035.jpg',
    Names: 'AGANWA Angela',
    Gender: 'F',
    Age: 13,
    grade: 'S1',
    'Father Name': 'NIYONTEZE Ildephonse',
    'Mother Name': 'UYISENGA Pierre Flora',
    'Father Phone': '0789114654',
    'Mother Phone': '0788960196',
    Province: 'Kigali City',
    District: 'Kicukiro',
    Sector: 'Kigarama',
    Cell: 'Kigarama',
    Village: 'Mataba',
  },
  {
    NO: 2,
    Code: '121207211561',
    'Student ID': '',
    Photo: '121207211561.jpg',
    Names: 'AGASARO CYNTHIA',
    Gender: 'F',
    Age: 14,
    grade: 'S1',
    'Father Name': 'KAYITANKORE',
    'Mother Name': 'MUKESHABIRORI',
    'Father Phone': '',
    'Mother Phone': '',
    Province: 'Kigali City',
    District: 'Gasabo',
    Sector: 'Nduba',
    Cell: 'Gasanze',
    Village: 'Kagarama',
  },
  {
    NO: 3,
    Code: '110805191137',
    'Student ID': '',
    Photo: '110805191137.jpg',
    Names: 'AGASARO Jesca',
    Gender: 'F',
    Age: 13,
    grade: 'S1',
    'Father Name': 'MISAGO ALBERT',
    'Mother Name': 'TUYIRINGIRE JACQUELINE',
    'Father Phone': '0780653337',
    'Mother Phone': '0789901308',
    Province: 'Kigali City',
    District: 'Nyarugenge',
    Sector: 'Nyamirambo',
    Cell: 'Mumena',
    Village: 'Itaba',
  },
  {
    NO: 4,
    Code: '230906160196',
    'Student ID': '',
    Photo: '230906160196.jpg',
    Names: 'AGASARO MBATEYE RATIFA',
    Gender: 'F',
    Age: 18,
    grade: 'S1',
    'Father Name': 'NZAMURAMBAHO FREDERIC',
    'Mother Name': 'UWIMANA DONATA',
    'Father Phone': '',
    'Mother Phone': '',
    Province: 'Kigali City',
    District: 'Nyaruguru',
    Sector: 'Ngoma',
    Cell: 'Nyamirama',
    Village: 'Akabuye',
  },
  {
    NO: 5,
    Code: '110103220561',
    'Student ID': '040010005',
    Photo: '040010005.jpg',
    Names: 'AGASARO SADJIDA',
    Gender: 'F',
    Age: 12,
    grade: 'S1',
    'Father Name': 'NTAGOZERA CONSTANTIN',
    'Mother Name': 'Nyirabasinga Mwamini',
    'Father Phone': '',
    'Mother Phone': '',
    Province: 'Kigali City',
    District: 'Nyarugenge',
    Sector: 'Kimisagara',
    Cell: 'Kimisagara',
    Village: 'Kigina',
  },
];

const SIMPLE_HEADERS = ['NO', 'Student ID', 'Photo', 'Names'];

const SIMPLE_SAMPLE_ROWS = [
  { NO: 1, 'Student ID': '', Photo: '1.jpg', Names: 'AKAMANZI MUNANA JEIDA' },
  { NO: 2, 'Student ID': '040010006', Photo: '040010006.jpg', Names: 'AKUZWE DARLENE' },
  { NO: 3, 'Student ID': '', Photo: '', Names: 'AMAHIRWE KIREZI CHARTINE' },
];

const INSTRUCTIONS = [
  ['Babyeyi — Student import template'],
  [],
  ['Before you import'],
  ['1. Use the "Class roster" sheet (5 sample rows included).'],
  ['2. On Students page: set Class and Academic year for the batch.'],
  ['3. Optional: upload a ZIP of photos when importing (see Photos below).'],
  ['4. Save .xlsx and click Import.'],
  [],
  ['IDs'],
  ['• Code — SDMS / Urubuto ID (12 digits) → SDMS ID in the app.'],
  ['• Student ID — optional official school ID (9 digits). Leave blank to auto-generate.'],
  ['• Photo — image file name (e.g. 130713220035.jpg) or https:// photo URL.'],
  [],
  ['Photos (optional)'],
  ['• Name each file like the Code or Student ID: 130713220035.jpg, 040010005.png'],
  ['• Put all photos in one .zip and upload it with the Excel on import.'],
  ['• Or put a direct image URL in the Photo column.'],
  ['• If Photo is empty, import still matches zip files named after Code / Student ID.'],
  [],
  ['Other columns'],
  ['• Names — full name in one cell. NO is not part of the name.'],
  ['• Gender — M / F. Age — birth year is estimated from age.'],
  ['• grade — reference only; set Class in the import form.'],
  [],
  ['Also supported: Simple list sheet, Urubuto exports.'],
];

const ALTERNATE_HEADERS = [
  ['Column', 'Alternate names accepted'],
  ['Code', 'SDMS ID, SDMS, SDM Code, SDM'],
  ['Student ID', 'StudentID, School ID, Official ID'],
  ['Photo', 'Photo URL, Image, Picture, Photo File'],
  ['Names', 'Name, Student Name'],
  ['Gender', 'Sex, Igitsina'],
  ['Age', 'Birth Year, DOB Year'],
  ['Father Name', 'FatherName, Father Full Name'],
  ['Father Phone', 'Father Tel., FatherPhone'],
  ['Mother Name', 'MotherName, Mother Full Name'],
  ['Mother Phone', 'Mother Tel., MotherPhone'],
];

function colWidthsForRows(headers, rows) {
  return headers.map((h) => ({
    wch: Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2,
  }));
}

/**
 * Download Excel template for bulk student import (5 sample rows on class roster sheet).
 */
export function downloadStudentImportTemplate() {
  const wb = XLSX.utils.book_new();

  const rosterSheet = XLSX.utils.json_to_sheet(ROSTER_SAMPLE_ROWS, { header: ROSTER_HEADERS });
  rosterSheet['!cols'] = colWidthsForRows(ROSTER_HEADERS, ROSTER_SAMPLE_ROWS);
  XLSX.utils.book_append_sheet(wb, rosterSheet, 'Class roster');

  const simpleSheet = XLSX.utils.json_to_sheet(SIMPLE_SAMPLE_ROWS, { header: SIMPLE_HEADERS });
  simpleSheet['!cols'] = colWidthsForRows(SIMPLE_HEADERS, SIMPLE_SAMPLE_ROWS);
  XLSX.utils.book_append_sheet(wb, simpleSheet, 'Simple list');

  const instructionsWs = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructionsWs['!cols'] = [{ wch: 82 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

  const altWs = XLSX.utils.aoa_to_sheet(ALTERNATE_HEADERS);
  altWs['!cols'] = [{ wch: 22 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, altWs, 'Column aliases');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `babyeyi-students-import-template-${stamp}.xlsx`);
}
