/** Stable key for a school-fee row in public pay (handles duplicate numeric ids e.g. babyeyi_id 0). */
export function feeSelectionKey(feeOrId) {
  if (feeOrId != null && typeof feeOrId === 'object') {
    if (feeOrId.selection_key) return String(feeOrId.selection_key);
    return feeSelectionKey(feeOrId.id);
  }
  if (feeOrId == null || feeOrId === '') return null;
  const s = String(feeOrId);
  if (s.startsWith('pasreq:') || s.startsWith('paspay:') || s.startsWith('pay:')) return s;
  const n = Number(feeOrId);
  return Number.isFinite(n) ? n : s;
}

/** @deprecated use feeSelectionKey — kept for payments.jsx imports */
export function normFeeId(id) {
  return feeSelectionKey(id);
}

export function feeCategoryLabel(fee) {
  if (!fee) return 'School fees';
  if (fee.fee_category) return String(fee.fee_category);
  const name = String(fee.name || fee.requirement_name || '').toLowerCase();
  if (/uniform|sport wear|sweater/.test(name)) return 'Uniform fees';
  if (/activity|sport|club/.test(name)) return 'Activity fees';
  if (/transport|bus/.test(name)) return 'Transport fees';
  if (/tuition|school fee/.test(name)) return 'School fees';
  if (fee.pay_source === 'requirement_paid_at_school') return 'Requirements (school counter)';
  return 'School fees';
}
