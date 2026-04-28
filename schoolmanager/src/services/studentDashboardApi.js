import apiClient from './apiClient';

const now = new Date();
const currentAcademicYear = `${now.getFullYear()}-${now.getFullYear() + 1}`;
const currentTerm = 'Term 1';

const safe = async (promise) => {
  try {
    const response = await promise;
    return response?.data?.data;
  } catch {
    return null;
  }
};

export async function fetchDashboardData() {
  const [
    session,
    studentsRaw,
    teacherPortalStudents,
    gradebookFilters,
    attendanceOverview,
    feeReport,
    disciplineSummary,
    dosProgress,
  ] = await Promise.all([
    safe(apiClient.get('/session/me')),
    safe(apiClient.get('/students', { params: { paginate: 'false', limit: 500 } })),
    safe(apiClient.get('/teacher-portal/students')),
    safe(apiClient.get('/teacher-portal/gradebook-filters')),
    safe(apiClient.get('/dos/dashboard/stats')),
    safe(
      apiClient.get('/manager/finance/payments/report', {
        params: { academic_year: currentAcademicYear, term: currentTerm },
      })
    ),
    safe(
      apiClient.get('/discipline/students-summary', {
        params: { academic_year: currentAcademicYear, term: currentTerm },
      })
    ),
    safe(
      apiClient.get('/dos/progress/students', {
        params: { academic_year: currentAcademicYear, term: currentTerm, page: 1, limit: 500 },
      })
    ),
  ]);

  const students = Array.isArray(studentsRaw) ? studentsRaw : [];
  const portalStudents = Array.isArray(teacherPortalStudents) ? teacherPortalStudents : [];
  const filters = Array.isArray(gradebookFilters?.pairs) ? gradebookFilters.pairs : [];

  return {
    session,
    students,
    portalStudents,
    gradebookPairs: filters,
    attendanceOverview,
    feeReport,
    disciplineSummary: Array.isArray(disciplineSummary) ? disciplineSummary : [],
    dosProgress: Array.isArray(dosProgress) ? dosProgress : [],
    defaults: {
      academicYear: currentAcademicYear,
      term: currentTerm,
    },
  };
}

export async function fetchGradebookMatrix(className, subjectName) {
  if (!className || !subjectName) return null;
  try {
    const response = await apiClient.get('/teacher-portal/gradebook-matrix', {
      params: { class_name: className, subject_name: subjectName },
    });
    return response?.data?.data || null;
  } catch {
    return null;
  }
}

export async function fetchRecentPayments(limit = 5) {
  try {
    const response = await apiClient.get('/accountant/payments', { params: { limit } });
    return response?.data?.data || [];
  } catch {
    return [];
  }
}
