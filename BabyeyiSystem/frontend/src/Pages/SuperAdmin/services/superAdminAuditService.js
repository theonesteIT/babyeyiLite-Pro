import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api/superadmin/audit`;
const axCfg = { withCredentials: true };

function unwrap(res) {
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || 'Request failed');
  }
  return res.data;
}

export async function fetchAuditOverview() {
  const res = await axios.get(`${API}/overview`, axCfg);
  return unwrap(res);
}

export async function fetchAuditEvents(params = {}) {
  const res = await axios.get(`${API}/events`, { ...axCfg, params });
  return unwrap(res);
}

export async function fetchAuditSecurity() {
  const res = await axios.get(`${API}/security`, axCfg);
  return unwrap(res);
}

export async function fetchAuditLogins(params = {}) {
  const res = await axios.get(`${API}/logins`, { ...axCfg, params });
  return unwrap(res);
}

export async function fetchAuditFinancial() {
  const res = await axios.get(`${API}/financial`, axCfg);
  return unwrap(res);
}

export async function fetchAuditUsers(q = '') {
  const res = await axios.get(`${API}/users`, { ...axCfg, params: q ? { q } : {} });
  return unwrap(res);
}

export async function fetchAuditUserTimeline(userId) {
  const res = await axios.get(`${API}/users/${userId}/timeline`, axCfg);
  return unwrap(res);
}

export async function fetchAuditSchools() {
  const res = await axios.get(`${API}/schools`, axCfg);
  return unwrap(res);
}

export async function fetchAuditSuspicious() {
  const res = await axios.get(`${API}/suspicious`, axCfg);
  return unwrap(res);
}

export async function fetchAuditInvestigations() {
  const res = await axios.get(`${API}/investigations`, axCfg);
  return unwrap(res);
}

export async function fetchAuditSystem() {
  const res = await axios.get(`${API}/system`, axCfg);
  return unwrap(res);
}

export async function fetchAuditReports() {
  const res = await axios.get(`${API}/reports`, axCfg);
  return unwrap(res);
}

export async function fetchAuditTab(tab, search = '') {
  const q = search?.trim() || undefined;
  switch (tab) {
    case 'overview':
      return fetchAuditOverview();
    case 'live':
      return fetchAuditEvents({ tab: 'live', q, limit: 60 });
    case 'security':
      return fetchAuditSecurity();
    case 'financial':
      return fetchAuditFinancial();
    case 'users':
      return fetchAuditUsers(q);
    case 'schools':
      return fetchAuditSchools();
    case 'suspicious':
      return fetchAuditSuspicious();
    case 'reports':
      return fetchAuditReports();
    case 'investigations':
      return fetchAuditInvestigations();
    case 'system':
      return fetchAuditSystem();
    default:
      return fetchAuditOverview();
  }
}
