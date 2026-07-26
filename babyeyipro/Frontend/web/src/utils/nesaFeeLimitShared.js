/**
 * Shared NESA fee limit + Babyeyi wizard smart-checker labels (babyeyipro).
 */
export const NESA_FEE_EDUCATION_LEVELS = [
  { id: 'Nursery', label: 'Nursery Level', short: 'Nursery', nesaLevel: 'Nursery' },
  { id: 'Primary', label: 'Primary Level', short: 'Primary', nesaLevel: 'Primary' },
  { id: 'Secondary', label: 'Secondary Level', short: 'Secondary', nesaLevel: 'Secondary' },
  { id: 'TSS', label: 'TSS (Technical Secondary School)', short: 'TSS', nesaLevel: 'TSS' },
];

export const NESA_FEE_LEVEL_IDS = NESA_FEE_EDUCATION_LEVELS.map((o) => o.id);
export const NESA_SMART_CHECKER_CATEGORIES = ['Public', 'Boarding', 'TVET'];
export const NESA_FEE_CATEGORIES = NESA_SMART_CHECKER_CATEGORIES;

export const NESA_CATEGORY_META = {
  Public: { label: 'Public', desc: 'Day / public-sector schools', wizardNote: 'Government & aided public students' },
  Boarding: { label: 'Boarding', desc: 'Boarding schools', wizardNote: 'Boarding category on Babyeyi wizard' },
  TVET: { label: 'TVET', desc: 'Technical & vocational', wizardNote: 'Government-aided TVET stream' },
};

export function normalizeNesaFeeLevel(level) {
  const s = String(level || '').trim();
  if (s === 'University') return 'Secondary';
  if (NESA_FEE_LEVEL_IDS.includes(s)) return s;
  return 'Primary';
}

export function normalizeNesaFeeCategory(category) {
  const s = String(category || '').trim();
  if (s === 'Private') return 'Public';
  if (NESA_SMART_CHECKER_CATEGORIES.includes(s)) return s;
  return 'Public';
}
