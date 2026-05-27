import api from './api';

const disciplineService = {
  // Settings
  getSettings: () => api.get('/discipline/settings'),
  updateDefaultMarks: (payload) => api.put('/discipline/settings/default-marks', payload),

  // Student operations
  getStudentsRoster: (params = {}) => api.get('/discipline/students-roster', { params }),
  searchStudents: (query, page = 1, limit = 15) => api.get('/discipline/students', { params: { query, page, limit } }),
  getStudentLogs: (studentId) => api.get(`/discipline/students/${studentId}/logs`),
  applyStudentMarks: (studentId, payload) => api.post(`/discipline/students/${studentId}/marks`, payload),
  undoLastAction: (studentId) => api.post(`/discipline/students/${studentId}/undo-last-action`),
};

export default disciplineService;
