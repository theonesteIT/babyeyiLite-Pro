import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';
const BABYEYI_LOGIN = import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.location.href = BABYEYI_LOGIN;
    }
    return Promise.reject(error);
  }
);

export const fetchMySchools = () => api.get('/representative/my-schools').then((r) => r.data);

/** Omit schoolId or pass undefined → aggregate all assigned schools. */
export const fetchRepresentativeSummary = (schoolId) =>
  api
    .get('/representative/summary', {
      params:
        schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Finance overview KPIs for `/finance` — scoped like summary */
export const fetchRepresentativeFinanceOverview = (schoolId) =>
  api
    .get('/representative/finance-overview', {
      params:
        schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Fees management — accountant student fees & collections (scoped like summary) */
export const fetchRepresentativeFeesManagement = (schoolId, opts = {}) =>
  api
    .get('/representative/fees-management', {
      params: {
        ...(schoolId != null && schoolId !== '' ? { school_id: schoolId } : {}),
        ...(opts.academic_year ? { academic_year: opts.academic_year } : {}),
        ...(opts.term ? { term: opts.term } : {}),
        ...(opts.class_name ? { class_name: opts.class_name } : {}),
      },
    })
    .then((r) => r.data);

/** Staff payroll — payroll_requests aggregated across assigned schools */
export const fetchRepresentativeStaffPayroll = (schoolId, opts = {}) =>
  api
    .get('/representative/staff-payroll', {
      params: {
        ...(schoolId != null && schoolId !== '' ? { school_id: schoolId } : {}),
        ...(opts.month ? { month: opts.month } : {}),
        ...(opts.term ? { term: opts.term } : {}),
        ...(opts.year ? { year: opts.year } : {}),
      },
    })
    .then((r) => r.data);

export default api;
