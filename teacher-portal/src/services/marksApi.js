import api from './api';

export async function fetchTeachingAssignments(params = {}) {
  const res = await api.get('/teacher-portal/teaching-assignments', { params });
  return res.data;
}

export async function fetchAssessmentTypes() {
  const res = await api.get('/teacher-portal/assessment-types');
  return res.data;
}

export async function fetchAssessmentContext(className, subjectName, columnSlug) {
  const res = await api.get('/teacher-portal/assessment-context', {
    params: { class_name: className, subject_name: subjectName, column_slug: columnSlug },
  });
  return res.data;
}

export async function fetchGradebookMatrix(className, subjectName) {
  const res = await api.get('/teacher-portal/gradebook-matrix', {
    params: { class_name: className, subject_name: subjectName },
  });
  return res.data;
}

export async function registerMarks(payload) {
  const res = await api.post('/teacher-portal/register-marks', payload);
  return res.data;
}

export async function fetchMarksCenter(params = {}) {
  const res = await api.get('/teacher-portal/marks-center', { params });
  return res.data;
}

export async function fetchMarksAnalytics(params = {}) {
  const res = await api.get('/teacher-portal/marks-analytics', { params });
  return res.data;
}

export async function patchMarkCell(payload) {
  const res = await api.patch('/teacher-portal/marks-cell', payload);
  return res.data;
}

export async function fetchCompetencyCategories() {
  const res = await api.get('/teacher-portal/competency-categories');
  return res.data;
}

export async function fetchCompetencyRatings(params) {
  const res = await api.get('/teacher-portal/competency-ratings', { params });
  return res.data;
}

export async function saveCompetencyRatings(payload) {
  const res = await api.post('/teacher-portal/competency-ratings', payload);
  return res.data;
}
