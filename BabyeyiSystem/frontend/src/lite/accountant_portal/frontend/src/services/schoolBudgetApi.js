import api from './api';

export function extractApiError(err, fallback = 'Request failed') {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export async function fetchSchoolBudgetOptions(academicYear) {
  const res = await api.get('/accountant/school-budgets/options', {
    params: academicYear ? { academic_year: academicYear } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget options');
  return res.data.data;
}

export async function fetchSchoolBudgets(params = {}) {
  const res = await api.get('/accountant/school-budgets', { params });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budgets');
  return res.data.data || [];
}

export async function fetchSchoolBudget(id) {
  const res = await api.get(`/accountant/school-budgets/${id}`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget');
  return res.data.data;
}

export async function fetchSchoolBudgetDashboard(budgetId) {
  const res = await api.get('/accountant/school-budgets/dashboard', {
    params: budgetId ? { budget_id: budgetId } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load budget dashboard');
  return res.data.data;
}

export async function createSchoolBudget(payload) {
  try {
    const res = await api.post('/accountant/school-budgets', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create budget');
    return res.data;
  } catch (err) {
    throw new Error(extractApiError(err, 'Failed to create budget'));
  }
}

export async function updateSchoolBudget(id, payload) {
  try {
    const res = await api.patch(`/accountant/school-budgets/${id}`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update budget');
    return res.data;
  } catch (err) {
    throw new Error(extractApiError(err, 'Failed to update budget'));
  }
}
