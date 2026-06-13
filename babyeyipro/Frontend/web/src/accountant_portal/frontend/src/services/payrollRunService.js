import api from './api';

function normalizePayrollRunId(id) {
  const raw = String(id ?? '').trim();
  if (!raw) return null;
  const n = raw.startsWith('RUN-') ? Number(raw.slice(4)) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function getPayrollRuns(params = {}) {
  const res = await api.get('/accountant/payroll/runs', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function getPayrollRun(id) {
  const runId = normalizePayrollRunId(id);
  if (runId == null) throw new Error('Invalid payroll run id');
  const res = await api.get(`/accountant/payroll/runs/${runId}`);
  if (res.data?.success === false) {
    throw new Error(res.data?.message || 'Failed to load payroll run');
  }
  return res.data?.data || null;
}

export async function triggerPayrollRun(payload) {
  const res = await api.post('/accountant/payroll/runs/trigger', payload);
  return res.data || null;
}

export async function deletePayrollRun(id) {
  const runId = normalizePayrollRunId(id);
  if (runId == null) throw new Error('Invalid payroll run id');
  const res = await api.delete(`/accountant/payroll/runs/${runId}`);
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to delete payroll run');
  return body;
}

export async function markPayrollRunPaid(id, payload = {}) {
  const runId = normalizePayrollRunId(id);
  if (runId == null) throw new Error('Invalid payroll run id');
  const res = await api.patch(`/accountant/payroll/runs/${runId}/status`, { status: 'paid', ...payload });
  const body = res.data || {};
  if (body.success === false) throw new Error(body.message || 'Failed to mark payroll as paid');
  return body;
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
