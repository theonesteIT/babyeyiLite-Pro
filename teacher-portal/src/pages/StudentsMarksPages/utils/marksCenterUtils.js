export function markColorClass(percent) {
  if (percent == null || !Number.isFinite(percent)) return 'text-[#000435]/35 bg-[#000435]/[0.03]';
  if (percent >= 90) return 'text-green-800 bg-green-50';
  if (percent >= 70) return 'text-blue-800 bg-blue-50';
  if (percent >= 50) return 'text-orange-800 bg-orange-50';
  return 'text-red-800 bg-red-50';
}

export function gradeBadgeClass(grade) {
  const map = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-orange-100 text-orange-800',
    D: 'bg-orange-50 text-orange-700',
    F: 'bg-red-100 text-red-800',
  };
  return map[grade] || 'bg-[#000435]/5 text-[#000435]/50';
}

export function buildFilterParams(filters, studentSearch, studentId) {
  const p = {};
  if (filters.academicYear) p.academic_year = filters.academicYear;
  if (filters.term) p.term = filters.term;
  if (filters.className) p.class_name = filters.className;
  if (filters.course) p.subject_name = filters.course;
  if (filters.assessmentType) p.column_slug = filters.assessmentType;
  if (filters.assessmentId) p.assessment_id = filters.assessmentId;
  if (studentSearch?.trim()) p.student_search = studentSearch.trim();
  if (studentId) p.student_id = studentId;
  return p;
}
