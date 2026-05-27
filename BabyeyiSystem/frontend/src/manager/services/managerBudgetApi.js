import api from './api';

function extract(err, fallback = 'Request failed') {
  return err?.response?.data?.message || err?.message || fallback;
}

export async function fetchManagerBudgetOverview() {
  const res = await api.get('/accountant/school-budgets/manager-overview');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load overview');
  return res.data.data;
}

export async function fetchManagerBudgets(params = {}) {
  const res = await api.get('/accountant/school-budgets', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budgets');
  return res.data.data || [];
}

export async function fetchManagerBudget(id) {
  const res = await api.get(`/accountant/school-budgets/${id}`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget');
  return res.data.data;
}

export async function reviewManagerBudget(id, payload) {
  try {
    const res = await api.patch(`/accountant/school-budgets/${id}/review`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Review failed');
    return res.data;
  } catch (err) {
    throw new Error(extract(err, 'Review failed'));
  }
}

export async function fetchManagerBudgetLines(params = {}) {
  const res = await api.get('/accountant/budget-lines', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget lines');
  return res.data.data || [];
}

export async function freezeManagerBudgetLine(id, frozen = true) {
  try {
    const res = await api.patch(`/accountant/budget-lines/${id}/freeze`, { freeze: frozen });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update line');
    return res.data;
  } catch (err) {
    throw new Error(extract(err, 'Failed to update line'));
  }
}

export async function fetchManagerBudgetUsage(params = {}) {
  const res = await api.get('/accountant/budget-line-usage', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load usage');
  return res.data.data || [];
}

export async function fetchBudgetAuditLogs(params = {}) {
  const res = await api.get('/admin/portal-audit-logs', {
    params: { limit: 100, ...params },
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load audit logs');
  return res.data.data || res.data.logs || [];
}
