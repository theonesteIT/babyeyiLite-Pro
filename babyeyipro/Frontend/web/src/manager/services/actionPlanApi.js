import api from './api';

function err(e, fallback) {
  return e?.response?.data?.message || e?.message || fallback;
}

export async function fetchActionPlans() {
  const res = await api.get('/accountant/action-plans');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load plans');
  return res.data.data || [];
}

export async function fetchActionPlanOptions() {
  const res = await api.get('/accountant/action-plans/options');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load options');
  return res.data.data;
}

export async function reviewActionPlan(id, payload) {
  try {
    const res = await api.patch(`/accountant/action-plans/${id}/review`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to review plan');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to review plan'));
  }
}

export async function fetchActionPlanNotifications(limit = 40) {
  const res = await api.get('/accountant/action-plans/notifications', { params: { limit } });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load notifications');
  return { items: res.data.data || [], unread: Number(res.data.unread || 0) };
}
