/**
 * Rwanda districts in alphabetical order → 2-digit codes 01–30.
 * Used for school location and student official codes (DD + school + seq).
 */
const DISTRICTS_ALPHA = [
  'Bugesera',
  'Burera',
  'Gakenke',
  'Gasabo',
  'Gatsibo',
  'Gicumbi',
  'Gisagara',
  'Huye',
  'Kamonyi',
  'Karongi',
  'Kayonza',
  'Kicukiro',
  'Kirehe',
  'Muhanga',
  'Musanze',
  'Ngoma',
  'Ngororero',
  'Nyabihu',
  'Nyagatare',
  'Nyamagabe',
  'Nyamasheke',
  'Nyanza',
  'Nyarugenge',
  'Nyaruguru',
  'Rubavu',
  'Ruhango',
  'Rulindo',
  'Rusizi',
  'Rutsiro',
  'Rwamagana',
];

const CODE_BY_DISTRICT = new Map(
  DISTRICTS_ALPHA.map((name, i) => [normalizeDistrictKey(name), String(i + 1).padStart(2, '0')])
);

function normalizeDistrictKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** @returns {string|null} two-digit code or null if unknown */
function getDistrictCode(districtName) {
  if (!districtName) return null;
  return CODE_BY_DISTRICT.get(normalizeDistrictKey(districtName)) || null;
}

/** Normalize school_code to 3-digit string for coding (from DB value like "001" or "KSS001"). */
function parseSchoolCodeNumeric(schoolCode) {
  const s = String(schoolCode || '').trim();
  const slash = s.match(/^[0-9]{2}\/([0-9]{3})$/);
  if (slash) return slash[1];
  if (/^[0-9]{1,3}$/.test(s)) return s.padStart(3, '0');
  const m = s.match(/([0-9]{1,3})$/);
  if (m) return m[1].padStart(3, '0');
  return '001';
}

/** Build school code: DDSSS (no slash) */
function formatSchoolCode(districtCode2, seq3) {
  const dd = String(districtCode2 || '01').padStart(2, '0').slice(-2);
  const ss = String(Math.min(Math.max(Number(seq3) || 1, 1), 999)).padStart(3, '0');
  return `${dd}${ss}`;
}

/** Build 9-digit internal student UID: DD + SSS + NNNN */
function formatStudentUid(districtCode2, schoolCode3, seq4) {
  const dd = String(districtCode2 || '01').padStart(2, '0').slice(-2);
  const ss = parseSchoolCodeNumeric(schoolCode3);
  const nn = String(Math.min(Math.max(Number(seq4) || 1, 1), 9999)).padStart(4, '0');
  return `${dd}${ss}${nn}`;
}

/** Build student code: DDSSSNNNN (no slash) */
function formatStudentCode(districtCode2, schoolCode3, seq4) {
  const dd = String(districtCode2 || '01').padStart(2, '0').slice(-2);
  const ss = parseSchoolCodeNumeric(schoolCode3);
  const nn = String(Math.min(Math.max(Number(seq4) || 1, 1), 9999)).padStart(4, '0');
  return `${dd}${ss}${nn}`;
}

module.exports = {
  DISTRICTS_ALPHA,
  getDistrictCode,
  parseSchoolCodeNumeric,
  formatSchoolCode,
  formatStudentUid,
  formatStudentCode,
};
