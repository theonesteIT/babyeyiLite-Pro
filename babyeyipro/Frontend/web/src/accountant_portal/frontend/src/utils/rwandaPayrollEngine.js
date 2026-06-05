export const DEFAULT_PAYE_BRACKETS = [
  { min: 0, max: 60000, rate: 0 },
  { min: 60001, max: 100000, rate: 10 },
  { min: 100001, max: 200000, rate: 20 },
  { min: 200001, max: null, rate: 30 },
];

/** Fixed marginal band widths on gross salary (RWF) — Rwanda RRA monthly */
const RWANDA_PAYE_BAND_WIDTHS = [60000, 40000, 100000];
const RWANDA_PAYE_DEFAULT_RATES = [0, 10, 20, 30];

export const ALLOWANCE_CATEGORIES = [
  'Transport Allowance',
  'Housing Allowance',
  'Communication Allowance',
  'Responsibility Allowance',
  'Risk Allowance',
  'Meal Allowance',
  'Entertainment Allowance',
  'Overtime',
  'Bonus',
  'Acting Allowance',
  'Hardship Allowance',
  'Medical Allowance',
  'Travel Allowance',
  'Other',
];

export const DEDUCTION_CATEGORIES = [
  'Loan',
  'Salary Advance',
  'SACCO',
  'Union Fee',
  'Penalty',
  'Court Order',
  'Insurance',
  'Staff Welfare',
  'Other',
];

const DEFAULT_STATUTORY = {
  rssbEmployee: 6,
  rssbEmployer: 6,
  occupationalHazard: 2,
  maternityEmployee: 0.3,
  maternityEmployer: 0.3,
  ramaEmployee: 7.5,
  ramaEmployer: 7.5,
  cbhi: 0.5,
};

/** Kigali school register: allowances = 30% of gross → Gross = Basic ÷ 0.7; Others/H/A/T/A each 10% of gross */
export const DEFAULT_SCHOOL_ALLOWANCE_RULES = {
  enabled: true,
  totalPercentOfGross: 30,
  registerColumnPercentOfGross: 10,
};

export function normalizeAllowanceRules(raw = {}) {
  const src = raw?.allowanceAuto || raw?.allowanceRules || raw;
  const enabled = src.enabled !== false && src.autoFromBasic !== false;
  return {
    enabled: src.enabled === false || src.autoFromBasic === false ? false : enabled,
    totalPercentOfGross: parseRatePercent(src.totalPercentOfGross, DEFAULT_SCHOOL_ALLOWANCE_RULES.totalPercentOfGross),
    registerColumnPercentOfGross: parseRatePercent(
      src.registerColumnPercentOfGross ?? src.columnPercentOfGross,
      DEFAULT_SCHOOL_ALLOWANCE_RULES.registerColumnPercentOfGross
    ),
  };
}

/**
 * Auto allowances from basic only — same formula for every employee (scales with basic).
 * Gross = Basic / (1 − total% on gross). Register shows Others, H/A, T/A each at column% of gross.
 */
export function calcSchoolAllowancesFromBasic(basicSalary, rules = {}) {
  const r = normalizeAllowanceRules(rules);
  const basic = Math.max(0, toMoney(basicSalary));
  if (!basic) {
    return {
      gross: 0,
      totalAllowances: 0,
      transportAmount: 0,
      registerAllowanceSplit: { others: 0, housing: 0, transport: 0, totalAllowances: 0 },
      allowanceBreakdown: [],
      autoApplied: true,
    };
  }
  const totalPct = r.totalPercentOfGross / 100;
  const colPct = r.registerColumnPercentOfGross / 100;
  const gross = Math.round(basic / (1 - totalPct));
  const totalAllowances = Math.max(0, gross - basic);
  const col = Math.round(gross * colPct);
  const others = col;
  const housing = col;
  const transport = col;
  return {
    gross,
    totalAllowances,
    transportAmount: transport,
    registerAllowanceSplit: {
      others,
      housing,
      transport,
      totalAllowances,
    },
    allowanceBreakdown: [
      { name: 'Others', amount: others },
      { name: 'Housing Allowance', amount: housing },
      { name: 'Transport Allowance', amount: transport },
    ],
    autoApplied: true,
  };
}

