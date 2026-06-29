/** Tax register vs bank disbursement channel for template allowances/deductions. */

export const PAYROLL_CHANNELS = {
  tax: { id: 'tax', label: 'Tax Payroll' },
  bank: { id: 'bank', label: 'Bank Payroll' },
  both: { id: 'both', label: 'Tax & Bank' },
};

export function normalizePayrollChannel(item) {
  const raw = String(item?.payrollChannel || item?.payroll_channel || 'tax').trim().toLowerCase();
  if (raw === 'bank') return 'bank';
  if (raw === 'both' || raw === 'tax & bank' || raw === 'tax and bank') return 'both';
  return 'tax';
}

export function payrollChannelLabel(channel) {
  const id = normalizePayrollChannel({ payrollChannel: channel });
  return PAYROLL_CHANNELS[id]?.label || 'Tax Payroll';
}

export function appliesToTaxPayroll(item) {
  const ch = normalizePayrollChannel(item);
  return ch === 'tax' || ch === 'both';
}

export function appliesToBankPayroll(item) {
  const ch = normalizePayrollChannel(item);
  return ch === 'bank' || ch === 'both';
}

/** Only bank-only items change bank net on top of tax net (both is already in tax net). */
export function affectsBankNetPay(item) {
  return normalizePayrollChannel(item) === 'bank';
}

export function isActiveTemplateItem(item) {
  const status = String(item?.status || 'Active').toLowerCase();
  return status !== 'inactive' && status !== 'disabled';
}

export function filterForTaxPayroll(items = []) {
  return (items || []).filter((item) => isActiveTemplateItem(item) && appliesToTaxPayroll(item));
}

export function filterForBankPayroll(items = []) {
  return (items || []).filter((item) => isActiveTemplateItem(item) && appliesToBankPayroll(item));
}

/** @deprecated use filterForTaxPayroll / filterForBankPayroll */
export function filterTemplateByChannel(items = [], channel = 'tax') {
  if (channel === 'bank') return filterForBankPayroll(items);
  return filterForTaxPayroll(items);
}

export function templateItemName(item, fallback = 'Item') {
  if (String(item?.category || '').toLowerCase() === 'other' && item?.customName) return item.customName;
  return item?.name || item?.category || item?.label || fallback;
}

export function normalizePayrollColumnName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function stablePayrollColumnId(item) {
  return normalizePayrollColumnName(templateItemName(item));
}

function normalizeAmountType(a) {
  const t = String(a?.amountType || a?.type || a?.amtType || 'Fixed Amount').toLowerCase();
  if (t.includes('gross')) return 'percent_gross';
  if (t.includes('basic') || t.includes('percentage') || t === 'percentage') return 'percent_basic';
  return 'fixed';
}

export function calcTemplateItemAmount(item, basic, gross) {
  const value = Number(item?.value ?? item?.amount ?? 0);
  const n = Number.isFinite(value) ? value : 0;
  const kind = normalizeAmountType(item);
  if (kind === 'percent_gross') return Math.round((Number(gross) * n) / 100);
  if (kind === 'percent_basic') return Math.round((Number(basic) * n) / 100);
  return Math.round(n);
}

function columnDefFromTemplateItem(item, kind) {
  const name = templateItemName(item, kind === 'allowance' ? 'Allowance' : 'Deduction');
  return {
    id: stablePayrollColumnId(item),
    name,
    kind,
    channel: normalizePayrollChannel(item),
  };
}

function pushTemplateItem(items, item, kind, basic, gross) {
  const amount = calcTemplateItemAmount(item, basic, gross);
  if (!amount) return;
  const channel = normalizePayrollChannel(item);
  const name = templateItemName(item, kind === 'allowance' ? 'Allowance' : 'Deduction');
  items.push({
    id: stablePayrollColumnId(item),
    name,
    kind,
    channel,
    amount,
    affectsBankNet: affectsBankNetPay(item),
  });
}

export function buildTemplatePayrollItems(allowances = [], deductions = [], basic, gross) {
  const items = [];
  for (const a of allowances) pushTemplateItem(items, a, 'allowance', basic, gross);
  for (const d of deductions) pushTemplateItem(items, d, 'deduction', basic, gross);
  return items;
}

export function buildTaxPayrollItems(allowances = [], deductions = [], basic, gross) {
  return buildTemplatePayrollItems(allowances, deductions, basic, gross)
    .filter((item) => item.channel === 'tax' || item.channel === 'both');
}

export function buildBankPayrollItems(allowances = [], deductions = [], basic, gross) {
  return buildTemplatePayrollItems(allowances, deductions, basic, gross)
    .filter((item) => item.channel === 'bank' || item.channel === 'both');
}

export function bankPayrollNetAdjust(items = []) {
  return (items || []).reduce((sum, item) => {
    if (!item.affectsBankNet) return sum;
    return sum + (item.kind === 'allowance' ? Number(item.amount || 0) : -Number(item.amount || 0));
  }, 0);
}

export function getActiveTaxPayrollColumns(template) {
  const cols = [];
  for (const a of filterForTaxPayroll(template?.allowances || [])) {
    cols.push(columnDefFromTemplateItem(a, 'allowance'));
  }
  for (const d of filterForTaxPayroll(template?.deductions || [])) {
    cols.push(columnDefFromTemplateItem(d, 'deduction'));
  }
  return cols;
}

