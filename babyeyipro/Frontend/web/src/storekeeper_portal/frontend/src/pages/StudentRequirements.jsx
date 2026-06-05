import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../components/StudentRequirementModal'
import {
  Plus, Search, CheckCircle, AlertTriangle, XCircle, Users, ClipboardList,
  BarChart3, Settings, ChevronRight, Filter, Percent, BookOpen,
  Loader2, RefreshCw, GraduationCap, User,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import { fetchStoreAcademicSettings } from '../services/academicSettingsService'
import {
  fetchRequirementClasses,
  fetchRequirementsBoard,
  saveRequirementItems,
  updateRequirementFulfillment,
  fetchRequirementCatalog,
} from '../services/studentRequirementsService'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'management', label: 'Management', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: BookOpen },
]

const colors = {
  complete: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-400', icon: CheckCircle },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-400', icon: AlertTriangle },
  missing: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-400', icon: XCircle },
}

function getStatus(submitted, required) {
  if (submitted >= required) return 'complete'
  if (submitted > 0) return 'partial'
  return 'missing'
}

function ProgressBar({ submitted, required }) {
  const pct = required > 0 ? Math.min((submitted / required) * 100, 100) : 0
  const status = getStatus(submitted, required)
  const c = colors[status]
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-14 text-right ${c.text}`}>{submitted}/{required}</span>
    </div>
  )
}

function StudentCell({ student, req, fulfillment, onClick }) {
  const key = `${student.id}-${req.id}`
  const f = fulfillment[key] || { submitted: 0, required: req.requiredQty }
  const status = getStatus(f.submitted, f.required)
  const c = colors[status]
  const pct = f.required > 0 ? Math.min((f.submitted / f.required) * 100, 100) : 0

  return (
    <div onClick={() => onClick(student, req, f)} className={`px-3 py-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${c.border} ${c.bg}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <c.icon size={14} className={c.text} />
          <span className={`text-xs font-medium ${c.text}`}>{f.submitted}/{f.required}</span>
        </div>
        <span className="text-[10px] text-gray-400">{Math.round(pct)}%</span>
      </div>
      <div className="mt-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function StudentRequirements() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [requirements, setRequirements] = useState([])
  const [fulfillment, setFulfillment] = useState({})
  const [catalog, setCatalog] = useState([])

  const [academicYear, setAcademicYear] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('all')

  const [loading, setLoading] = useState(false)
  const [classesLoading, setClassesLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [showFulfill, setShowFulfill] = useState(null)
  const [showAddReq, setShowAddReq] = useState(false)
  const [showStudentDrawer, setShowStudentDrawer] = useState(null)
  const [newReqName, setNewReqName] = useState('')
  const [newReqQty, setNewReqQty] = useState('')
  const [search, setSearch] = useState('')

  const loadClasses = useCallback(async (year) => {
    setClassesLoading(true)
    try {
      const cls = await fetchRequirementClasses(year || undefined)
      setClasses(cls)
    } catch {
      setClasses([])
    } finally {
      setClassesLoading(false)
    }
  }, [])

  const loadMeta = useCallback(async () => {
    const [acad, cat] = await Promise.all([
      fetchStoreAcademicSettings(),
      fetchRequirementCatalog().catch(() => []),
    ])
    setAcademic(acad)
    setCatalog(cat)
    const year = academicYear || acad.academicYear
    if (!academicYear) {
      setAcademicYear(acad.academicYear)
      setTerm(acad.currentTerm)
    }
    await loadClasses(year)
  }, [academicYear, loadClasses])

  const loadBoard = useCallback(async () => {
    if (!selectedClass) {
      setStudents([])
      setRequirements([])
      setFulfillment({})
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const board = await fetchRequirementsBoard({
        academicYear,
        term,
        className: selectedClass,
      })
      setStudents(board.students || [])
      setRequirements(board.requirements || [])
      setFulfillment(board.fulfillment || {})
    } catch (e) {
      setError(e.message || 'Failed to load requirements')
      setStudents([])
      setRequirements([])
      setFulfillment({})
    } finally {
      setLoading(false)
    }
  }, [academicYear, term, selectedClass])

  useEffect(() => {
    loadMeta().catch(() => {})
  }, [loadMeta])

  useEffect(() => {
    if (academicYear) loadClasses(academicYear)
  }, [academicYear, loadClasses])

  useEffect(() => {
    if (activeTab === 'management' && academicYear) loadClasses(academicYear)
  }, [activeTab, academicYear, loadClasses])

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  const filteredStudents = useMemo(() => {
    let list = students
    if (selectedStudentId !== 'all') {
      list = list.filter((s) => String(s.id) === String(selectedStudentId))
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          String(s.student_uid || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [students, selectedStudentId, search])

  const getFulfillment = (studentId, reqId, requiredQty) => {
    const key = `${studentId}-${reqId}`
    const f = fulfillment[key] || { submitted: 0 }
    return { submitted: Number(f.submitted) || 0, required: Number(f.required ?? requiredQty) || 0 }
  }

  const getStudentCompletion = (student) => {
    if (!requirements.length) return 0
    const ratios = requirements.map((r) => {
      const f = getFulfillment(student.id, r.id, r.requiredQty)
      return f.required > 0 ? f.submitted / f.required : 0
    })
    return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
  }

  const completed = students.filter((s) => getStudentCompletion(s) >= 100).length
  const totalStudents = students.length
  const pending = totalStudents - completed
  const completionRate = totalStudents > 0 ? Math.round((completed / totalStudents) * 100) : 0
  const outstanding = students.reduce((sum, s) => {
    return (
      sum +
      requirements.reduce((inner, r) => {
        const f = getFulfillment(s.id, r.id, r.requiredQty)
        return inner + Math.max(0, f.required - f.submitted)
      }, 0)
    )
  }, 0)

  const handleAddRequirement = async () => {
    if (!newReqName || !newReqQty || !selectedClass) return
    setSaving(true)
    setError('')
    try {
      const nextItems = [
        ...requirements.map((r) => ({
          name: r.name,
          required_qty: r.requiredQty,
          catalog_requirement_id: r.catalog_requirement_id,
        })),
        { name: newReqName.trim(), required_qty: Number(newReqQty) || 1 },
      ]
      const board = await saveRequirementItems({
        academicYear,
        term,
        className: selectedClass,
        items: nextItems,
      })
      setRequirements(board.requirements || [])
      setFulfillment(board.fulfillment || {})
      setStudents(board.students || students)
      setNewReqName('')
      setNewReqQty('')
      setShowAddReq(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFulfill = async (student, req, f, quantity) => {
    const submitted = Math.max(0, Math.min(Number(quantity) || 0, f.required))
    const key = `${student.id}-${req.id}`
    setFulfillment((prev) => ({ ...prev, [key]: { ...f, submitted } }))
    try {
      await updateRequirementFulfillment({
        academicYear,
        term,
        className: selectedClass,
        studentId: student.id,
        requirementItemId: req.id,
        submittedQty: submitted,
      })
    } catch (e) {
      setError(e.message)
      loadBoard()
    }
  }

  const handleBulkComplete = async (req) => {
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        students.map((s) =>
          updateRequirementFulfillment({
            academicYear,
            term,
            className: selectedClass,
            studentId: s.id,
            requirementItemId: req.id,
            submittedQty: req.requiredQty,
          })
        )
      )
      await loadBoard()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveList = async () => {
    if (!selectedClass || !requirements.length) {
      setShowCreate(false)
      return
    }
    setSaving(true)
    try {
      await saveRequirementItems({
        academicYear,
        term,
        className: selectedClass,
        items: requirements.map((r) => ({
          name: r.name,
          required_qty: r.requiredQty,
          catalog_requirement_id: r.catalog_requirement_id,
        })),
      })
      setShowCreate(false)
      await loadBoard()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const classCompletion = useMemo(() => {
    const byClass = new Map()
    for (const cls of classes) {
      const clsStudents = selectedClass === cls.class_name ? students : []
      if (!clsStudents.length && selectedClass !== cls.class_name) {
        byClass.set(cls.class_name, { total: cls.count, completed: 0, pct: 0 })
        continue
      }
      const done = clsStudents.filter((s) => getStudentCompletion(s) >= 100).length
      byClass.set(cls.class_name, {
        total: clsStudents.length || cls.count,
        completed: done,
        pct: clsStudents.length ? (done / clsStudents.length) * 100 : 0,
      })
    }
    return byClass
  }, [classes, students, selectedClass, requirements, fulfillment])

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
      <Filter size={14} className="text-amber-500 shrink-0" />
      <select
        value={academicYear}
        onChange={(e) => setAcademicYear(e.target.value)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[120px]"
      >
        {academic.academicYears.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[100px]"
      >
        {academic.activeTerms.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select
        value={selectedClass}
        onChange={(e) => {
          setSelectedClass(e.target.value)
          setSelectedStudentId('all')
        }}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[140px] font-medium text-[#000435]"
      >
        <option value="">Select class…</option>
        {classes.map((c) => (
          <option key={c.class_name} value={c.class_name}>
            {c.class_name} ({c.count})
          </option>
        ))}
      </select>
      <select
        value={selectedStudentId}
        onChange={(e) => setSelectedStudentId(e.target.value)}
        disabled={!selectedClass || !students.length}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[180px] disabled:opacity-50"
      >
        <option value="all">All students in class</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.student_uid} — {s.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={loadBoard}
        disabled={loading || !selectedClass}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-6">
      {renderFilters()}
      {!selectedClass ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          Select a class to view requirement completion.
        </div>
      ) : loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Requirements', value: requirements.length, icon: ClipboardList, color: 'bg-blue-50 text-blue-600' },
              { label: 'Students Completed', value: completed, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
              { label: 'Pending Students', value: pending, icon: Users, color: 'bg-amber-50 text-amber-600' },
              { label: 'Completion Rate', value: `${completionRate}%`, icon: Percent, color: 'bg-purple-50 text-purple-600' },
              { label: 'Outstanding Qty', value: outstanding, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{c.label}</p>
                    <p className="text-2xl font-light text-[#000435] mt-1">{c.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${c.color}`}><c.icon size={18} /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-medium text-[#000435] mb-4">Completion by Requirement</h3>
              <div className="space-y-4">
                {requirements.map((req) => {
                  const total = students.length * req.requiredQty
                  const submitted = students.reduce((s, stu) => s + getFulfillment(stu.id, req.id, req.requiredQty).submitted, 0)
                  const pct = total > 0 ? (submitted / total) * 100 : 0
                  return (
                    <div key={req.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{req.name}</span>
                        <span className="text-gray-400 text-xs">{submitted}/{total}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {!requirements.length && <p className="text-sm text-gray-400">No requirements defined for this class yet.</p>}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-medium text-[#000435] mb-4">Class Overview</h3>
              <div className="space-y-4">
                {selectedClass && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">{selectedClass}</span>
                      <span className="text-gray-400 text-xs">{completed}/{totalStudents}</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${completionRate >= 80 ? 'bg-green-400' : completionRate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${completionRate}%` }} />
                    </div>
                  </div>
                )}
                {classes.filter((c) => c.class_name !== selectedClass).slice(0, 4).map((cls) => {
                  const info = classCompletion.get(cls.class_name) || { total: cls.count, completed: 0, pct: 0 }
                  return (
                    <div key={cls.class_name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{cls.class_name}</span>
                        <span className="text-gray-400 text-xs">{cls.count} students</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300 rounded-full" style={{ width: `${info.pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderManagementHero = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
            <GraduationCap size={16} className="text-amber-500" />
            Select a class
          </h3>
          <p className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">
            {classes.length} class{classes.length === 1 ? '' : 'es'} · {academicYear} · {term}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[120px]"
          >
            {academic.academicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[100px]"
          >
            {academic.activeTerms.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadClasses(academicYear)}
            disabled={classesLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={classesLoading ? 'animate-spin' : ''} /> Refresh classes
          </button>
        </div>
      </div>

      {classesLoading ? (
        <div className="py-10 flex justify-center text-gray-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          No classes found for this academic year.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {classes.map((c) => {
            const active = selectedClass === c.class_name
            return (
              <button
                key={c.class_name}
                type="button"
                onClick={() => {
                  setSelectedClass(c.class_name)
                  setSelectedStudentId('all')
                }}
                className={`text-left rounded-xl border px-3 py-3 transition-all hover:shadow-md ${
                  active
                    ? 'border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-200'
                    : 'border-gray-100 bg-gray-50/50 hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                <p className={`text-sm font-bold truncate ${active ? 'text-amber-800' : 'text-[#000435]'}`}>
                  {c.class_name}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-wider">
                  {c.count} student{c.count === 1 ? '' : 's'}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {selectedClass && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <User size={14} className="text-gray-400" />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!students.length}
                className="bg-transparent border-none outline-none text-sm min-w-[160px] font-medium text-[#000435] disabled:opacity-50"
              >
                <option value="all">All students in {selectedClass}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_uid} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search student…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-32 lg:w-48"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#0a116b] transition"
          >
            <Plus size={14} /> Create requirement list
          </button>
        </div>
      )}
    </div>
  )

  const renderManagementTable = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-gray-50 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {selectedClass ? `${selectedClass} — student submissions` : 'Student submissions'}
        </p>
        {selectedClass && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
            {filteredStudents.length} of {students.length} students
          </span>
        )}
      </div>

      {!selectedClass ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Pick a class above to load students and track requirement submissions.
        </div>
      ) : loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : !filteredStudents.length ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No students found for this class.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase w-24">Code</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase">Student Name</th>
                {requirements.map((req) => (
                  <th key={req.id} className="text-center py-3 px-2 text-xs text-gray-400 font-medium uppercase min-w-[130px]">
                    <div className="flex items-center justify-center gap-1">
                      {req.name}
                      <button type="button" onClick={() => handleBulkComplete(req)} className="p-0.5 hover:bg-gray-200 rounded transition" title="Mark all complete">
                        <Settings size={11} className="text-gray-400" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="text-center py-3 px-3 text-xs text-gray-400 font-medium uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const comp = getStudentCompletion(student)
                return (
                  <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-400">{student.student_uid}</td>
                    <td className="py-2.5 px-4">
                      <button type="button" onClick={() => setShowStudentDrawer(student)} className="flex items-center gap-2 hover:text-amber-600 transition">
                        <div className="w-7 h-7 rounded-full bg-[#000435] text-white flex items-center justify-center text-xs font-medium">
                          {student.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium text-[#000435]">{student.name}</span>
                        <ChevronRight size={12} className="text-gray-300" />
                      </button>
                    </td>
                    {requirements.map((req) => (
                      <td key={req.id} className="py-2.5 px-2">
                        <StudentCell
                          student={student}
                          req={req}
                          fulfillment={fulfillment}
                          onClick={(s, r, f) => setShowFulfill({ student: s, req: r, fulfillment: f })}
                        />
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                        style={{
                          backgroundColor: comp >= 100 ? '#f0fdf4' : comp > 0 ? '#fffbeb' : '#fef2f2',
                          color: comp >= 100 ? '#16a34a' : comp > 0 ? '#d97706' : '#dc2626',
                          borderColor: comp >= 100 ? '#bbf7d0' : comp > 0 ? '#fde68a' : '#fecaca',
                        }}>
                        {comp}%
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderManagement = () => (
    <div className="space-y-4">
      {renderManagementHero()}
      {renderManagementTable()}
    </div>
  )

  const renderReports = () => (
    <div className="space-y-6">
      {renderFilters()}
      {!selectedClass || loading ? (
        <div className="py-16 flex justify-center text-gray-400 text-sm">
          {loading ? <Loader2 className="animate-spin" /> : 'Select a class to view reports.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-medium text-[#000435] mb-4">By Requirement</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 text-xs text-gray-400 font-medium uppercase">Requirement</th>
                    <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Required</th>
                    <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Submitted</th>
                    <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => {
                    const total = students.length * req.requiredQty
                    const submitted = students.reduce((s, stu) => s + getFulfillment(stu.id, req.id, req.requiredQty).submitted, 0)
                    return (
                      <tr key={req.id} className="border-b border-gray-50">
                        <td className="py-3 font-medium text-[#000435]">{req.name}</td>
                        <td className="py-3 text-right text-gray-600">{total}</td>
                        <td className="py-3 text-right text-green-600 font-medium">{submitted}</td>
                        <td className="py-3 text-right text-red-500 font-medium">{total - submitted}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-medium text-[#000435] mb-4">By Student</h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredStudents.map((s) => {
                  const comp = getStudentCompletion(s)
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-16">{s.student_uid}</span>
                      <span className="text-sm text-[#000435] w-36 truncate">{s.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${comp >= 100 ? 'bg-green-400' : comp > 0 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${comp}%` }} />
                      </div>
                      <span className={`text-xs font-medium w-10 text-right ${comp >= 100 ? 'text-green-600' : comp > 0 ? 'text-amber-600' : 'text-red-600'}`}>{comp}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <StorekeeperPageShell compact className="!px-0 sm:!px-0 lg:!px-0 !pt-0">
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-100/80 bg-re-bg shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#000435]/5 flex items-center justify-center shrink-0">
              <ClipboardList size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#000435] tracking-tight truncate">
                Student requirements
              </h1>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
                Track school supplies per class and student
              </p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-0.5 px-3 sm:px-6 pt-2 bg-re-bg border-b border-gray-100/80 sticky top-0 z-10 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-400/10 text-amber-700 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
          )}

          {activeTab === 'management' ? (
            renderManagement()
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'reports' && renderReports()}
            </div>
          )}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Requirement List" size="max-w-5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400">Academic Year</label>
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                {academic.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                {academic.activeTerms.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Class</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Select class…</option>
                {classes.map((c) => <option key={c.class_name} value={c.class_name}>{c.class_name} ({c.count})</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#000435]">Requirements Builder</p>
              <button type="button" onClick={() => setShowAddReq(true)} className="flex items-center gap-1.5 text-xs bg-[#000435] text-white px-3 py-1.5 rounded-lg">
                <Plus size={13} /> Add Requirement
              </button>
            </div>
            {catalog.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {catalog.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setNewReqName(c.name); setNewReqQty('1'); setShowAddReq(true) }}
                    className="text-[10px] px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-amber-50"
                  >
                    + {c.name}
                  </button>
                ))}
              </div>
            )}
            {requirements.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No requirements yet. Add items for {selectedClass || 'the selected class'}.</p>
            ) : (
              <ul className="space-y-2">
                {requirements.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                    <span className="font-medium text-[#000435]">{r.name}</span>
                    <span className="text-gray-500">{r.requiredQty} per student</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 rounded-lg">Cancel</button>
            <button type="button" onClick={handleSaveList} disabled={saving || !selectedClass} className="px-4 py-2 text-sm bg-amber-400 text-[#000435] rounded-lg font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Requirement List'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showFulfill} onClose={() => setShowFulfill(null)} title="Requirement Fulfillment" size="max-w-md">
        {showFulfill && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-gray-400">Student</span><span className="text-sm font-medium text-[#000435]">{showFulfill.student.name}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Requirement</span><span className="text-sm font-medium text-[#000435]">{showFulfill.req.name}</span></div>
              <div className="flex justify-between"><span className="text-xs text-gray-400">Required</span><span className="text-sm font-medium text-[#000435]">{showFulfill.fulfillment.required}</span></div>
            </div>
            <div>
              <label className="text-xs text-gray-400">Quantity Submitted</label>
              <input
                type="number"
                min={0}
                max={showFulfill.fulfillment.required}
                value={showFulfill.fulfillment.submitted}
                onChange={(e) => setShowFulfill({
                  ...showFulfill,
                  fulfillment: { ...showFulfill.fulfillment, submitted: parseInt(e.target.value, 10) || 0 },
                })}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <ProgressBar submitted={showFulfill.fulfillment.submitted} required={showFulfill.fulfillment.required} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowFulfill(null)} className="px-4 py-2 text-sm text-gray-500 rounded-lg">Close</button>
              <button
                type="button"
                onClick={async () => {
                  await handleFulfill(showFulfill.student, showFulfill.req, showFulfill.fulfillment, showFulfill.fulfillment.submitted)
                  setShowFulfill(null)
                }}
                className="px-4 py-2 text-sm bg-amber-400 text-[#000435] rounded-lg font-medium"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showAddReq} onClose={() => setShowAddReq(false)} title="Add Requirement" size="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400">Requirement Name</label>
            <input type="text" placeholder="e.g., Ream of Paper" value={newReqName} onChange={(e) => setNewReqName(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Required Quantity Per Student</label>
            <input type="number" placeholder="e.g., 2" value={newReqQty} onChange={(e) => setNewReqQty(e.target.value)} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddReq(false)} className="px-4 py-2 text-sm text-gray-500 rounded-lg">Cancel</button>
            <button type="button" onClick={handleAddRequirement} disabled={saving} className="px-4 py-2 text-sm bg-amber-400 text-[#000435] rounded-lg font-medium disabled:opacity-50">Add</button>
          </div>
        </div>
      </Modal>

      {showStudentDrawer && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowStudentDrawer(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#000435] text-white flex items-center justify-center text-lg font-medium">
                    {showStudentDrawer.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#000435]">{showStudentDrawer.name}</h3>
                    <p className="text-xs text-gray-400">{showStudentDrawer.student_uid} · {showStudentDrawer.class_name || selectedClass}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowStudentDrawer(null)} className="p-2 hover:bg-gray-100 rounded-lg">×</button>
              </div>
              <div className="text-center py-4">
                <p className="text-3xl font-light text-[#000435]">{getStudentCompletion(showStudentDrawer)}%</p>
                <p className="text-xs text-gray-400 mt-1">Overall completion</p>
              </div>
              <div className="space-y-3 mt-4">
                {requirements.map((req) => {
                  const f = getFulfillment(showStudentDrawer.id, req.id, req.requiredQty)
                  const status = getStatus(f.submitted, f.required)
                  const c = colors[status]
                  return (
                    <div key={req.id} className={`p-3 rounded-xl border ${c.border} ${c.bg}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[#000435]">{req.name}</span>
                        <c.icon size={16} className={c.text} />
                      </div>
                      <span className="text-xs text-gray-400">{f.submitted} / {f.required} submitted</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </StorekeeperPageShell>
  )
}
