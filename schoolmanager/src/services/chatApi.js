import apiClient, { apiOrigin } from './apiClient';

export async function getChatSchools() {
  const res = await apiClient.get('/chat/schools');
  return res?.data?.data || [];
}

export async function getSchoolStaff(schoolId, query = '') {
  const res = await apiClient.get('/chat/staff', { params: { school_id: schoolId, q: query } });
  return res?.data?.data || [];
}

export async function getChatThreads(schoolId) {
  const res = await apiClient.get('/chat/threads', { params: { school_id: schoolId } });
  return res?.data?.data || [];
}

export async function openDirectThread(schoolId, participantUserId) {
  const res = await apiClient.post('/chat/threads', { school_id: schoolId, participant_user_id: participantUserId });
  return res?.data?.data || null;
}

export async function getThreadMessages(schoolId, threadId, limit = 120) {
  const res = await apiClient.get(`/chat/threads/${threadId}/messages`, { params: { school_id: schoolId, limit } });
  return res?.data?.data || [];
}

export async function sendThreadMessage(schoolId, threadId, body) {
  const res = await apiClient.post(`/chat/threads/${threadId}/messages`, { school_id: schoolId, body });
  return res?.data?.data || null;
}

export async function markThreadRead(schoolId, threadId) {
  await apiClient.post(`/chat/threads/${threadId}/read`, { school_id: schoolId });
}

export async function getSessionProfile() {
  const res = await apiClient.get('/session/me');
  return res?.data?.data || null;
}

export function resolveSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || apiOrigin;
}
