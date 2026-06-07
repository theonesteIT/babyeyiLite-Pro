import axios from 'axios';

export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function unwrap(res) {
  if (!res.data?.success) throw new Error(res.data?.message || 'Request failed');
  return res.data.data;
}

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

export async function updateRequestDecision(id, payload) {
  return unwrap(await api.patch(`/procurement/requests/${id}/decision`, payload));
}

export async function fetchRequisitions(params = {}) {
  return unwrap(await api.get('/procurement/requisitions', { params }));
}

export async function fetchRequisition(id) {
  return unwrap(await api.get(`/procurement/requisitions/${id}`));
}

export async function createRequisition(payload) {
  return unwrap(await api.post('/procurement/requisitions', payload));
}

export async function updateRequisitionStatus(id, payload) {
  return unwrap(await api.patch(`/procurement/requisitions/${id}/status`, payload));
}

export async function fetchPurchaseOrders() {
  return unwrap(await api.get('/procurement/purchase-orders'));
}

export async function fetchPurchaseOrder(id) {
  return unwrap(await api.get(`/procurement/purchase-orders/${id}`));
}

export async function createPurchaseOrder(payload) {
  return unwrap(await api.post('/procurement/purchase-orders', payload));
}

export async function fetchSuppliers() {
  return unwrap(await api.get('/procurement/suppliers'));
}

export async function createSupplier(payload) {
  return unwrap(await api.post('/procurement/suppliers', payload));
}

export default api;
