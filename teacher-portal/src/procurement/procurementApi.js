import api, { API_BASE_URL } from '../services/api';

function unwrap(res) {
  if (!res.data?.success) throw new Error(res.data?.message || 'Request failed');
  return res.data.data;
}

export { API_BASE_URL };
export const API_BASE = API_BASE_URL;

export async function fetchProcurementStats() {
  return unwrap(await api.get('/procurement/stats'));
}

export async function fetchSchoolInfo() {
  return unwrap(await api.get('/procurement/school-info'));
}

export async function searchInventoryItems(q) {
  return unwrap(await api.get('/procurement/inventory-search', { params: { q } }));
}

export async function fetchPurchaseRequests(params = {}) {
  return unwrap(await api.get('/procurement/requests', { params }));
}

export async function fetchPurchaseRequest(id) {
  return unwrap(await api.get(`/procurement/requests/${id}`));
}

export async function createPurchaseRequest(payload) {
  return unwrap(await api.post('/procurement/requests', payload));
}

export async function updatePurchaseRequest(id, payload) {
  return unwrap(await api.patch(`/procurement/requests/${id}`, payload));
}

export async function submitPurchaseRequest(id) {
  return unwrap(await api.post(`/procurement/requests/${id}/submit`));
}

export default api;
