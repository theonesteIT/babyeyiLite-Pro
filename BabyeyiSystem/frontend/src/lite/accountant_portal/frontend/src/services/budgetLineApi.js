import api from './api';

function extract(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export async function fetchBudgetLineOptions(budgetId) {
  const res = await api.get('/accountant/budget-lines/options', {
    params: budgetId ? { budget_id: budgetId } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load options');
  return res.data.data;
}

export async function fetchBudgetLines(params = {}) {
  const res = await api.get('/accountant/budget-lines', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget lines');
  return res.data.data || [];
}

export async function fetchBudgetLinesSummary(budgetId) {
  const res = await api.get('/accountant/budget-lines/summary', {
    params: budgetId ? { budget_id: budgetId } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load summary');
  return res.data.data;
}

export async function createBudgetLine(payload) {
  try {
    const res = await api.post('/accountant/budget-lines', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create budget line');
    return res.data;
  } catch (e) {
    throw new Error(extract(e, 'Failed to create budget line'));
  }
}

export async function updateBudgetLine(id, payload) {
  try {
    const res = await api.patch(`/accountant/budget-lines/${id}`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update budget line');
    return res.data;
  } catch (e) {
    throw new Error(extract(e, 'Failed to update budget line'));
  }
}

export async function registerBudgetLineUsage(payload) {
  try {
    const res = await api.post('/accountant/budget-line-usage', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to register usage');
    return res.data;
  } catch (e) {
    throw new Error(extract(e, 'Failed to register usage'));
  }
}

export async function fetchBudgetLineUsage(params = {}) {
  const res = await api.get('/accountant/budget-line-usage', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load usage history');
  return res.data.data || [];
}
