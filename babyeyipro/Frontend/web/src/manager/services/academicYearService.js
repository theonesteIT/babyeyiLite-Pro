import api from './api';

export async function fetchAcademicCalendarSettings() {
  const { data } = await api.get('/dos/academic-calendar-settings');
  if (!data?.success) throw new Error(data?.message || 'Failed to load academic settings');
  return data.data || {};
}

export async function saveCurrentAcademicCalendar(payload) {
  const { data } = await api.put('/dos/academic-calendar-settings', payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to save');
  return data.data;
}

export async function registerAcademicYear(payload) {
  const { data } = await api.post('/dos/academic-years', payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to register year');
  return data.data?.academic_years_registry || [];
}

export async function updateAcademicYear(year, payload) {
  const { data } = await api.put(`/dos/academic-years/${encodeURIComponent(year)}`, payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to update year');
  return data.data?.academic_years_registry || [];
}

export async function setCurrentAcademicYear(year) {
  const { data } = await api.patch(`/dos/academic-years/${encodeURIComponent(year)}/current`);
  if (!data?.success) throw new Error(data?.message || 'Failed to set current year');
  return data.data;
}
