import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../utils/postLogoutLoginPath';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response && error.response.status === 401) {
      redirectToBabyeyiLogin();
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

/** Financial analytics — revenue vs payroll, school rankings, ratios */
export const fetchRepresentativeFinancialAnalytics = (schoolId) =>
  api
    .get('/representative/financial-analytics', {
      params:
        schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Reports & export center — report catalog with real record counts */
export const fetchRepresentativeReports = (schoolId) =>
  api
    .get('/representative/reports', {
      params:
        schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Budget & expenses — quarterly plan, expense tracking, approvals, procurement */
export const fetchRepresentativeBudgetExpenses = (schoolId) =>
  api
    .get('/representative/budget-expenses', {
      params:
        schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Full expenses list across assigned schools */
export const fetchRepresentativeExpenses = (schoolId) =>
  api
    .get('/representative/expenses', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Approve or reject an expense — decision = 'approved' | 'rejected' */
export const patchRepresentativeExpenseDecision = (dbId, decision, note = '') =>
  api.patch(`/representative/expenses/${dbId}/decision`, { decision, note }).then((r) => r.data);

/** Full requisitions list across assigned schools */
export const fetchRepresentativeRequisitions = (schoolId) =>
  api
    .get('/representative/requisitions', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Approve or reject a requisition — decision = 'approved' | 'rejected' */
export const patchRepresentativeRequisitionDecision = (dbId, decision, note = '') =>
  api.patch(`/representative/requisitions/${dbId}/decision`, { decision, note }).then((r) => r.data);

/** Discipline overview — KPIs, class breakdown, school comparison, recent cases */
export const fetchRepresentativeDisciplineOverview = (schoolId) =>
  api
    .get('/representative/discipline/overview', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** All students with discipline marks for selected school */
export const fetchRepresentativeDisciplineStudents = (schoolId, opts = {}) =>
  api
    .get('/representative/discipline/students', {
      params: {
        ...(schoolId != null && schoolId !== '' ? { school_id: schoolId } : {}),
        ...(opts.class_name ? { class_name: opts.class_name } : {}),
        ...(opts.q ? { q: opts.q } : {}),
      },
    })
    .then((r) => r.data);

/** Store overview — KPIs, school breakdown */
export const fetchRepresentativeStoreOverview = (schoolId) =>
  api
    .get('/representative/store/overview', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Store inventory items for selected school(s) */
export const fetchRepresentativeStoreInventory = (schoolId) =>
  api
    .get('/representative/store/inventory', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Store suppliers for selected school(s) */
export const fetchRepresentativeStoreSuppliers = (schoolId) =>
  api
    .get('/representative/store/suppliers', {
      params: schoolId != null && schoolId !== '' ? { school_id: schoolId } : {},
    })
    .then((r) => r.data);

/** Store movements — stock in/out/returned/adjusted */
export const fetchRepresentativeStoreMovements = (schoolId, opts = {}) =>
  api
    .get('/representative/store/movements', {
      params: {
        ...(schoolId != null && schoolId !== '' ? { school_id: schoolId } : {}),
        ...(opts.type ? { type: opts.type } : {}),
      },
    })
    .then((r) => r.data);

export default api;
