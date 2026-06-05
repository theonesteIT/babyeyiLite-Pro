import api from './api'

function inferCurrentTerm(activeTerms) {
  if (!activeTerms?.length) return 'Term 1'
  const m = new Date().getMonth()
  const n = activeTerms.length
  const pos = m >= 8 ? m - 8 : m + 4
  const idx = Math.min(Math.floor((pos / 12) * n), n - 1)
  return activeTerms[idx]
}

export async function fetchStoreAcademicSettings() {
  const res = await api.get('/store/academic-calendar-settings')
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load academic settings')
  const d = res.data.data || {}
  const activeTerms = d.active_terms?.length ? d.active_terms : ['Term 1', 'Term 2', 'Term 3']
  const academicYears = d.academic_years?.length
    ? d.academic_years
    : d.academic_years_registry?.map((r) => r.academic_year).filter(Boolean) || [d.current_academic_year].filter(Boolean)

  return {
    academicYear: d.current_academic_year || academicYears[0] || '',
    currentTerm: d.current_term || inferCurrentTerm(activeTerms),
    activeTerms,
    academicYears,
    registry: d.academic_years_registry || [],
  }
}
