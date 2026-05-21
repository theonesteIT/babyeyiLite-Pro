import dosApi from '../../../services/api';
import studentService from '../../../../manager/services/studentService';
import schoolService from '../../../../manager/services/schoolService';

export async function fetchSchoolClasses(schoolId) {
  if (!schoolId) return { classRows: [], classNameOptions: [] };
  const res = await schoolService.getGroups(schoolId);
  if (!res?.success) {
    throw new Error(res?.message || 'Failed to load classes');
  }
  const classRows = Array.isArray(res.data) ? res.data : [];
  const classNameOptions = Array.isArray(res.class_name_options) ? res.class_name_options : [];
  return { classRows, classNameOptions };
}

export async function fetchSchoolStudents(params = {}) {
  const res = await studentService.getStudents({
    paginate: false,
    limit: 5000,
    ...params,
  });
  if (!res?.success) {
    throw new Error(res?.message || 'Failed to load students');
  }
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchRegistryStats(params = {}) {
  const { data } = await dosApi.get('/students/registry-stats', { params });
  if (!data?.success) return null;
  return data;
}

export async function fetchProgressIndex(academicYear, term) {
  const { data } = await dosApi.get('/dos/progress/students', {
    params: {
      academic_year: academicYear,
      term,
      page: 1,
      limit: 5000,
    },
  });
  if (!data?.success) return {};
  const map = {};
  for (const row of data.data || []) {
    map[row.id] = row;
  }
  return map;
}

export async function fetchAcademicCalendarSettings() {
  const { data } = await dosApi.get('/dos/academic-calendar-settings');
  if (!data?.success) throw new Error(data?.message || 'Failed to load academic calendar');
  return data.data || {};
}

export async function fetchPromotionHistory(academicYear) {
  const params = { limit: 300 };
  if (academicYear) params.academic_year = academicYear;
  const { data } = await dosApi.get('/dos/promotion/history', { params });
  if (!data?.success) return [];
  return data.data || [];
}

export async function applyPromotion(payload) {
  const { data } = await dosApi.post('/dos/promotion/apply', payload);
  if (!data?.success) {
    throw new Error(data?.message || 'Promotion failed');
  }
  return data;
}

/** Discipline remaining + RFID gate morning/evening for promote-by-class review. */
export async function fetchClassReviewMetrics({ academicYear, term, className, studentIds = [] }) {
  const params = {
    academic_year: academicYear,
    term,
    class_name: className,
  };
  const ids = (studentIds || []).map((id) => Number(id)).filter((id) => id > 0);
  if (ids.length) params.student_ids = ids.join(',');
  const { data } = await dosApi.get('/dos/promotion/class-review-metrics', { params });
  if (!data?.success) throw new Error(data?.message || 'Failed to load review metrics');
  return { byStudentId: data.data?.by_student_id || {}, meta: data.meta || {} };
}