export function shouldUseSchoolAutoAllowances(allowances = [], rules = {}, options = {}) {
  const r = normalizeAllowanceRules(rules);
  if (!r.enabled) return false;
  if (options.runAllowances?.length) return false;
  if (options.forceManual) return false;
  return true;
}

function splitAllowanceBreakdownForRegister(breakdown = [], gross = 0, basic = 0, rules = {}) {
  const r = normalizeAllowanceRules(rules);
  let housing = 0;
  let transport = 0;
  let others = 0;
  let total = 0;
  for (const item of breakdown || []) {
    const name = String(item?.name || '').toLowerCase();
    const amt = toMoney(item?.amount);
    total += amt;
    if (name.includes('transport')) transport += amt;
    else if (name.includes('housing')) housing += amt;
    else others += amt;
  }
  if (!total && gross > 0 && basic > 0) {
    total = Math.max(0, gross - basic);
  }
  if (gross > 0 && r.registerColumnPercentOfGross > 0) {
    const col = Math.round(gross * (r.registerColumnPercentOfGross / 100));
    if (housing === 0 && others === 0 && transport === 0 && total > 0) {
      others = housing = transport = col;
    } else if (total > 0 && others === housing && housing === transport && transport > 0) {
      others = housing = transport = col;
    }
  }
  total = Math.round(total || others + housing + transport);
  return {
    registerAllowanceSplit: {
      others: Math.round(others),
      housing: Math.round(housing),
      transport: Math.round(transport),
      totalAllowances: total,
    },
    transportAmount: Math.round(transport),
  };
}

function toMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseRatePercent(v, fallback) {
  if (v == null || v === '') return fallback;
  const s = String(v).replace(/%/g, '').replace(/,/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

/** Extract bracket rates [0, 10, 20, 30] — ignores broken min/max from saved templates */
export function normalizePayeRates(brackets) {
  if (!Array.isArray(brackets) || !brackets.length) return [...RWANDA_PAYE_DEFAULT_RATES];
  const sorted = [...brackets].sort((a, b) => Number(a?.min ?? 0) - Number(b?.min ?? 0));
  const rates = sorted.slice(0, 4).map((b, i) => parseRatePercent(b?.rate, RWANDA_PAYE_DEFAULT_RATES[i]));
  while (rates.length < 4) rates.push(RWANDA_PAYE_DEFAULT_RATES[rates.length]);
  return rates;
}

/**
 * Rwanda monthly PAYE on gross salary — marginal brackets (not flat % on full salary).
 * 0–60,000 @ 0%; 60,001–100,000 @ 10%; 100,001–200,000 @ 20%; above 200,000 @ 30%
 */
export function calcProgressivePAYEBreakdown(grossSalary, brackets = DEFAULT_PAYE_BRACKETS) {
  const income = Math.max(0, toMoney(grossSalary));
  const rates = normalizePayeRates(brackets);
  const bracketLabels = [
    '0 – 60,000',
    '60,001 – 100,000',
    '100,001 – 200,000',
    'Above 200,000',
  ];

  const rows = [];
  let tax = 0;
  let remaining = income;

  for (let i = 0; i < RWANDA_PAYE_BAND_WIDTHS.length; i++) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, RWANDA_PAYE_BAND_WIDTHS[i]);
    const rowTax = slice * (rates[i] / 100);
    tax += rowTax;
    remaining -= slice;
    if (slice > 0) {
      rows.push({
        bracket: bracketLabels[i],
        amountInBracket: Math.round(slice),
        rate: rates[i],
        tax: Math.round(rowTax),
      });
    }
  }

  if (remaining > 0) {
    const rowTax = remaining * (rates[3] / 100);
    tax += rowTax;
    rows.push({
      bracket: bracketLabels[3],
      amountInBracket: Math.round(remaining),
      rate: rates[3],
      tax: Math.round(rowTax),
    });
  }

  return { total: Math.round(Math.max(0, tax)), rows };
}

