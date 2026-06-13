import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchPublicStudentMarkReport(snapshotId) {
  const res = await publicApi.get(`/public/student-mark-reports/${snapshotId}`);
  return res.data;
}
