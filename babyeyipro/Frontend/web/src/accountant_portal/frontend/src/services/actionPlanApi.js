import api from './api';

function err(e, fallback) {
  return e?.response?.data?.message || e?.message || fallback;
}

export async function fetchActionPlanOptions() {
  const res = await api.get('/accountant/action-plans/options');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load options');
  return res.data.data;
}

export async function fetchActionPlanDashboard(planId) {
  const res = await api.get('/accountant/action-plans/dashboard', {
    params: planId ? { action_plan_id: planId } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load dashboard');
  return res.data.data;
}

export async function fetchActionPlans() {
  const res = await api.get('/accountant/action-plans');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load plans');
  return res.data.data || [];
}

export async function createActionPlan(payload) {
  try {
    const res = await api.post('/accountant/action-plans', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create plan');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to create plan'));
  }
}

export async function updateActionPlan(id, payload) {
  try {
    const res = await api.patch(`/accountant/action-plans/${id}`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update plan');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to update plan'));
  }
}

export async function createActionPlanActivity(payload) {
  try {
    const res = await api.post('/accountant/action-plan-activities', payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create activity');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to create activity'));
  }
}

export async function updateActionPlanActivity(id, payload) {
  try {
    const res = await api.patch(`/accountant/action-plan-activities/${id}`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update activity');
    return res.data.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to update activity'));
  }
}

export async function recordActivityExpense(activityId, payload) {
  try {
    const res = await api.post(`/accountant/action-plan-activities/${activityId}/expenses`, payload);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record expense');
    return res.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to record expense'));
  }
}

export async function fetchActivityExpenses(activityId) {
  const res = await api.get(`/accountant/action-plan-activities/${activityId}/expenses`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load expenses');
  return res.data.data || [];
}

export async function fetchActionPlanActivities(planId) {
  const res = await api.get('/accountant/action-plan-activities', {
    params: planId ? { action_plan_id: planId } : undefined,
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load activities');
  return res.data.data || [];
}

export async function deleteActionPlanActivity(id) {
  try {
    const res = await api.delete(`/accountant/action-plan-activities/${id}`);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete activity');
    return res.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to delete activity'));
  }
}

export async function deleteActionPlan(id) {
  try {
    const res = await api.delete(`/accountant/action-plans/${id}`);
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete plan');
    return res.data;
  } catch (e) {
    throw new Error(err(e, 'Failed to delete plan'));
  }
}

export async function fetchActionPlanNotifications(limit = 40) {
  const res = await api.get('/accountant/action-plans/notifications', { params: { limit } });
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load notifications');
  return { items: res.data.data || [], unread: Number(res.data.unread || 0) };
}

export async function markActionPlanNotificationRead(id) {
  const res = await api.patch(`/accountant/action-plans/notifications/${id}/read`);
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update notification');
  return res.data;
}

export async function markAllActionPlanNotificationsRead() {
  const res = await api.patch('/accountant/action-plans/notifications/read-all');
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update notifications');
  return res.data;
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
