import api from './api'

export const UNIFORM_PRESET_ITEMS = [
  'School Shirt',
  'School Trouser',
  'School Skirt',
  'School Tie',
  'School Sweater',
  'Sports Uniform',
  'Other',
]

export async function fetchUniformIssueClasses(academicYear) {
  const res = await api.get('/store/uniform-issues/classes', {
    params: academicYear ? { academic_year: academicYear } : {},
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load classes')
  return res.data.data || []
}

export async function fetchUniformClassStats(className, academicYear) {
  const res = await api.get('/store/uniform-issues/class-stats', {
    params: { class_name: className, academic_year: academicYear || undefined },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load class stats')
  return res.data.data
}

export async function fetchUniformIssueStudents({ className, academicYear, q, gender }) {
  const res = await api.get('/store/uniform-issues/students', {
    params: {
      class_name: className,
      academic_year: academicYear || undefined,
      q: q || undefined,
      gender: gender || undefined,
    },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load students')
  return res.data.data || []
}

export async function createUniformIssue(payload) {
  const res = await api.post('/store/uniform-issues', payload)
  if (!res.data?.success) {
    const err = new Error(res.data?.message || 'Failed to save issue')
    err.stockErrors = res.data?.stock_errors
    throw err
  }
  return res.data
}

export async function updateUniformIssue(id, payload) {
  const res = await api.patch(`/store/uniform-issues/${id}`, payload)
  if (!res.data?.success) {
    const err = new Error(res.data?.message || 'Failed to update issue')
    err.stockErrors = res.data?.stock_errors
    throw err
  }
  return res.data
}

export function findRecentIssueForClass(issues, { academicYear, term, className }) {
  const year = String(academicYear || '').trim()
  const termVal = String(term || '').trim()
  const cls = String(className || '').trim()
  if (!cls) return null
  return (
    (issues || []).find(
      (row) =>
        String(row.class_name || '').trim() === cls &&
        String(row.academic_year || '').trim() === year &&
        String(row.term || '').trim() === termVal
    ) || null
  )
}

export async function fetchUniformIssues(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.class_name) params.class_name = filters.class_name
  if (filters.student_q) params.student_q = filters.student_q
  const res = await api.get('/store/uniform-issues', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load issues')
  return res.data.data || []
}

export async function deleteUniformIssue(id) {
  const res = await api.delete(`/store/uniform-issues/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete issue')
  return res.data
}

export async function fetchUniformIssueDetail(id) {
  const res = await api.get(`/store/uniform-issues/${id}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load issue')
  return res.data.data
}

export async function fetchUniformIssueAnalytics(filters = {}) {
  const res = await api.get('/store/uniform-issues/analytics', { params: filters })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load analytics')
  return res.data.data
}

export async function fetchUniformIssueReportLines(filters = {}) {
  const params = {}
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.term) params.term = filters.term
  if (filters.class_name) params.class_name = filters.class_name
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  const res = await api.get('/store/uniform-issues/report-lines', { params })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load issue lines')
  return res.data.data || []
}

export async function fetchUniformProfitCalculation(filters = {}) {
  const res = await api.get('/store/uniform-issues/profit-calculation', { params: filters })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load profit calculation')
  return res.data.data
}

export async function fetchStudentUniformHistory(studentId) {
  const res = await api.get(`/store/uniform-issues/student-history/${studentId}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load history')
  return res.data.data || []
}

export function formatRwf(n) {
  return (Number(n) || 0).toLocaleString()
}
