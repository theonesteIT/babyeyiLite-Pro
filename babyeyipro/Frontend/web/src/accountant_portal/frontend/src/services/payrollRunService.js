import api from './api';

export async function getPayrollRuns(params = {}) {
  const res = await api.get('/accountant/payroll/runs', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function getPayrollRun(id) {
  const res = await api.get(`/accountant/payroll/runs/${id}`);
  return res.data?.data || null;
}

export async function triggerPayrollRun(payload) {
  const res = await api.post('/accountant/payroll/runs/trigger', payload);
  return res.data || null;
}

export async function deletePayrollRun(id) {
  const runId = Number(id);
  if (!runId) throw new Error('Invalid payroll run id');
  const res = await api.delete(`/accountant/payroll/runs/${runId}`);
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to delete payroll run');
  return body;
}

export async function markPayrollRunPaid(id) {
  const res = await api.patch(`/accountant/payroll/runs/${id}/status`, { status: 'paid' });
  return res.data || null;
}

export function isPayrollRunDeletable(status) {
  return !isPayrollRunPaid(status);
}

export function isPayrollRunPaid(status) {
  return String(status || '').toLowerCase() === 'paid';
}

export function payrollRunStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'Paid';
  if (s === 'processing' || s === 'processed') return 'Processing';
  if (s === 'draft') return 'Draft';
  return status || 'Unknown';
}
