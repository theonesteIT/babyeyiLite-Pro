import api from './api';

export async function getTerminationAnalytics() {
  const res = await api.get('/accountant/termination-benefits/analytics');
  return res.data?.data || null;
}

export async function getSeveranceRates() {
  const res = await api.get('/accountant/termination-benefits/severance-rates');
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function saveSeveranceRates(rates) {
  const res = await api.put('/accountant/termination-benefits/severance-rates', { rates });
  return res.data?.data || [];
}

export async function searchTerminationStaff(params = {}) {
  const res = await api.get('/accountant/termination-benefits/staff/search', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function calculateTermination(payload) {
  const res = await api.post('/accountant/termination-benefits/calculate', payload);
  return res.data?.data || null;
}

export async function listTerminations(params = {}) {
  const res = await api.get('/accountant/termination-benefits', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function getTermination(id) {
  const res = await api.get(`/accountant/termination-benefits/${id}`);
  return res.data?.data || null;
}

export async function createTermination(payload) {
  const res = await api.post('/accountant/termination-benefits', payload);
  return res.data?.data || null;
}

export async function updateTermination(id, payload) {
  const res = await api.patch(`/accountant/termination-benefits/${id}`, payload);
  return res.data?.data || null;
}

export async function configureTerminationPayroll(id, payload) {
  const res = await api.post(`/accountant/termination-benefits/${id}/configure-payroll`, payload);
  return res.data?.data || null;
}

export async function listTerminationsForPayrollMonth(month, year) {
  const res = await api.get('/accountant/termination-benefits/for-payroll', { params: { month, year } });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function submitTermination(id) {
  const res = await api.post(`/accountant/termination-benefits/${id}/submit`);
  return res.data?.data || null;
}

export async function markTerminationPaid(id, payload) {
  const res = await api.post(`/accountant/termination-benefits/${id}/mark-paid`, payload);
  return res.data?.data || null;
}

/** Manager portal */
export async function listManagerTerminations(params = {}) {
  const res = await api.get('/manager/termination-benefits', { params });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function getManagerTermination(id) {
  const res = await api.get(`/manager/termination-benefits/${id}`);
  return res.data?.data || null;
}

export async function approveTermination(id, reviewNote = '') {
  const res = await api.post(`/manager/termination-benefits/${id}/approve`, { reviewNote });
  return res.data?.data || null;
}

export async function rejectTermination(id, reviewNote = '') {
  const res = await api.post(`/manager/termination-benefits/${id}/reject`, { reviewNote });
  return res.data?.data || null;
}
