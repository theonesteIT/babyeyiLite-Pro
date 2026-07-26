/**
 * Shared NESA fee limit + Babyeyi wizard smart-checker labels.
 * Used by NESA Tuition Manager and school Babyeyi wizards (School Manager, schoolLite, babyeyipro).
 */

export const NESA_FEE_EDUCATION_LEVELS = [
  { id: 'Nursery', label: 'Nursery Level', short: 'Nursery', nesaLevel: 'Nursery' },
  { id: 'Primary', label: 'Primary Level', short: 'Primary', nesaLevel: 'Primary' },
  { id: 'Secondary', label: 'Secondary Level', short: 'Secondary', nesaLevel: 'Secondary' },
  { id: 'TSS', label: 'TSS (Technical Secondary School)', short: 'TSS', nesaLevel: 'TSS' },
];

export const NESA_FEE_LEVEL_IDS = NESA_FEE_EDUCATION_LEVELS.map((o) => o.id);

/** Categories NESA sets + Babyeyi smart checker uses (no Private — private schools skip the checker). */
export const NESA_SMART_CHECKER_CATEGORIES = ['Public', 'Boarding', 'TVET'];

/** @deprecated use NESA_SMART_CHECKER_CATEGORIES */
export const NESA_FEE_CATEGORIES = NESA_SMART_CHECKER_CATEGORIES;

export const NESA_CATEGORY_META = {
  Public: {
    label: 'Public',
    desc: 'Day / public-sector schools',
    wizardNote: 'Government & aided public students',
  },
  Boarding: {
    label: 'Boarding',
    desc: 'Boarding schools',
    wizardNote: 'Boarding category on Babyeyi wizard',
  },
  TVET: {
    label: 'TVET',
    desc: 'Technical & vocational',
    wizardNote: 'Government-aided TVET stream',
  },
};

export const NESA_FEE_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Full Year'];

export const NESA_FEE_BLANK_FORM = {
  category: 'Public',
  level: 'Primary',
  term: 'Term 1',
  academic_year: '',
  max_amount: '',
  regulation_ref: '',
  effective_date: '',
  notes: '',
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

/** Wizard category dropdown options that participate in NESA smart checker (by school kind). */
export function nesaCheckerCategoriesForSchoolKind(schoolKind, feeTargetStudents) {
  if (schoolKind === 'private') return [];
  if (schoolKind === 'government') return ['Public', 'Boarding'];
  if (schoolKind === 'government_aided' && feeTargetStudents === 'public') {
    return [...NESA_SMART_CHECKER_CATEGORIES];
  }
  return [];
}
