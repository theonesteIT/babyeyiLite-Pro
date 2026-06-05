/** Normalize API assignment row for UI modals and tables */
export function normalizeAssignment(row) {
  if (!row) return null
  return {
    ...row,
    assignedTo: row.assignedTo || row.assignee_name || '—',
    assetCode: row.assetCode || row.asset_code || '',
    expectedReturn: row.expectedReturn || row.expected_return_date || null,
    date: row.date || row.assignment_date || '—',
    asset: row.asset || row.asset_name || 'Asset',
    asset_id: row.asset_id,
  }
}

export function formatAssignmentDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}
