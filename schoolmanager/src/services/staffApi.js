import apiClient from './apiClient';

export async function listStaff() {
  const res = await apiClient.get('/school/staff');
  return res?.data?.data || [];
}

export async function createStaff(payload) {
  const res = await apiClient.post('/school/staff', payload);
  return res?.data;
}

export async function updateStaff(userId, payload) {
  const res = await apiClient.patch(`/school/staff/${userId}`, payload);
  return res?.data;
}

export async function deleteStaff(userId) {
  const res = await apiClient.delete(`/school/staff/${userId}`);
  return res?.data;
}

export async function setStaffActive(userId, isActive) {
  const res = await apiClient.patch(`/school/staff/${userId}`, { is_active: !!isActive });
  return res?.data;
}

export async function uploadStaffPhoto(userId, photoBase64, mimeType = 'image/jpeg') {
  const res = await apiClient.post(`/school/staff/${userId}/photo`, { photoBase64, mimeType });
  return res?.data;
}
