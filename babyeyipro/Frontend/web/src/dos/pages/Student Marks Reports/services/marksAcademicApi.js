import api from '../../../services/api';

export async function fetchClassesOverview() {
  const res = await api.get('/dos/marks-academic/classes');
  return res.data;
}

export async function fetchTeachingStaff() {
  const res = await api.get('/dos/teaching-staff');
  return res.data;
}

export async function assignClassTeacher(payload) {
  const res = await api.post('/dos/class-teachers', payload);
  return res.data;
}

export async function removeClassTeacher(id) {
  const res = await api.delete(`/dos/class-teachers/${id}`);
  return res.data;
}

export async function fetchSubjects(includeInactive = false) {
  const res = await api.get('/dos/subjects', {
    params: includeInactive ? { include_inactive: 1 } : {},
  });
  return res.data;
}

export async function createSubject(payload) {
  const res = await api.post('/dos/subjects', payload);
  return res.data;
}

export async function updateSubject(id, payload) {
  const res = await api.put(`/dos/subjects/${id}`, payload);
  return res.data;
}

export async function deactivateSubject(id) {
  const res = await api.patch(`/dos/subjects/${id}`, { is_active: false });
  return res.data;
}

export async function fetchAcademicCalendar() {
  const res = await api.get('/dos/academic-calendar-settings');
  return res.data;
}

export async function saveAcademicCalendar(payload) {
  const res = await api.put('/dos/academic-calendar-settings', payload);
  return res.data;
}

export async function registerAcademicYear(payload) {
  const res = await api.post('/dos/academic-years', payload);
  return res.data;
}

export async function setCurrentAcademicYear(year) {
  const res = await api.patch(`/dos/academic-years/${encodeURIComponent(year)}/current`);
  return res.data;
}

export async function fetchClassSubjects(className) {
  const res = await api.get('/dos/class-subjects', {
    params: className ? { class_name: className } : {},
  });
  return res.data;
}

export async function setClassSubjects(className, subjectIds) {
  const res = await api.put('/dos/class-subjects', { class_name: className, subject_ids: subjectIds });
  return res.data;
}

export async function fetchAssessmentTypes(schoolLevel = 'ALL') {
  const res = await api.get('/dos/assessment-types', { params: { school_level: schoolLevel } });
  return res.data;
}

export async function createAssessmentType(payload) {
  const res = await api.post('/dos/assessment-types', payload);
  return res.data;
}

export async function updateAssessmentType(id, payload) {
  const res = await api.put(`/dos/assessment-types/${id}`, payload);
  return res.data;
}

export async function reorderAssessmentTypes(items) {
  const res = await api.patch('/dos/assessment-types/reorder', { items });
  return res.data;
}

export async function deleteAssessmentType(id) {
  const res = await api.delete(`/dos/assessment-types/${id}`);
  return res.data;
}

export async function fetchAcademicYear() {
  const res = await api.get('/dos/academic-calendar-settings').catch(() => ({ data: {} }));
  return res.data?.data?.current_academic_year || res.data?.current_academic_year || '';
}

export async function fetchCompetencyCategories() {
  const res = await api.get('/dos/competency-categories');
  return res.data;
}

export async function createCompetencyCategory(payload) {
  const res = await api.post('/dos/competency-categories', payload);
  return res.data;
}

export async function updateCompetencyCategory(id, payload) {
  const res = await api.put(`/dos/competency-categories/${id}`, payload);
  return res.data;
}

export async function deleteCompetencyCategory(id) {
  const res = await api.delete(`/dos/competency-categories/${id}`);
  return res.data;
}

export async function fetchGradingSystem() {
  const res = await api.get('/dos/grading-system');
  return res.data;
}

export async function saveGradingSystem(bands) {
  const res = await api.put('/dos/grading-system', { bands });
  return res.data;
}

export async function fetchAcademicHealthWeights() {
  const res = await api.get('/dos/academic-health-weights');
  return res.data;
}

export async function saveAcademicHealthWeights(payload) {
  const res = await api.put('/dos/academic-health-weights', payload);
  return res.data;
}
