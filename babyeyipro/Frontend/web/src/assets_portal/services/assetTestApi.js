import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../utils/postLogoutLoginPath';

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
    const msg = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

function unwrap(res) {
  const body = res?.data;
  if (body?.success === false) throw new Error(body.message || 'Request failed');
  return body?.data ?? body;
}

const assetTestApi = {
  getStats: async () => unwrap(await api.get('/school/assets/test/stats')),

  getMeta: async () => unwrap(await api.get('/school/assets/test/meta')),

  getOpening: async (year, category, options = {}) => {
    const params = { year, category };
    if (options.entryMode === 'legacy' || options.firstTime === false) {
      params.entry_mode = 'legacy';
    } else {
      params.entry_mode = 'year_setup';
    }
    return unwrap(await api.get('/school/assets/test/opening', { params }));
  },

  listAssets: async (params = {}) => {
    const data = await unwrap(await api.get('/school/assets/test', { params }));
    if (data?.items) {
      return {
        items: data.items,
        total: data.total ?? data.items.length,
        page: data.page ?? 1,
        limit: data.limit ?? 30,
        totalPages: data.total_pages ?? 1,
      };
    }
    const items = Array.isArray(data) ? data : [];
    return { items, total: items.length, page: 1, limit: items.length || 30, totalPages: 1 };
  },

  createAsset: async (payload) => unwrap(await api.post('/school/assets/test', payload)),

  updateAsset: async (id, payload) => unwrap(await api.patch(`/school/assets/test/${id}`, payload)),

  deleteAsset: async (id) => unwrap(await api.delete(`/school/assets/test/${id}`)),

  bulkDelete: async (payload) => unwrap(await api.post('/school/assets/test/bulk-delete', payload)),

  getIdentifiers: async (registerYear) => unwrap(
    await api.get('/school/assets/test/identifiers', { params: { register_year: registerYear } })
  ),

  importAssets: async (rows, options = {}) => unwrap(
    await api.post('/school/assets/test/import', {
      rows,
      register_year: options.registerYear,
      entry_mode: options.entryMode,
      first_time: options.firstTime,
      skip_duplicates: options.skipDuplicates !== false,
      auto_generate_sku: options.autoGenerateSku !== false,
    }, { timeout: 300000 })
  ),

  recalcRegisterChain: async (registerYear, category) => unwrap(
    await api.post('/school/assets/test/recalc-chain', {
      register_year: registerYear,
      ...(category ? { category } : {}),
    })
  ),

  getAsset: async (id) => unwrap(await api.get(`/school/assets/${id}`)),

  getAssetPanel: async (id) => unwrap(await api.get(`/school/assets/${id}/panel`)),

  lookupScanAsset: async ({ id, code } = {}) => unwrap(
    await api.get('/school/assets/scan-lookup', {
      params: {
        ...(id != null && id !== '' ? { id } : {}),
        ...(code ? { code } : {}),
      },
    })
  ),

  updateAssetHealthStatus: async (id, assetHealthStatus) => unwrap(
    await api.patch(`/school/assets/${id}/health-status`, { asset_health_status: assetHealthStatus })
  ),
};

export default assetTestApi;