export function calcProgressivePAYE(grossSalary, brackets = DEFAULT_PAYE_BRACKETS) {
  return calcProgressivePAYEBreakdown(grossSalary, brackets).total;
}

function normalizeAmountType(a) {
  const t = String(a?.amountType || a?.type || 'Fixed Amount').toLowerCase();
  if (t.includes('gross')) return 'percent_gross';
  if (t.includes('basic') || t.includes('percentage')) return 'percent_basic';
  return 'fixed';
}

function isActiveItem(item) {
  const status = String(item?.status || 'Active').toLowerCase();
  return status !== 'inactive' && status !== 'disabled';
}

function allowanceLabel(a) {
  if (String(a?.category || '').toLowerCase() === 'other' && a?.customName) return a.customName;
  return a?.name || a?.category || 'Allowance';
}

function isTransportAllowance(a) {
  return allowanceLabel(a).toLowerCase().includes('transport');
}

function calcAllowanceAmount(a, basic, gross) {
  const value = toMoney(a?.value);
  const kind = normalizeAmountType(a);
  if (kind === 'percent_gross') return (gross * value) / 100;
  if (kind === 'percent_basic') return (basic * value) / 100;
  return value;
}

function calcGrossSalary(basicSalary, allowances = []) {
  const basic = toMoney(basicSalary);
  const active = (allowances || []).filter(isActiveItem);
  let fixedAndBasicPct = 0;
  const grossPctItems = [];
  for (const a of active) {
    const kind = normalizeAmountType(a);
    if (kind === 'percent_gross') grossPctItems.push(a);
    else fixedAndBasicPct += calcAllowanceAmount(a, basic, 0);
  }
  let gross = basic + fixedAndBasicPct;
  for (const a of grossPctItems) {
    gross += calcAllowanceAmount(a, basic, gross);
  }
  const breakdown = active.map((a) => ({
    name: allowanceLabel(a),
    amount: Math.round(calcAllowanceAmount(a, basic, gross)),
  }));
  return { gross: Math.round(gross), breakdown };
}

function sumTemplateDeductions(deductions = [], basic, gross) {
  return (deductions || [])
    .filter(isActiveItem)
    .reduce((sum, d) => {
      const val = toMoney(d?.value);
      const t = String(d?.amountType || d?.type || 'Fixed').toLowerCase();
      if (t.includes('percent')) {
        const base = t.includes('gross') ? gross : basic;
        return sum + (base * val) / 100;
      }
      return sum + val;
    }, 0);
}

function statutoryPct(statutory, key, fallback) {
  return parseRatePercent(statutory?.[key], fallback);
}

/** Normalize saved template statutory JSON (handles "0.3%" strings and legacy 0.6% maternity). */
export function normalizeStatutoryRates(raw = {}) {
  const pick = (key, fallback) => statutoryPct(raw, key, fallback);
  const rates = {
    rssbEmployee: pick('rssbEmployee', DEFAULT_STATUTORY.rssbEmployee),
    rssbEmployer: pick('rssbEmployer', DEFAULT_STATUTORY.rssbEmployer),
    occupationalHazard: pick('occupationalHazard', DEFAULT_STATUTORY.occupationalHazard),
    maternityEmployee: pick('maternityEmployee', DEFAULT_STATUTORY.maternityEmployee),
    maternityEmployer: pick('maternityEmployer', DEFAULT_STATUTORY.maternityEmployer),
    ramaEmployee: pick('ramaEmployee', DEFAULT_STATUTORY.ramaEmployee),
    ramaEmployer: pick('ramaEmployer', DEFAULT_STATUTORY.ramaEmployer),
    cbhi: pick('cbhi', DEFAULT_STATUTORY.cbhi),
  };
  // Legacy templates sometimes stored combined 0.6% instead of 0.3% per party
  if (rates.maternityEmployee >= 0.59 && rates.maternityEmployee <= 0.61) rates.maternityEmployee = 0.3;
  if (rates.maternityEmployer >= 0.59 && rates.maternityEmployer <= 0.61) rates.maternityEmployer = 0.3;
  return rates;
}

