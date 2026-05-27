import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api/superadmin/school-monitor`;
const axCfg = { withCredentials: true };

function unwrap(res) {
  if (!res?.data?.success) throw new Error(res?.data?.message || 'Request failed');
  return res.data;
}

export const fetchMonitorOverview = () => axios.get(`${API}/overview`, axCfg).then(unwrap);
export const fetchProvinces = () => axios.get(`${API}/filters/provinces`, axCfg).then(unwrap);
export const fetchDistricts = (province) =>
  axios.get(`${API}/filters/districts`, { ...axCfg, params: province ? { province } : {} }).then(unwrap);
export const fetchSectors = (district) =>
  axios.get(`${API}/filters/sectors`, { ...axCfg, params: { district } }).then(unwrap);
export const fetchHierarchySectors = (district) =>
  axios.get(`${API}/hierarchy/sectors`, { ...axCfg, params: { district } }).then(unwrap);
export const fetchHierarchySchools = (params) =>
  axios.get(`${API}/hierarchy/schools`, { ...axCfg, params }).then(unwrap);
export const fetchSchoolPanel = (schoolId) =>
  axios.get(`${API}/schools/${schoolId}`, axCfg).then(unwrap);
export const fetchSchoolUsers = (schoolId) =>
  axios.get(`${API}/schools/${schoolId}/users`, axCfg).then(unwrap);
export const fetchUserDetail = (userId) =>
  axios.get(`${API}/users/${userId}`, axCfg).then(unwrap);
export const postUserAction = (userId, action) =>
  axios.post(`${API}/users/${userId}/action`, { action }, axCfg).then(unwrap);
export const fetchLiveUsers = () => axios.get(`${API}/live-users`, axCfg).then(unwrap);
export const fetchSuspicious = () => axios.get(`${API}/suspicious`, axCfg).then(unwrap);
export const fetchAnalytics = () => axios.get(`${API}/analytics`, axCfg).then(unwrap);
export const fetchAlerts = () => axios.get(`${API}/alerts`, axCfg).then(unwrap);
export const fetchDisabledUsers = () => axios.get(`${API}/disabled-users`, axCfg).then(unwrap);
export const fetchMapData = () => axios.get(`${API}/map`, axCfg).then(unwrap);