export function getActiveBankPayrollColumns(template) {
  const cols = [];
  for (const a of filterForBankPayroll(template?.allowances || [])) {
    cols.push(columnDefFromTemplateItem(a, 'allowance'));
  }
  for (const d of filterForBankPayroll(template?.deductions || [])) {
    cols.push(columnDefFromTemplateItem(d, 'deduction'));
  }
  return cols;
}

/** All active template items as columns (Payroll Run view). */
export function getActiveRunTemplateColumns(template) {
  const cols = [];
  for (const a of (template?.allowances || []).filter(isActiveTemplateItem)) {
    cols.push(columnDefFromTemplateItem(a, 'allowance'));
  }
  for (const d of (template?.deductions || []).filter(isActiveTemplateItem)) {
    cols.push(columnDefFromTemplateItem(d, 'deduction'));
  }
  return cols;
}

function mergeItemLists(computed = [], stored = []) {
  const map = new Map();
  for (const item of computed || []) {
    const key = normalizePayrollColumnName(item.name);
    if (key) map.set(key, item);
  }
  for (const item of stored || []) {
    const key = normalizePayrollColumnName(item.name);
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, {
      ...(prev || {}),
      ...item,
      id: item.id || prev?.id || key,
      name: item.name || prev?.name,
      amount: Number(item.amount || 0) || Number(prev?.amount || 0),
    });
  }
  return [...map.values()];
}

/** Recompute template item amounts from register row; merge with stored line items. */
export function resolveStaffPayrollItems({ registerRow = {}, line = null, template = null, calcSnapshot = null } = {}) {
  const basic = Number(registerRow.basicSalary ?? registerRow.basic ?? line?.basic ?? line?.basicSalary ?? 0);
  const gross = Number(registerRow.gross ?? line?.gross ?? basic);
  const snap = calcSnapshot || line?.calcSnapshot || null;

  let taxItems = line?.taxPayrollItems || snap?.taxPayrollItems || registerRow?.taxPayrollItems || [];
  let bankItems = line?.bankPayrollItems || snap?.bankPayrollItems || registerRow?.bankPayrollItems || [];

  if (template && basic > 0) {
    const computedTax = buildTaxPayrollItems(
      filterForTaxPayroll(template.allowances || []),
      filterForTaxPayroll(template.deductions || []),
      basic,
      gross,
    );
    const computedBank = buildBankPayrollItems(
      filterForBankPayroll(template.allowances || []),
      filterForBankPayroll(template.deductions || []),
      basic,
      gross,
    );
    taxItems = mergeItemLists(computedTax, taxItems);
    bankItems = mergeItemLists(computedBank, bankItems);
  }

  return { taxPayrollItems: taxItems, bankPayrollItems: bankItems };
}

export function allTemplateItemsForRow(row = {}) {
  const map = new Map();
  for (const item of [...(row.taxPayrollItems || []), ...(row.bankPayrollItems || [])]) {
    const key = normalizePayrollColumnName(item.name);
    if (!key) continue;
    map.set(key, item);
  }
  return [...map.values()];
}

export function payrollItemAmountForColumn(items = [], column) {
  const colKey = normalizePayrollColumnName(column?.name);
  const colId = normalizePayrollColumnName(column?.id);
  const list = items || [];
  const match = list.find((item) => {
    if (colKey && normalizePayrollColumnName(item.name) === colKey) return true;
    if (colId && normalizePayrollColumnName(item.id) === colId) return true;
    if (colId && String(item.id) === String(column?.id)) return true;
    return false;
  });
  return Number(match?.amount || 0);
}

export const bankItemAmountForColumn = payrollItemAmountForColumn;
export const taxItemAmountForColumn = payrollItemAmountForColumn;

export function mergePayrollColumnsFromItems(items = [], columns = [], channelFilter = () => true) {
  const map = new Map();
  for (const col of columns || []) {
    map.set(normalizePayrollColumnName(col.name), col);
  }
  const hasSpecific = map.size > 0;
  for (const item of items || []) {
    if (!channelFilter(item)) continue;
    const key = normalizePayrollColumnName(item.name);
    if (!key) continue;
    if (hasSpecific && (key === 'deduction' || key === 'allowance')) continue;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: item.name || key,
        kind: item.kind === 'allowance' ? 'allowance' : 'deduction',
        channel: item.channel || 'tax',
      });
    }
  }
  return [...map.values()];
}

export function mergeBankColumnsFromItems(items = [], columns = []) {
  return mergePayrollColumnsFromItems(
    items,
    columns,
    (item) => item.channel === 'bank' || item.channel === 'both',
  );
}

export function mergeTaxColumnsFromItems(items = [], columns = []) {
  return mergePayrollColumnsFromItems(
    items,
    columns,
    (item) => item.channel === 'tax' || item.channel === 'both',
  );
}

export const PAYROLL_CHANNEL_OPTIONS = [
  { value: 'tax', label: 'Tax Payroll' },
  { value: 'bank', label: 'Bank Payroll' },
  { value: 'both', label: 'Tax & Bank (Both)' },
];

export function payrollChannelFormLabel(channel) {
  return PAYROLL_CHANNEL_OPTIONS.find((o) => o.value === normalizePayrollChannel({ payrollChannel: channel }))?.label
    || 'Tax Payroll';
}

export function payrollChannelFromFormLabel(label) {
  const match = PAYROLL_CHANNEL_OPTIONS.find((o) => o.label === label);
  return match?.value || 'tax';
}
