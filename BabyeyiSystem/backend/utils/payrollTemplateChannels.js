/** Tax register vs bank disbursement channel for template allowances/deductions. */

function normalizePayrollChannel(item) {
  const raw = String(item?.payrollChannel || item?.payroll_channel || 'tax').trim().toLowerCase();
  if (raw === 'bank') return 'bank';
  if (raw === 'both' || raw === 'tax & bank' || raw === 'tax and bank') return 'both';
  return 'tax';
}

function appliesToTaxPayroll(item) {
  const ch = normalizePayrollChannel(item);
  return ch === 'tax' || ch === 'both';
}

function appliesToBankPayroll(item) {
  const ch = normalizePayrollChannel(item);
  return ch === 'bank' || ch === 'both';
}

function affectsBankNetPay(item) {
  return normalizePayrollChannel(item) === 'bank';
}

function isActiveTemplateItem(item) {
  const status = String(item?.status || 'Active').toLowerCase();
  return status !== 'inactive' && status !== 'disabled';
}

function filterForTaxPayroll(items = []) {
  return (items || []).filter((item) => isActiveTemplateItem(item) && appliesToTaxPayroll(item));
}

function filterForBankPayroll(items = []) {
  return (items || []).filter((item) => isActiveTemplateItem(item) && appliesToBankPayroll(item));
}

function filterTemplateByChannel(items = [], channel = 'tax') {
  if (channel === 'bank') return filterForBankPayroll(items);
  return filterForTaxPayroll(items);
}

function templateItemName(item, fallback = 'Item') {
  if (String(item?.category || '').toLowerCase() === 'other' && item?.customName) return item.customName;
  return item?.name || item?.category || item?.label || fallback;
}

function normalizePayrollColumnName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stablePayrollColumnId(item) {
  return normalizePayrollColumnName(templateItemName(item));
}

function normalizeAmountType(a) {
  const t = String(a?.amountType || a?.type || a?.amtType || 'Fixed Amount').toLowerCase();
  if (t.includes('gross')) return 'percent_gross';
  if (t.includes('basic') || t.includes('percentage') || t === 'percentage') return 'percent_basic';
  return 'fixed';
}

function calcTemplateItemAmount(item, basic, gross) {
  const value = Number(item?.value ?? item?.amount ?? 0);
  const n = Number.isFinite(value) ? value : 0;
  const kind = normalizeAmountType(item);
  if (kind === 'percent_gross') return Math.round((Number(gross) * n) / 100);
  if (kind === 'percent_basic') return Math.round((Number(basic) * n) / 100);
  return Math.round(n);
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

function buildTemplatePayrollItems(allowances = [], deductions = [], basic, gross) {
  const items = [];
  for (const a of allowances) pushTemplateItem(items, a, 'allowance', basic, gross);
  for (const d of deductions) pushTemplateItem(items, d, 'deduction', basic, gross);
  return items;
}

function buildTaxPayrollItems(allowances = [], deductions = [], basic, gross) {
  return buildTemplatePayrollItems(allowances, deductions, basic, gross)
    .filter((item) => item.channel === 'tax' || item.channel === 'both');
}

function buildBankPayrollItems(allowances = [], deductions = [], basic, gross) {
  return buildTemplatePayrollItems(allowances, deductions, basic, gross)
    .filter((item) => item.channel === 'bank' || item.channel === 'both');
}

function bankPayrollNetAdjust(items = []) {
  return (items || []).reduce((sum, item) => {
    if (!item.affectsBankNet) return sum;
    return sum + (item.kind === 'allowance' ? Number(item.amount || 0) : -Number(item.amount || 0));
  }, 0);
}

function getActiveBankPayrollColumns(template) {
  const cols = [];
  for (const a of filterForBankPayroll(template?.allowances || [])) {
    cols.push({
      id: String(a.id ?? templateItemName(a)),
      name: templateItemName(a, 'Allowance'),
      kind: 'allowance',
      channel: normalizePayrollChannel(a),
    });
  }
  for (const d of filterForBankPayroll(template?.deductions || [])) {
    cols.push({
      id: String(d.id ?? templateItemName(d)),
      name: templateItemName(d, 'Deduction'),
      kind: 'deduction',
      channel: normalizePayrollChannel(d),
    });
  }
  return cols;
}

module.exports = {
  normalizePayrollChannel,
  appliesToTaxPayroll,
  appliesToBankPayroll,
  affectsBankNetPay,
  filterForTaxPayroll,
  filterForBankPayroll,
  filterTemplateByChannel,
  templateItemName,
  buildTemplatePayrollItems,
  buildTaxPayrollItems,
  buildBankPayrollItems,
  bankPayrollNetAdjust,
  getActiveBankPayrollColumns,
  calcTemplateItemAmount,
};
