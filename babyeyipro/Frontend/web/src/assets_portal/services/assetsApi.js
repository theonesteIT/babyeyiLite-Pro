import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../utils/postLogoutLoginPath';
import { computeTotalBalance, computeDepreciation } from '../utils/assetsCalculations';
import { categoryTypeToPayload } from '../utils/assetFormMapper';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) redirectToBabyeyiLogin();
    return Promise.reject(error);
  }
);

function unwrap(res) {
  const body = res?.data;
  if (body?.success === false) throw new Error(body.message || 'Request failed');
  return body?.data ?? body;
}

export function formToAssetPayload(form, { draft = false, registerYear } = {}) {
  const totalBalance = computeTotalBalance({
    unitPrice: form.unitPrice,
    openingAmount: form.openingAmount,
  });
  const dep = computeDepreciation({
    totalBalance,
    depRatePercent: form.depRate,
    accumulatedDepreciation: form.accumulatedDep,
  });

  const fundingSource = form.fundingSource === 'Other' && form.fundingOther
    ? `Other: ${form.fundingOther}`
    : form.fundingSource;

  const cat = categoryTypeToPayload(form);
  const material =
    form.material === 'OTHER' && form.materialOther?.trim()
      ? form.materialOther.trim()
      : form.material;

  return {
    asset_name: form.assetName,
    label_tag: form.labelTag,
    asset_type: cat.asset_type,
    type_other: cat.asset_type_other,
    asset_type_other: cat.asset_type_other,
    category: cat.category,
    description: form.description,
    location: form.location,
    supplier_name: form.supplier,
    upi: form.upi,
    sku: form.sku,
    serial_number: form.serialNumber,
    brand: form.brand,
    material,
    size_label: form.size,
    purchase_year: form.purchaseYear,
    purchase_month: form.purchaseMonth,
    purchase_day: form.purchaseDay,
    unit_price: form.unitPrice,
    opening_amount: form.openingAmount,
    total_balance: totalBalance,
    accumulated_depreciation: form.accumulatedDep,
    invoice_number: form.invoice,
    funding_source: form.fundingSource,
    funding_source_other: form.fundingSource === 'Other' ? form.fundingOther : null,
    fundingOther: form.fundingOther,
    dep_mode: form.depMode || 'Diminishing',
    dep_rate: form.depRate,
    dep_years: form.depYears || null,
    decimal_dep: dep.decimalDep,
    annual_dep: dep.annualDep,
    total_dep: dep.totalDep,
    net_book_value: dep.netBookValue,
    quantity: form.quantity,
    unit: form.unit,
    condition_code: form.condition,
    notes: form.notes,
    save_as_draft: draft,
    register_year: registerYear ?? form.registerYear ?? new Date().getFullYear(),
  };
}

const assetsApi = {
  getMeta: async () => unwrap(await api.get('/school/assets/meta')),
  getDashboard: async () => unwrap(await api.get('/school/assets/dashboard')),
  getAnalytics: async (params = {}) => unwrap(await api.get('/school/assets/analytics', { params })),
  listAssets: async (params = {}) => unwrap(await api.get('/school/assets', { params })),
  getAsset: async (id) => unwrap(await api.get(`/school/assets/${id}`)),
  getAssetPanel: async (id) => unwrap(await api.get(`/school/assets/${id}/panel`)),
  createAsset: async (payload) => unwrap(await api.post('/school/assets', payload)),
  getIdentifiers: async (params = {}) => unwrap(await api.get('/school/assets/identifiers', { params })),
  importAssets: async (rows, { skipDuplicates = true, registerYear } = {}) => {
    const res = await api.post('/school/assets/import', {
      rows,
      skip_duplicates: skipDuplicates,
      register_year: registerYear ?? new Date().getFullYear(),
    });
    const body = res?.data;
    if (body?.success === false) throw new Error(body.message || 'Import failed');
    return body?.data ?? body;
  },
  updateAsset: async (id, payload) => unwrap(await api.patch(`/school/assets/${id}`, payload)),
  deleteAsset: async (id) => unwrap(await api.delete(`/school/assets/${id}`)),

  listCategories: async () => unwrap(await api.get('/school/assets/categories')),
  createCategory: async (payload) => unwrap(await api.post('/school/assets/categories', payload)),
  updateCategory: async (id, payload) => unwrap(await api.patch(`/school/assets/categories/${id}`, payload)),
  deleteCategory: async (id) => unwrap(await api.delete(`/school/assets/categories/${id}`)),

  getAssignmentMeta: async () => unwrap(await api.get('/school/assets/assignments/meta')),
  listAssignments: async (params = {}) => unwrap(await api.get('/school/assets/assignments', { params })),
  createAssignment: async (payload) => {
    const res = await api.post('/school/assets/assignments', payload);
    const body = res?.data;
    if (body?.success === false) throw new Error(body.message || 'Assignment failed');
    return body;
  },
  getAssignment: async (id) => unwrap(await api.get(`/school/assets/assignments/${id}`)),
  returnAssignment: async (id, payload) => {
    const res = await api.patch(`/school/assets/assignments/${id}/return`, payload);
    const body = res?.data;
    if (body?.success === false) throw new Error(body.message || 'Return failed');
    return body;
  },
  listMaintenance: async () => unwrap(await api.get('/school/assets/maintenance')),
  createMaintenance: async (payload) => {
    const res = await api.post('/school/assets/maintenance', payload);
    const body = res?.data;
    if (body?.success === false) throw new Error(body.message || 'Maintenance request failed');
    return body;
  },

  getTransferMeta: async () => unwrap(await api.get('/school/assets/transfers/meta')),
  listTransfers: async () => unwrap(await api.get('/school/assets/transfers')),
  createTransfer: async (payload) => {
    const res = await api.post('/school/assets/transfers', payload);
    const body = res?.data;
    if (body?.success === false) throw new Error(body.message || 'Transfer failed');
    return body;
  },
};

export default assetsApi;
