import api from './api'

export async function fetchRequirementClasses(academicYear) {
  const res = await api.get('/store/student-requirements/classes', {
    params: academicYear ? { academic_year: academicYear } : {},
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load classes')
  return res.data.data || []
}

export async function fetchRequirementStudents({ className, academicYear, q }) {
  const res = await api.get('/store/student-requirements/students', {
    params: {
      class_name: className,
      academic_year: academicYear || undefined,
      q: q || undefined,
    },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load students')
  return res.data.data || []
}

export async function fetchRequirementCatalog() {
  const res = await api.get('/store/student-requirements/catalog')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load catalog')
  return res.data.data || []
}

export async function fetchRequirementsBoard({ academicYear, term, className }) {
  const res = await api.get('/store/student-requirements/board', {
    params: {
      academic_year: academicYear || undefined,
      term: term || undefined,
      class_name: className || undefined,
    },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load requirements board')
  return res.data.data
}

export async function saveRequirementItems({ academicYear, term, className, items }) {
  const res = await api.put('/store/student-requirements/items', {
    academic_year: academicYear,
    term,
    class_name: className,
    items,
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save requirements')
  return res.data.data
}

export async function updateRequirementFulfillment({
  academicYear,
  term,
  className,
  studentId,
  requirementItemId,
  submittedQty,
}) {
  const res = await api.patch('/store/student-requirements/fulfillment', {
    academic_year: academicYear,
    term,
    class_name: className,
    student_id: studentId,
    requirement_item_id: requirementItemId,
    submitted_qty: submittedQty,
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update fulfillment')
  return res.data.data
}
