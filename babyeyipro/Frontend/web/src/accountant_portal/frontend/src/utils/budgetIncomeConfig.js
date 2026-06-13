/** Configurable budget income sources — calculation types, deductions, totals. */

export const CALC_PER_STUDENT = 'per_student';
export const CALC_FIXED_AMOUNT = 'fixed_amount';

export const DEDUCTION_CATEGORIES = [
  'Orphans / Bursary Students',
  'Expected Defaulters',
  'Dropped Out Students',
  'Scholarship Beneficiaries',
  'Staff Children',
  'Sponsored Students',
  'Fee Waivers',
  'Discounts',
  'Refunds',
  'Other Deduction',
];

let _uid = 0;
export function newIncomeUid() {
  _uid += 1;
  return `inc-${Date.now()}-${_uid}`;
}

export function parseAmt(v) {
  const n = Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export const INCOME_SOURCE_PRESETS = [
  { key: 'Tuition Fees', label: 'Tuition Fee', icon: 'GraduationCap', calculationType: CALC_PER_STUDENT, category: 'Academic Fees' },
  { key: 'Registration Fees', label: 'Registration', icon: 'FileText', calculationType: CALC_PER_STUDENT, category: 'Academic Fees' },
  { key: 'Uniform Sales', label: 'Uniforms', icon: 'Shirt', calculationType: CALC_FIXED_AMOUNT, category: 'Miscellaneous' },
  { key: 'Feeding Fees', label: 'Meals', icon: 'UtensilsCrossed', calculationType: CALC_PER_STUDENT, category: 'Boarding & Welfare' },
  { key: 'Boarding Fees', label: 'Breakfast', icon: 'Coffee', calculationType: CALC_PER_STUDENT, category: 'Boarding & Welfare' },
  { key: 'School Canteen Income', label: 'Day Care', icon: 'Building2', calculationType: CALC_PER_STUDENT, category: 'Projects & Business' },
  { key: 'Admission Fees', label: 'New Comers', icon: 'UserPlus', calculationType: CALC_PER_STUDENT, category: 'Academic Fees' },
  { key: 'Other', label: 'Other Income', icon: 'CircleDollarSign', calculationType: CALC_FIXED_AMOUNT, category: 'Miscellaneous' },
  { key: '__custom__', label: 'Custom Source', icon: 'Plus', calculationType: CALC_FIXED_AMOUNT, category: '' },
];

export function getPresetForSource(sourceKey) {
  const key = String(sourceKey || '').trim();
  return INCOME_SOURCE_PRESETS.find((p) => p.key === key || p.label === key) || null;
}

export function defaultCalculationType(sourceKey) {
  const preset = getPresetForSource(sourceKey);
  return preset?.calculationType || CALC_FIXED_AMOUNT;
}

export function isTuitionFeesSource(source) {
  const s = String(source || '').trim().toLowerCase();
  return s === 'tuition fees' || s === 'tuition fee';
}

export function emptyDeduction(category = '') {
  return {
    id: newIncomeUid(),
    category: category || '',
    quantity: '',
    unitAmount: '',
    amount: '',
    description: '',
  };
}

/** Normalize legacy deduction shapes into quantity / unitAmount / amount. */
export function normalizeDeduction(d) {
  return {
    id: d.id || newIncomeUid(),
    category: d.category || d.name || '',
    quantity: d.quantity != null ? String(d.quantity) : '',
    unitAmount: d.unitAmount != null ? String(d.unitAmount) : '',
    amount: d.amount != null ? String(d.amount) : d.value != null ? String(d.value) : '',
    description: d.description || '',
  };
}

/**
 * Deduction total:
 * - With quantity: quantity × (deduction unit amount, else income source unit amount)
 * - Without quantity: flat unit amount / amount field
 */
export function computeDeductionTotal(ded, sourceContext = {}) {
  const d = normalizeDeduction(ded);
  const qty = parseAmt(d.quantity);
  const unit = parseAmt(d.unitAmount);
  const fallbackUnit = parseAmt(sourceContext.incomeUnitAmount);
  const stored = parseAmt(d.amount);

  if (qty > 0) {
    const rate = unit > 0 ? unit : fallbackUnit;
    if (rate > 0) return Math.round(qty * rate);
    return stored;
  }

  if (unit > 0) return Math.round(unit);
  return stored;
}

export function resolveIncomeUnitAmount(source) {
  const calculationType = source.calculationType || defaultCalculationType(source.incomeSource);
  if (calculationType === CALC_PER_STUDENT) {
    const unit = parseAmt(source.unitAmount);
    if (unit > 0) return unit;
    const gross = parseAmt(source.grossAmount);
    const ben = parseAmt(source.expectedBeneficiaries);
    if (gross > 0 && ben > 0) return Math.round(gross / ben);
  }
  return 0;
}

export function emptyIncomeSource(presetKey = '') {
  const preset = presetKey ? getPresetForSource(presetKey) : null;
  const isCustom = presetKey === '__custom__';
  return {
    uid: newIncomeUid(),
    incomeSource: isCustom ? '' : preset?.key || '',
    customSourceName: isCustom ? '' : '',
    incomeCategory: preset?.category || '',
    expectedAmount: '',
    collectionFrequency: preset ? 'Per Term' : '',
    description: '',
    tuitionAutoFilled: false,
    calculationType: preset?.calculationType || CALC_FIXED_AMOUNT,
    unitAmount: '',
    expectedBeneficiaries: '',
    grossAmount: '',
    deductions: [],
  };
}

/** Gross income before deductions; net = gross − total deduction amounts (RWF). */
export function computeIncomeSource(source) {
  const calculationType = source.calculationType || defaultCalculationType(source.incomeSource);
  const incomeUnitAmount = resolveIncomeUnitAmount(source);
  const deductions = (Array.isArray(source.deductions) ? source.deductions : []).map(normalizeDeduction);
  const totalDeductions = deductions.reduce(
    (s, d) => s + computeDeductionTotal(d, { incomeUnitAmount }),
    0
  );

  if (calculationType === CALC_PER_STUDENT) {
    const unitAmount = parseAmt(source.unitAmount);
    const expectedBeneficiaries = parseAmt(source.expectedBeneficiaries);
    const grossAmount =
      parseAmt(source.grossAmount) > 0
        ? parseAmt(source.grossAmount)
        : unitAmount * expectedBeneficiaries;
    const netAmount = Math.max(0, grossAmount - totalDeductions);
    return {
      calculationType,
      unitAmount,
      expectedBeneficiaries,
      totalDeductions,
      grossAmount,
      netAmount,
      payableBeneficiaries: expectedBeneficiaries,
    };
  }

  const grossAmount = parseAmt(source.grossAmount);
  const netAmount = Math.max(0, grossAmount - totalDeductions);
  return {
    calculationType,
    grossAmount,
    totalDeductions,
    netAmount,
    unitAmount: 0,
    expectedBeneficiaries: 0,
    payableBeneficiaries: null,
  };
}

export function computeBudgetIncomeSummary(sources) {
  const rows = (sources || []).map((src) => {
    const calc = computeIncomeSource(src);
    const name = incomeSourceDisplayName(src);
    return { name, ...calc, source: src };
  });

  const active = rows.filter(
    (r) =>
      (r.source.incomeSource?.trim() || r.source.customSourceName?.trim()) &&
      (r.grossAmount > 0 || r.netAmount > 0)
  );

  const grossIncome = active.reduce((s, r) => s + r.grossAmount, 0);
  const totalDeductionsImpact = active.reduce((s, r) => s + r.totalDeductions, 0);
  const netIncome = active.reduce((s, r) => s + r.netAmount, 0);

  return {
    rows: active,
    sourceCount: active.length,
    grossIncome,
    totalDeductionsImpact,
    netIncome,
  };
}

export function syncIncomeExpectedAmount(source) {
  const calc = computeIncomeSource(source);
  return {
    ...source,
    expectedAmount: calc.netAmount > 0 ? String(Math.round(calc.netAmount)) : '',
    grossAmount:
      calc.grossAmount > 0
        ? String(Math.round(calc.grossAmount))
        : source.grossAmount || '',
  };
}

export function incomeSourceDisplayName(source) {
  if (!source) return '—';
  if (source.customSourceName?.trim()) return source.customSourceName.trim();
  if (!source.incomeSource?.trim()) return 'New Income Source';
  if (String(source.incomeSource).toLowerCase() === 'other') {
    return source.customSourceName || 'Other Income';
  }
  const preset = getPresetForSource(source.incomeSource);
  return preset?.label || source.incomeSource;
}

export function mapIncomeFromApi(row) {
  const cfg = row.config || {};
  const calculationType = cfg.calculationType || defaultCalculationType(row.incomeSource);
  const base = {
    uid: newIncomeUid(),
    incomeSource: row.incomeSource || row.incomeSourceKey || '',
    customSourceName: row.customSourceName || '',
    incomeCategory: row.incomeCategory || '',
    expectedAmount: row.expectedAmount != null ? String(row.expectedAmount) : '',
    collectionFrequency: row.collectionFrequency || '',
    description: row.description || '',
    tuitionAutoFilled: false,
    calculationType,
    unitAmount: cfg.unitAmount != null ? String(cfg.unitAmount) : '',
    expectedBeneficiaries: cfg.expectedBeneficiaries != null ? String(cfg.expectedBeneficiaries) : '',
    grossAmount: cfg.grossAmount != null ? String(cfg.grossAmount) : cfg.fixedAmount != null ? String(cfg.fixedAmount) : '',
    deductions: Array.isArray(cfg.deductions)
      ? cfg.deductions.map((d) => normalizeDeduction(d))
      : [],
  };
  if (!base.grossAmount && parseAmt(base.expectedAmount) > 0 && calculationType === CALC_FIXED_AMOUNT) {
    base.grossAmount = base.expectedAmount;
  }
  return base;
}

export function mapIncomeToPayload(source) {
  const calc = computeIncomeSource(source);
  const isOther = String(source.incomeSource || '').toLowerCase() === 'other' || !source.incomeSource;
  return {
    incomeSource: isOther ? 'Other' : source.incomeSource,
    customSourceName: isOther ? String(source.customSourceName || '').trim() : '',
    incomeCategory: isOther ? String(source.incomeCategory || '').trim() : source.incomeCategory || '',
    expectedAmount: Math.round(calc.netAmount),
    collectionFrequency: source.collectionFrequency || '',
    description: String(source.description || '').trim(),
    config: {
      calculationType: calc.calculationType,
      unitAmount: calc.unitAmount,
      expectedBeneficiaries: calc.expectedBeneficiaries,
      grossAmount: calc.grossAmount,
      fixedAmount: calc.grossAmount,
      totalDeductions: calc.totalDeductions,
      netAmount: calc.netAmount,
      payableBeneficiaries: calc.payableBeneficiaries,
      deductions: (source.deductions || []).map((d) => {
        const n = normalizeDeduction(d);
        const incomeUnitAmount = resolveIncomeUnitAmount(source);
        const total = computeDeductionTotal(n, { incomeUnitAmount });
        return {
          id: n.id,
          category: String(n.category || '').trim(),
          name: String(n.category || '').trim(),
          quantity: parseAmt(n.quantity),
          unitAmount: parseAmt(n.unitAmount),
          amount: total,
          value: total,
          description: String(n.description || '').trim(),
        };
      }),
    },
  };
}

export function fmtRwf(n) {
  return new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
}