export function calcRwandaPayroll(input = {}) {
  const basic = toMoney(input.basicSalary);
  const allowances = input.allowances || [];
  const templateDeductions = input.templateDeductions || input.deductions || [];
  const employeeDeductions = input.employeeDeductions || [];
  const statutory = normalizeStatutoryRates({ ...DEFAULT_STATUTORY, ...(input.statutory || {}) });
  const payeRates = input.payeRates?.length ? input.payeRates : DEFAULT_PAYE_BRACKETS;
  const allowanceRules = input.allowanceRules || input.rules?.allowanceAuto || input.rules || {};
  const useSchoolAuto = shouldUseSchoolAutoAllowances(allowances, allowanceRules, {
    runAllowances: input.runAllowances,
    forceManual: input.forceManualAllowances,
  });

  let gross;
  let allowanceBreakdown;
  let transportAmount;
  let registerAllowanceSplit;
  let allowanceAutoApplied = false;

  const storedSplit = input.storedAllowanceSplit;
  const hasStoredSplit = storedSplit
    && (toMoney(storedSplit.transport) + toMoney(storedSplit.housing) + toMoney(storedSplit.others) > 0);

  if (hasStoredSplit) {
    const transport = toMoney(storedSplit.transport);
    const housing = toMoney(storedSplit.housing);
    const others = toMoney(storedSplit.others);
    const totalAllowances = transport + housing + others;
    gross = Math.round(basic + totalAllowances);
    transportAmount = transport;
    registerAllowanceSplit = {
      others: Math.round(others),
      housing: Math.round(housing),
      transport: Math.round(transport),
      totalAllowances: Math.round(totalAllowances),
    };
    allowanceBreakdown = [
      { name: 'Others', amount: registerAllowanceSplit.others },
      { name: 'Housing Allowance', amount: registerAllowanceSplit.housing },
      { name: 'Transport Allowance', amount: registerAllowanceSplit.transport },
    ];
    const extras = (allowances || []).filter(isActiveItem);
    if (extras.length) {
      const topped = calcGrossSalary(gross, extras);
      const extraTotal = topped.breakdown.reduce((sum, item) => sum + toMoney(item.amount), 0);
      gross = topped.gross;
      const othersWithExtras = Math.round(registerAllowanceSplit.others + extraTotal);
      allowanceBreakdown = [
        { name: 'Others', amount: othersWithExtras },
        { name: 'Housing Allowance', amount: registerAllowanceSplit.housing },
        { name: 'Transport Allowance', amount: registerAllowanceSplit.transport },
        ...topped.breakdown,
      ];
      registerAllowanceSplit = {
        ...registerAllowanceSplit,
        others: othersWithExtras,
        totalAllowances: Math.round(registerAllowanceSplit.totalAllowances + extraTotal),
      };
    }
  } else if (useSchoolAuto) {
    const school = calcSchoolAllowancesFromBasic(basic, allowanceRules);
    gross = school.gross;
    allowanceBreakdown = [...school.allowanceBreakdown];
    registerAllowanceSplit = { ...school.registerAllowanceSplit };
    transportAmount = school.transportAmount;
    allowanceAutoApplied = true;
    const extras = (allowances || []).filter(isActiveItem);
    if (extras.length) {
      const topped = calcGrossSalary(school.gross, extras);
      const extraTotal = topped.breakdown.reduce((sum, item) => sum + toMoney(item.amount), 0);
      gross = topped.gross;
      const othersWithExtras = Math.round(registerAllowanceSplit.others + extraTotal);
      allowanceBreakdown = [
        { name: 'Others', amount: othersWithExtras },
        { name: 'Housing Allowance', amount: registerAllowanceSplit.housing },
        { name: 'Transport Allowance', amount: registerAllowanceSplit.transport },
        ...topped.breakdown,
      ];
      registerAllowanceSplit = {
        ...registerAllowanceSplit,
        others: othersWithExtras,
        totalAllowances: Math.round(registerAllowanceSplit.totalAllowances + extraTotal),
      };
    }
  } else {
    const manual = calcGrossSalary(basic, allowances);
    gross = manual.gross;
    allowanceBreakdown = manual.breakdown;
    const split = splitAllowanceBreakdownForRegister(manual.breakdown, gross, basic, allowanceRules);
    registerAllowanceSplit = split.registerAllowanceSplit;
    transportAmount = split.transportAmount;
  }

  const baseSalary = Math.max(0, Math.round(gross - transportAmount));

  // CSR pension: 6% employee + 6% employer on gross; occupational hazard 2% on base
  const rssbEmployee = Math.round(gross * (statutoryPct(statutory, 'rssbEmployee', 6) / 100));
  const rssbEmployer = Math.round(gross * (statutoryPct(statutory, 'rssbEmployer', 6) / 100));
  const occupationalHazard = Math.round(baseSalary * (statutoryPct(statutory, 'occupationalHazard', 2) / 100));

  // Maternity leave: 0.3% employee + 0.3% employer, both on base (total 0.6% of base)
  const maternityEmployee = Math.round(baseSalary * (statutoryPct(statutory, 'maternityEmployee', 0.3) / 100));
  const maternityEmployer = Math.round(baseSalary * (statutoryPct(statutory, 'maternityEmployer', 0.3) / 100));

  // RAMA medical: 7.5% employee + 7.5% employer on basic salary
  const ramaEmployee = Math.round(basic * (statutoryPct(statutory, 'ramaEmployee', 7.5) / 100));
  const ramaEmployer = Math.round(basic * (statutoryPct(statutory, 'ramaEmployer', 7.5) / 100));

  const payeBreakdown = calcProgressivePAYEBreakdown(gross, payeRates);
  const paye = payeBreakdown.total;

  const recurringDeductions = Math.round(sumTemplateDeductions(templateDeductions, basic, gross));
  const employeeSpecific = Math.round(
    employeeDeductions.reduce((s, d) => s + toMoney(d.monthlyInstallment ?? d.value), 0)
  );
  const otherDeductions = recurringDeductions + employeeSpecific;

  // Income salary (net before Mutuelle/CBHI): Gross − PAYE − CSR 6% emp − M.LEAVE 0.3% emp − RAMA 7.5% emp − other
  const incomeSalary = Math.round(
    gross - paye - rssbEmployee - maternityEmployee - ramaEmployee - otherDeductions
  );
  const cbhi = Math.round(incomeSalary * (statutoryPct(statutory, 'cbhi', 0.5) / 100));
  const finalNet = Math.round(incomeSalary - cbhi);

  const employerTotal = rssbEmployer + maternityEmployer + ramaEmployer + occupationalHazard;
  const maternityTotal = maternityEmployee + maternityEmployer;
  const csrEmployer8 = rssbEmployer + occupationalHazard;
  // TOTAL CSR 14% = 6% emp (gross) + 6% empl (gross) + 2% hazard (base) — maternity is separate
  const totalCsr14 = rssbEmployee + rssbEmployer + occupationalHazard;
  const ramaTotal = ramaEmployee + ramaEmployer;

  return {
    basicSalary: Math.round(basic),
    grossSalary: gross,
    baseSalary,
    transportAmount,
    allowanceBreakdown,
    registerAllowanceSplit,
    allowanceAutoApplied,
    paye,
    payeBreakdown: payeBreakdown.rows,
    rssbEmployee,
    rssbEmployer,
    maternityEmployee,
    maternityEmployer,
    ramaEmployee,
    ramaEmployer,
    occupationalHazard,
    maternityTotal,
    csrEmployer8,
    totalCsr14,
    ramaTotal,
    otherDeductions,
    incomeSalary,
    netBeforeCbhi: incomeSalary,
    netPay: incomeSalary,
    cbhi,
    finalNet,
    netPayFinal: finalNet,
    netSalary: finalNet,
    employerContributions: {
      rssb: rssbEmployer,
      maternity: maternityEmployer,
      rama: ramaEmployer,
      occupationalHazard,
      total: employerTotal,
    },
    totalCostToSchool: Math.round(gross + employerTotal),
  };
}

export function fmtRwf(n) {
  return `${Math.round(Number(n) || 0).toLocaleString()} RWF`;
}
