/**
 * Rwanda districts in alphabetical order → 2-digit codes 01–30.
 * Kept in sync with backend/utils/rwandaDistrictCodes.js
 */
export const DISTRICTS_ALPHA = [
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
  DISTRICTS_ALPHA.map((name, i) => [
    String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' '),
    String(i + 1).padStart(2, '0'),
  ])
);

/** @returns {string|null} two-digit code or null if unknown */
export function getDistrictCode(districtName) {
  if (!districtName) return null;
  const key = String(districtName)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return CODE_BY_DISTRICT.get(key) || null;
}
