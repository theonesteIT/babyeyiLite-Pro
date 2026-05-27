import dosApi from '../../../services/api';
import studentService from '../../../../manager/services/studentService';
import schoolService from '../../../../manager/services/schoolService';
import { DEFAULT_TERMS, isAllYearTerm } from '../utils/promotionMappers';

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

const STATUS_PRIORITY = { repeated: 4, second_sitting: 4, dropped: 4, other: 3, promoted: 2 };

function mergeProgressStatus(current, incoming) {
  const a = STATUS_PRIORITY[String(current || '').toLowerCase()] || 1;
  const b = STATUS_PRIORITY[String(incoming || '').toLowerCase()] || 1;
  return b > a ? incoming : current;
}

/** Average marks & strictest status across all terms in the academic year. */
export async function fetchProgressIndexAllYear(academicYear, termsList = DEFAULT_TERMS) {
  const terms = (termsList || []).filter((t) => !isAllYearTerm(t));
  if (!terms.length) return fetchProgressIndex(academicYear, DEFAULT_TERMS[2]);

  const maps = await Promise.all(terms.map((t) => fetchProgressIndex(academicYear, t)));
  const merged = {};

  for (const map of maps) {
    for (const [id, row] of Object.entries(map)) {
      const sid = String(id);
      const marks = Number(row.marks_obtained);
      if (!merged[sid]) {
        merged[sid] = {
          ...row,
          _marksSum: Number.isFinite(marks) ? marks : 0,
          _marksN: Number.isFinite(marks) ? 1 : 0,
        };
        continue;
      }
      const prev = merged[sid];
      if (Number.isFinite(marks)) {
        prev._marksSum = (prev._marksSum || 0) + marks;
        prev._marksN = (prev._marksN || 0) + 1;
      }
      prev.status_code = mergeProgressStatus(prev.status_code, row.status_code);
      prev.status_label = prev.status_code === row.status_code ? row.status_label : prev.status_label;
    }
  }

  for (const sid of Object.keys(merged)) {
    const row = merged[sid];
    if (row._marksN > 0) {
      row.marks_obtained = Math.round(row._marksSum / row._marksN);
    }
    delete row._marksSum;
    delete row._marksN;
  }

  return merged;
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
export async function fetchCertificateBranding() {
  const { data } = await dosApi.get('/dos/promotion/certificate-branding');
  if (!data?.success) throw new Error(data?.message || 'Failed to load school certificate assets');
  return data.data || {};
}

export async function fetchPromotionSettings() {
  const { data } = await dosApi.get('/dos/promotion/settings');
  if (!data?.success) throw new Error(data?.message || 'Failed to load promotion settings');
  return data.data || {};
}

export async function savePromotionSettings(payload) {
  const { data } = await dosApi.put('/dos/promotion/settings', payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to save settings');
  return data.data || {};
}

export async function fetchPromotionSummary(academicYear) {
  const { data } = await dosApi.get('/dos/promotion/summary', {
    params: academicYear ? { academic_year: academicYear } : {},
  });
  if (!data?.success) throw new Error(data?.message || 'Failed to load summary');
  return data.data || {};
}

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
