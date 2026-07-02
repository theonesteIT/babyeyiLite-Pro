import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'
import {
  Shirt, Users, ChevronRight, ChevronLeft, Search, CheckSquare, Square,
  Plus, AlertCircle, Loader2, X, Eye, QrCode, Calendar,
  Package, DollarSign, BadgeCheck, List, Pencil, Trash2,
  Filter, GraduationCap, Sparkles,
} from 'lucide-react'
import {
  ModalField,
  modalInputClass,
  UniformModalHeader,
  UniformModalFooter,
  UniformModalBackdrop,
} from './uniformModalUi'
import { useMasterAuth } from '../../../../../context/MasterAuthContext'
import { fetchStoreAcademicSettings } from '../../services/academicSettingsService'
import { fetchFinishedGoods } from '../../services/finishedGoodsService'
import UniformSlotGrid, {
  buildSlotPayload,
  computeStockUsage,
  createDefaultSlotColumns,
  hasAnyConfiguredSlot,
  slotStateFromIssueDetail,
  mergeStudentsForIssueEdit,
} from './UniformSlotGrid'
import {
  fetchUniformIssueClasses,
  fetchUniformClassStats,
  fetchUniformIssueStudents,
  createUniformIssue,
  updateUniformIssue,
  deleteUniformIssue,
  fetchUniformIssues,
  fetchUniformIssueDetail,
  findRecentIssueForClass,
  formatRwf,
} from '../../services/uniformIssueService'
import {
  exportUniformIssuesListExcel,
  exportUniformIssueDetailExcel,
  exportUniformIssueDetailPdf,
} from '../../utils/uniformIssuesListExport'
import { buildIssueSlotMatrix, slotColumnHeaderLabel, formatMatrixQty, formatMatrixAmount } from '../../utils/uniformIssueSlotGroups'
import StoreExportBar from '../StoreExportBar'
import SlotGroupedDistribution from './SlotGroupedDistribution'
import {
  UniformKpiCard,
  UniformKpiGrid,
  UniformSection,
  UniformTable,
  UniformTableRow,
  UniformTableCell,
} from './UniformInventoryUi'

const STEPS = [
  { id: 1, label: 'Academic info' },
  { id: 2, label: 'Students' },
  { id: 3, label: 'Distribution' },
]

function formatAmount(n) {
  return (Number(n) || 0).toLocaleString()
}

export default function UniformIssuePanel() {
  const { user } = useMasterAuth()
  const [view, setView] = useState('list')
  const [step, setStep] = useState(1)
  const [academic, setAcademic] = useState({ academicYears: [], activeTerms: [], academicYear: '', currentTerm: '' })
  const [classes, setClasses] = useState([])
  const [classStats, setClassStats] = useState(null)
  const [students, setStudents] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [issues, setIssues] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successIssue, setSuccessIssue] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [slotColumns, setSlotColumns] = useState(() => createDefaultSlotColumns(4))
  const [slotMatrix, setSlotMatrix] = useState({})
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [editingIssueId, setEditingIssueId] = useState(null)
  const [editingIssueNo, setEditingIssueNo] = useState('')
  const [loadedStockCredit, setLoadedStockCredit] = useState(() => new Map())
  const [loadingPriorIssue, setLoadingPriorIssue] = useState(false)
  const [manualEditIssueId, setManualEditIssueId] = useState(null)
  const [editIssueDetail, setEditIssueDetail] = useState(null)

  const [listFilterYear, setListFilterYear] = useState('')
  const [listFilterClass, setListFilterClass] = useState('')
  const [listFilterStudent, setListFilterStudent] = useState('')
  const [listAcademicYears, setListAcademicYears] = useState([])
  const [listClasses, setListClasses] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [exportingDetail, setExportingDetail] = useState(false)
  const [detailStudentFilter, setDetailStudentFilter] = useState('')

  const [academicYear, setAcademicYear] = useState('')
  const [term, setTerm] = useState('')
  const [className, setClassName] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [residencyFilter, setResidencyFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const issuedByName = user?.full_name || user?.name || user?.email || 'Stock Manager'

  const loadIssues = useCallback(async () => {
    setListLoading(true)
    try {
      const rows = await fetchUniformIssues({
        academic_year: listFilterYear || undefined,
        class_name: listFilterClass || undefined,
        student_q: listFilterStudent.trim() || undefined,
      })
      setIssues(rows)
    } catch {
      setIssues([])
    } finally {
      setListLoading(false)
    }
  }, [listFilterYear, listFilterClass, listFilterStudent])

  const initListFilters = useCallback(async () => {
    try {
      const acad = await fetchStoreAcademicSettings()
      setListAcademicYears(acad.academicYears || [])
      setListFilterYear((prev) => prev || acad.academicYear || '')
    } catch {
      setListAcademicYears([])
    }
  }, [])

  const initWizard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [acad, goods] = await Promise.all([fetchStoreAcademicSettings(), fetchFinishedGoods()])
      setAcademic(acad)
      setFinishedGoods(goods)
      setAcademicYear(acad.academicYear)
      setTerm(acad.currentTerm)
      const cls = await fetchUniformIssueClasses(acad.academicYear)
      setClasses(cls)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'list') initListFilters()
  }, [view, initListFilters])

  useEffect(() => {
    if (view !== 'list') return undefined
    const t = setTimeout(() => loadIssues(), 280)
    return () => clearTimeout(t)
  }, [view, loadIssues])

  useEffect(() => {
    if (view !== 'list') return
    if (!listFilterYear) {
      setListClasses([])
      return
    }
    fetchUniformIssueClasses(listFilterYear).then(setListClasses).catch(() => setListClasses([]))
  }, [view, listFilterYear])

  useEffect(() => {
    if (view === 'wizard') initWizard()
  }, [view, initWizard])

  useEffect(() => {
    if (!academicYear) return
    fetchUniformIssueClasses(academicYear).then(setClasses).catch(() => {})
  }, [academicYear])

  useEffect(() => {
    if (!className) {
      setClassStats(null)
      return
    }
    fetchUniformClassStats(className, academicYear).then(setClassStats).catch(() => setClassStats(null))
  }, [className, academicYear])

  const reloadFinishedGoods = useCallback(async () => {
    try {
      const goods = await fetchFinishedGoods()
      setFinishedGoods(goods)
    } catch {
      /* keep previous */
    }
  }, [])

  useEffect(() => {
    if (step === 3) reloadFinishedGoods()
  }, [step, reloadFinishedGoods])

  useEffect(() => {
    setEditingIssueId(null)
    setEditingIssueNo('')
    setLoadedStockCredit(new Map())
    if (step < 3) {
      setSlotMatrix({})
      setSlotColumns(createDefaultSlotColumns(4))
    }
  }, [academicYear, term, className, step])

  useEffect(() => {
    if (step !== 3 || !className || !academicYear || !term) return undefined
    if (manualEditIssueId) return undefined
    let cancelled = false
    setLoadingPriorIssue(true)
    ;(async () => {
      try {
        const rows = await fetchUniformIssues()
        const recent = findRecentIssueForClass(rows, { academicYear, term, className })
        if (cancelled) return
        if (!recent) {
          setEditingIssueId(null)
          setEditingIssueNo('')
          setLoadedStockCredit(new Map())
          setLoadingPriorIssue(false)
          return
        }
        const detail = await fetchUniformIssueDetail(recent.id)
        if (cancelled) return
        const hydrated = slotStateFromIssueDetail(detail)
        setEditingIssueId(detail.id)
        setEditingIssueNo(detail.issue_no || '')
        setLoadedStockCredit(hydrated.stockCredit)
        if (hydrated.slotColumns.length) setSlotColumns(hydrated.slotColumns)
        setSlotMatrix(hydrated.slotMatrix)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          hydrated.studentIds.forEach((id) => next.add(id))
          return next
        })
      } catch {
        if (!cancelled) {
          setEditingIssueId(null)
          setEditingIssueNo('')
          setLoadedStockCredit(new Map())
        }
      } finally {
        if (!cancelled) setLoadingPriorIssue(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [step, className, academicYear, term, manualEditIssueId])

  const listSummary = useMemo(() => {
    const count = issues.length
    const students = issues.reduce((s, r) => s + (Number(r.students_count) || 0), 0)
    const amount = issues.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    return { count, students, amount }
  }, [issues])

  const clearListFilters = () => {
    setListFilterYear('')
    setListFilterClass('')
    setListFilterStudent('')
  }

  const startNewIssue = () => {
    setManualEditIssueId(null)
    setEditingIssueId(null)
    setEditingIssueNo('')
    setLoadedStockCredit(new Map())
    setError('')
    setView('wizard')
    setStep(1)
  }

  const closeEditModal = () => {
    setManualEditIssueId(null)
    setEditingIssueId(null)
    setEditingIssueNo('')
    setLoadedStockCredit(new Map())
    setEditIssueDetail(null)
    setView('list')
    setError('')
  }

  const startEditIssue = async (row) => {
    setError('')
    setView('editModal')
    setLoading(true)
    try {
      const [acad, goods, detail] = await Promise.all([
        fetchStoreAcademicSettings(),
        fetchFinishedGoods(),
        fetchUniformIssueDetail(row.id),
      ])
      setAcademic(acad)
      setFinishedGoods(goods)
      const year = detail.academic_year || row.academic_year || ''
      const termVal = detail.term || row.term || ''
      const cls = detail.class_name || row.class_name || ''
      setAcademicYear(year)
      setTerm(termVal)
      setClassName(cls)
      const classList = await fetchUniformIssueClasses(year)
      setClasses(classList)
      let rosterRows = []
      try {
        rosterRows = await fetchUniformIssueStudents({ className: cls, academicYear: year })
      } catch {
        try {
          rosterRows = await fetchUniformIssueStudents({ className: cls })
        } catch {
          rosterRows = []
        }
      }
      const merged = mergeStudentsForIssueEdit(detail, rosterRows)
      setStudents(merged.students)
      setStudentsLoaded(true)
      setEditIssueDetail(detail)
      const hydrated = slotStateFromIssueDetail(detail)
      setManualEditIssueId(detail.id)
      setEditingIssueId(detail.id)
      setEditingIssueNo(detail.issue_no || '')
      setLoadedStockCredit(hydrated.stockCredit)
      if (hydrated.slotColumns.length) setSlotColumns(hydrated.slotColumns)
      setSlotMatrix(hydrated.slotMatrix)
      setSelectedIds(new Set(merged.selectedIds.length ? merged.selectedIds : hydrated.studentIds))
    } catch (e) {
      setError(e.message)
      setView('list')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIssue = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await deleteUniformIssue(deleteTarget.id)
      setDeleteTarget(null)
      await loadIssues()
      await reloadFinishedGoods()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleExportList = () => {
    exportUniformIssuesListExcel(issues, {
      academic_year: listFilterYear,
      class_name: listFilterClass,
      student_q: listFilterStudent.trim(),
    }).catch(() => {})
  }

  const handleExportDetailExcel = async (issueDetail) => {
    if (!issueDetail) return
    setExportingDetail(true)
    try {
      await exportUniformIssueDetailExcel(issueDetail)
    } finally {
      setExportingDetail(false)
    }
  }

  const handleExportDetailPdf = async (issueDetail) => {
    if (!issueDetail) return
    setExportingDetail(true)
    try {
      await exportUniformIssueDetailPdf(issueDetail)
    } finally {
      setExportingDetail(false)
    }
  }

  useEffect(() => {
    if (step !== 2 || !className) return
    setLoading(true)
    fetchUniformIssueStudents({
      className,
      academicYear,
      q: studentSearch,
      gender: genderFilter,
    })
      .then((rows) => {
        let list = rows
        if (residencyFilter && residencyFilter !== 'ALL') {
          list = list.filter((s) => (s.residency_status || 'DAY') === residencyFilter)
        }
        setStudents(list)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [step, className, academicYear, studentSearch, genderFilter, residencyFilter])

  const selectedStudents = useMemo(() => {
    const picked = students.filter((s) => selectedIds.has(s.id))
    if (picked.length) return picked
    if (view === 'editModal' && students.length) return students
    return picked
  }, [students, selectedIds, view])

  const selectedCount = selectedIds.size

  const stockUsage = useMemo(
    () => computeStockUsage(selectedStudents, slotMatrix, slotColumns),
    [selectedStudents, slotMatrix, slotColumns]
  )

  const stockOk = useMemo(() => {
    for (const [fgId, needed] of stockUsage.entries()) {
      const fg = finishedGoods.find((g) => g.id === fgId)
      if (!fg) continue
      const credit = loadedStockCredit.get(fgId) || 0
      const available = Number(fg.stock) + credit
      if (available < needed) return false
    }
    return true
  }, [stockUsage, finishedGoods, loadedStockCredit])

  const canSave = useMemo(() => {
    if (!selectedCount) return false
    if (!hasAnyConfiguredSlot(selectedStudents, slotMatrix, slotColumns)) return false
    return stockOk
  }, [selectedCount, selectedStudents, slotMatrix, slotColumns, stockOk])

  const toggleAllStudents = () => {
    if (selectedIds.size === students.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(students.map((s) => s.id)))
  }

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const loadStudentsForClass = async () => {
    if (!className) return
    setLoading(true)
    setError('')
    try {
      const rows = await fetchUniformIssueStudents({ className, academicYear })
      setStudents(rows)
      setSelectedIds(new Set(rows.map((s) => s.id)))
      setStudentsLoaded(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const payloadStudents = buildSlotPayload(selectedStudents, slotMatrix, slotColumns)
      const payload = {
        academic_year: academicYear,
        term,
        class_name: className,
        post_billing: true,
        issued_by_name: issuedByName,
        students: payloadStudents,
      }
      const result = editingIssueId
        ? await updateUniformIssue(editingIssueId, payload)
        : await createUniformIssue(payload)
      setSuccessIssue(result)
      const qr = await QRCode.toDataURL(result.issue_no || editingIssueNo, { width: 160, margin: 1 })
      setQrDataUrl(qr)
      await loadIssues()
      await reloadFinishedGoods()
      if (view === 'editModal') closeEditModal()
      else {
        setView('list')
        setStep(1)
      }
      setSelectedIds(new Set())
      setSlotMatrix({})
      setStudentsLoaded(false)
      setEditingIssueId(null)
      setEditingIssueNo('')
      setLoadedStockCredit(new Map())
      setManualEditIssueId(null)
    } catch (e) {
      setError(e.message || 'Save failed')
      if (e.stockErrors) setError(`${e.message} — check stock levels.`)
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (id) => {
    setLoading(true)
    setDetailStudentFilter('')
    try {
      const d = await fetchUniformIssueDetail(id)
      setDetail(d)
      setView('detail')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const qtyPerStudentForLine = (line) => {
    let q = Number(line.qty_per_student) || 0
    if (q <= 0 && detail?.students_count) {
      q = Number(line.total_qty || 0) / Number(detail.students_count)
    }
    return Number.isInteger(q) ? String(q) : q.toFixed(2)
  }

  const printDistributionSheet = () => {
    const w = window.open('', '_blank')
    if (!w || !detail) return
    const { columns, students, grandTotalQty, grandTotalAmount } = buildIssueSlotMatrix(detail)
    const items = detail.lines || []

    const slotHead1 = columns.map((c) => `<th colspan="2">${escapeHtml(slotColumnHeaderLabel(c))}</th>`).join('')
    const slotHead2 = columns.map(() => '<th>Qty</th><th>Amount</th>').join('')
    const summaryRows = items
      .map(
        (l) =>
          `<tr><td><strong>${escapeHtml(l.item_name)}</strong></td><td style="text-align:center">${qtyPerStudentForLine(l)}</td><td style="text-align:center">${Number(l.total_qty) || 0}</td><td style="text-align:right">${formatRwf(l.unit_price)}</td><td style="text-align:right;font-weight:700">${formatRwf(l.line_total)}</td></tr>`
      )
      .join('')

    const body = students
      .map((st) => {
        const slotCells = columns
          .map((col) => {
            const cell = st.cells[col.key]
            const qty = cell ? Number(cell.qty) || 0 : 0
            const amt = cell ? Number(cell.amount) || 0 : 0
            return `<td style="text-align:right">${formatMatrixQty(qty)}</td><td style="text-align:right">${formatMatrixAmount(amt)}</td>`
          })
          .join('')
        return `<tr><td>${escapeHtml(st.code)}</td><td>${escapeHtml(st.name)}</td>${slotCells}<td style="text-align:right;font-weight:600;color:#b45309">${formatMatrixQty(st.rowTotalQty)}</td><td style="text-align:right;font-weight:700">${formatMatrixAmount(st.rowTotalAmount)}</td></tr>`
      })
      .join('')

    const colTotals = columns
      .map((col) => `<td style="text-align:right;font-weight:700;color:#b45309">${formatMatrixQty(col.totalQty)}</td><td style="text-align:right;font-weight:700">${formatMatrixAmount(col.totalAmount)}</td>`)
      .join('')

    w.document.write(`
      <html><head><title>Distribution ${escapeHtml(detail.issue_no)}</title>
      <style>
        body{font-family:Montserrat,sans-serif;padding:24px;color:#000435}
        h2{margin:0 0 4px} p.sub{color:#64748b;font-size:12px;margin:0 0 20px}
        table{border-collapse:collapse;width:100%;margin-bottom:24px;font-size:11px}
        th,td{border:1px solid #e2e8f0;padding:7px 10px}
        th{background:#000435;color:#FEBF10;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
        tr:nth-child(even) td{background:#f8fafc}
        .totals td{background:#fffbeb;font-weight:700}
      </style>
      </head><body>
      <h2>Uniform Distribution — ${escapeHtml(detail.issue_no)}</h2>
      <p class="sub">${escapeHtml(detail.class_name)} · ${escapeHtml(detail.academic_year)} · ${escapeHtml(detail.term)} · ${detail.students_count || students.length} students</p>
      <h3 style="font-size:13px;margin:0 0 8px">Summary</h3>
      <table><thead><tr><th>Item</th><th>Qty / student</th><th>Total qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${summaryRows}</tbody></table>
      <h3 style="font-size:13px;margin:0 0 8px">Student distribution</h3>
      <table>
        <thead>
          <tr><th rowspan="2">Code</th><th rowspan="2">Student name</th>${slotHead1}<th colspan="2">Row total</th></tr>
          <tr>${slotHead2}<th>Qty</th><th>Amount</th></tr>
        </thead>
        <tbody>${body}
          <tr class="totals"><td colspan="2">Column totals</td>${colTotals}<td style="text-align:right;color:#b45309">${formatMatrixQty(grandTotalQty)}</td><td style="text-align:right">${formatMatrixAmount(grandTotalAmount)}</td></tr>
        </tbody>
      </table>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  if (view === 'detail' && detail) {
    const studentsCount = Number(detail.students_count) || (detail.students || []).length || 0
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setView('list'); setDetail(null); setDetailStudentFilter('') }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider hover:text-amber-700 transition"
        >
          ← Back to issues
        </button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] text-white shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#FEBF10]/10 rounded-full blur-3xl" />
          <div className="relative px-5 py-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]/90">Uniform issue</p>
              <h2 className="text-xl font-bold mt-1">{detail.issue_no}</h2>
              <p className="text-xs text-white/70 mt-1.5">
                Class {detail.class_name} · {detail.academic_year} · {detail.term}
              </p>
              <p className="text-[11px] text-white/50 mt-1">Issued by {detail.issued_by_name || '—'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => startEditIssue({ id: detail.id, issue_no: detail.issue_no, academic_year: detail.academic_year, term: detail.term, class_name: detail.class_name })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/15 transition"
              >
                <Pencil size={14} /> Edit
              </button>
              <StoreExportBar
                variant="hero"
                loading={exportingDetail}
                disabled={exportingDetail}
                onExportExcel={() => handleExportDetailExcel(detail)}
                onExportPdf={() => handleExportDetailPdf(detail)}
                onPrint={printDistributionSheet}
              />
            </div>
          </div>
        </div>

        <UniformKpiGrid cols="sm:grid-cols-2 lg:grid-cols-4">
          <UniformKpiCard label="Students" value={studentsCount} icon={Users} accent="blue" />
          <UniformKpiCard label="Items" value={(detail.lines || []).length} icon={Package} accent="amber" />
          <UniformKpiCard label="Total pieces" value={Number(detail.total_pieces) || 0} icon={Shirt} accent="purple" />
          <UniformKpiCard label="Total amount" value={formatRwf(detail.total_amount)} icon={DollarSign} accent="green" />
        </UniformKpiGrid>

        <UniformSection title="Distribution summary" subtitle="Items issued to this class" icon={Package} bodyClassName="p-0">
          <UniformTable
            headers={['Item', 'Qty / student', 'Total qty', 'Unit price', 'Line total']}
            minWidth="560px"
            className="border-0 shadow-none rounded-none"
          >
            {(detail.lines || []).map((l, i) => (
              <UniformTableRow key={l.id} index={i}>
                <UniformTableCell className="font-bold text-[#000435]">{l.item_name}</UniformTableCell>
                <UniformTableCell>{qtyPerStudentForLine(l)}</UniformTableCell>
                <UniformTableCell>{l.total_qty}</UniformTableCell>
                <UniformTableCell>{formatRwf(l.unit_price)}</UniformTableCell>
                <UniformTableCell className="font-bold text-[#000435]">{formatRwf(l.line_total)}</UniformTableCell>
              </UniformTableRow>
            ))}
            <UniformTableRow className="bg-amber-50/40">
              <td colSpan={4} className="py-3 px-4 text-xs font-bold text-[#000435] uppercase text-[10px] tracking-wider">
                Issue total
              </td>
              <td className="py-3 px-4 text-xs text-right font-bold text-amber-700">{formatRwf(detail.total_amount)}</td>
            </UniformTableRow>
          </UniformTable>
        </UniformSection>

        {(detail.students || []).some((s) => s.slots?.length) && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Search size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Find student</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="search"
                      value={detailStudentFilter}
                      onChange={(e) => setDetailStudentFilter(e.target.value)}
                      placeholder="Search by student name or code…"
                      className="flex-1 text-sm outline-none bg-transparent text-[#000435] placeholder:text-gray-400 min-w-0"
                    />
                    {detailStudentFilter && (
                      <button
                        type="button"
                        onClick={() => setDetailStudentFilter('')}
                        className="text-gray-300 hover:text-gray-500 shrink-0 p-1"
                        title="Clear filter"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {detailStudentFilter.trim() && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                  Filtering student list
                </span>
              )}
            </div>
            <SlotGroupedDistribution
              key={detail.id}
              detail={detail}
              studentFilter={detailStudentFilter}
              onStudentFilterChange={setDetailStudentFilter}
            />
          </>
        )}
      </div>
    )
  }

  if (view === 'editModal') {
    return (
      <AnimatePresence>
        <UniformModalBackdrop onClose={closeEditModal} className="z-[65]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          className="fixed inset-0 z-[65] flex items-center justify-center p-2 sm:p-5 pointer-events-none"
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[min(100%,1180px)] max-h-[94vh] flex flex-col pointer-events-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <UniformModalHeader
              eyebrow="Edit distribution"
              title={editingIssueNo || 'Uniform issue'}
              subtitle={`${className || '—'} · ${academicYear || '—'} · ${term || '—'}`}
              badge={`${selectedCount} students · tap a cell or Apply all to edit slots`}
              icon={Pencil}
              onClose={closeEditModal}
            />
            {!loading && editIssueDetail && selectedStudents.length > 0 && (
              <div className="px-5 sm:px-6 pb-2 flex justify-end shrink-0">
                <StoreExportBar
                  loading={exportingDetail}
                  disabled={exportingDetail}
                  onExportExcel={() => handleExportDetailExcel(editIssueDetail)}
                  onExportPdf={() => handleExportDetailPdf(editIssueDetail)}
                />
              </div>
            )}
            {error && (
              <div className="mx-4 sm:mx-5 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm shrink-0">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="animate-spin" size={32} />
                  <p className="text-sm font-medium">Loading distribution…</p>
                </div>
              ) : selectedStudents.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">No students on this issue.</p>
              ) : (
                <UniformSlotGrid
                  students={selectedStudents}
                  finishedGoods={finishedGoods}
                  slotColumns={slotColumns}
                  onSlotColumnsChange={setSlotColumns}
                  slotMatrix={slotMatrix}
                  onSlotMatrixChange={setSlotMatrix}
                  stockUsage={stockUsage}
                  stockCredit={loadedStockCredit}
                  exportMeta={{ class_name: className, academic_year: academicYear, term, issue_no: editingIssueNo }}
                />
              )}
              {!stockOk && !loading && (
                <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                  <p className="font-bold">Insufficient stock — adjust quantities before updating.</p>
                </div>
              )}
            </div>
            <UniformModalFooter
              onCancel={closeEditModal}
              onPrimary={handleSave}
              primaryLabel="Update distribution"
              primaryDisabled={!canSave}
              primaryLoading={saving}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (view === 'wizard') {
    const wizardTitle = editingIssueId ? 'Continue distribution' : 'New uniform issue'
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] text-white shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEBF10]/15 rounded-full blur-3xl" />
          <div className="relative px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]/90 flex items-center gap-1">
                <Sparkles size={10} /> {wizardTitle}
              </p>
              <p className="text-sm font-bold mt-0.5">
                Step {step} of 3 — {STEPS.find((s) => s.id === step)?.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setManualEditIssueId(null)
                setEditingIssueId(null)
                setView('list')
              }}
              className="text-[10px] font-bold uppercase px-3 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
          <div className="relative px-5 pb-4 flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  step >= s.id ? 'bg-[#FEBF10]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" /> Academic information
              </h3>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <section className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Class & term</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ModalField icon={GraduationCap} label="Academic year">
                    <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={modalInputClass}>
                      {academic.academicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField icon={Calendar} label="Term">
                    <select value={term} onChange={(e) => setTerm(e.target.value)} className={modalInputClass}>
                      {academic.activeTerms.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </ModalField>
                  <ModalField icon={Users} label="Class">
                    <select value={className} onChange={(e) => setClassName(e.target.value)} className={modalInputClass}>
                      <option value="">Select class</option>
                      {classes.map((c) => (
                        <option key={c.class_name} value={c.class_name}>{c.class_name} ({c.count})</option>
                      ))}
                    </select>
                  </ModalField>
                </div>
              </section>
              {classStats && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Total', value: classStats.total },
                    { label: 'Male', value: classStats.male },
                    { label: 'Female', value: classStats.female },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100/80 p-3 text-center">
                      <p className="text-[9px] font-bold uppercase text-gray-400">{c.label}</p>
                      <p className="text-xl font-bold text-[#000435] mt-1">{c.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={!className || loading}
                  onClick={loadStudentsForClass}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-amber-200 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold uppercase disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Load students
                </button>
                <button
                  type="button"
                  disabled={!className}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#000435] text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50 shadow-lg"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
              {studentsLoaded && (
                <p className="text-xs text-emerald-700 font-medium">{students.length} students loaded — {selectedIds.size} selected</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-sm font-bold text-[#000435] flex items-center gap-2">
                <Users size={16} className="text-amber-500" /> Student selection
              </h3>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 flex-1 min-w-[200px] bg-gray-50/80 focus-within:ring-2 focus-within:ring-amber-400/20">
                  <Search size={14} className="text-gray-300" />
                  <input
                    placeholder="Search student…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                </div>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className={modalInputClass + ' w-auto min-w-[120px]'}>
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select value={residencyFilter} onChange={(e) => setResidencyFilter(e.target.value)} className={modalInputClass + ' w-auto min-w-[140px]'}>
                  <option value="">Boarding / Day — All</option>
                  <option value="BOARDING">Boarding</option>
                  <option value="DAY">Day scholar</option>
                </select>
                <button type="button" onClick={toggleAllStudents} className="text-xs font-bold uppercase text-amber-800 px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-xl">
                  {selectedIds.size === students.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              {loading ? (
                <div className="py-12 flex justify-center text-gray-400"><Loader2 className="animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {students.map((s) => {
                    const on = selectedIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-left transition ${
                          on ? 'border-amber-400 bg-amber-50/60 shadow-sm' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        {on ? <CheckSquare size={16} className="text-amber-600 shrink-0" /> : <Square size={16} className="text-gray-300 shrink-0" />}
                        <span className="text-xs font-bold text-[#000435] truncate">
                          {s.student_uid} {s.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3 font-medium">{selectedCount} selected</p>
              <div className="flex justify-between pt-4 border-t border-gray-50 mt-4">
                <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  disabled={!selectedCount}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#000435] text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50 shadow-lg"
                >
                  Configure slots <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {loadingPriorIssue && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                <Loader2 size={16} className="animate-spin shrink-0" />
                Loading saved distribution for this class…
              </div>
            )}
            {editingIssueId && !loadingPriorIssue && (
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-amber-900 text-sm">
                <p className="font-medium">
                  Updating <span className="font-bold">{editingIssueNo}</span> — use Apply all or tap a cell to configure slots (same modal as edit).
                </p>
              </div>
            )}
            {selectedStudents.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center rounded-2xl border border-dashed">Select students in step 2 first.</p>
            ) : (
              <UniformSlotGrid
                students={selectedStudents}
                finishedGoods={finishedGoods}
                slotColumns={slotColumns}
                onSlotColumnsChange={setSlotColumns}
                slotMatrix={slotMatrix}
                onSlotMatrixChange={setSlotMatrix}
                stockUsage={stockUsage}
                stockCredit={loadedStockCredit}
                exportMeta={{ class_name: className, academic_year: academicYear, term }}
              />
            )}
            {!stockOk && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-700">
                <p className="font-bold">Insufficient stock for one or more linked finished goods. Adjust quantities or stock before saving.</p>
              </div>
            )}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-wrap justify-between items-center gap-3 shadow-sm">
              <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
                <ChevronLeft size={14} /> Back
              </button>
              <button
                type="button"
                disabled={!canSave || saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#000435] text-white rounded-xl text-xs font-bold uppercase disabled:opacity-45 shadow-lg shadow-[#000435]/20"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                {editingIssueId ? 'Update distribution' : 'Save distribution'}
              </button>
            </div>
            <p className="text-[10px] text-amber-700 flex items-center gap-1 px-1">
              <DollarSign size={12} /> Charges post to student accounts when you save the full distribution.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#000435]/5 flex items-center justify-center shrink-0">
            <Shirt size={18} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#000435] tracking-tight">Uniform distribution</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md">
              Issue uniforms to a class — stock OUT and parent billing charges
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startNewIssue}
          className="inline-flex items-center gap-2 bg-[#000435] text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg hover:bg-[#0a116b] transition"
        >
          <Plus size={14} /> New issue
        </button>
      </div>
      <UniformKpiGrid cols="sm:grid-cols-3">
        <UniformKpiCard label="Issues" value={listSummary.count} icon={List} accent="blue" />
        <UniformKpiCard label="Students" value={listSummary.students.toLocaleString()} icon={Users} accent="amber" />
        <UniformKpiCard label="Total value" value={formatAmount(listSummary.amount)} icon={DollarSign} accent="green" />
      </UniformKpiGrid>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <Search size={15} className="text-gray-300 shrink-0" />
          <input
            type="search"
            value={listFilterStudent}
            onChange={(e) => setListFilterStudent(e.target.value)}
            placeholder="Filter issues by student name or code…"
            className="flex-1 text-sm outline-none bg-transparent text-[#000435] placeholder:text-gray-400 min-w-0"
          />
          {listFilterStudent && (
            <button
              type="button"
              onClick={() => setListFilterStudent('')}
              className="text-gray-300 hover:text-gray-500 shrink-0"
              title="Clear student filter"
            >
              <X size={15} />
            </button>
          )}
        </div>
        {listFilterStudent.trim() && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
            Student filter active
          </span>
        )}
      </div>

      {error && view === 'list' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <UniformSection
        title="Filters & export"
        icon={Filter}
        action={
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="text-[10px] font-bold uppercase text-gray-400 hover:text-[#000435] transition"
          >
            {filtersOpen ? 'Hide' : 'Show'}
          </button>
        }
        bodyClassName="p-0"
      >
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 flex items-center gap-1 mb-1">
                      <GraduationCap size={12} /> Academic year
                    </label>
                    <select
                      value={listFilterYear}
                      onChange={(e) => {
                        setListFilterYear(e.target.value)
                        setListFilterClass('')
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 focus:ring-2 focus:ring-amber-200/60 focus:border-amber-300 outline-none"
                    >
                      <option value="">All years</option>
                      {listAcademicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Class</label>
                    <select
                      value={listFilterClass}
                      onChange={(e) => setListFilterClass(e.target.value)}
                      disabled={!listFilterYear && listClasses.length === 0}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50/50 focus:ring-2 focus:ring-amber-200/60 focus:border-amber-300 outline-none disabled:opacity-50"
                    >
                      <option value="">All classes</option>
                      {listClasses.map((c) => (
                        <option key={c.class_name} value={c.class_name}>{c.class_name}</option>
                      ))}
                      {[...new Set(issues.map((i) => i.class_name).filter(Boolean))].filter(
                        (cn) => !listClasses.some((c) => c.class_name === cn)
                      ).map((cn) => (
                        <option key={cn} value={cn}>{cn}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Student</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 focus-within:ring-2 focus-within:ring-amber-200/60 focus-within:border-amber-300">
                      <Search size={14} className="text-gray-300 shrink-0" />
                      <input
                        placeholder="Name or student code…"
                        value={listFilterStudent}
                        onChange={(e) => setListFilterStudent(e.target.value)}
                        className="flex-1 text-sm outline-none bg-transparent min-w-0"
                      />
                      {listFilterStudent && (
                        <button type="button" onClick={() => setListFilterStudent('')} className="text-gray-300 hover:text-gray-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StoreExportBar
                    onRefresh={() => loadIssues()}
                    onExportExcel={handleExportList}
                    loading={listLoading}
                    disabled={!issues.length && !listLoading}
                  />
                  <button
                    type="button"
                    onClick={clearListFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase text-gray-500 hover:text-[#000435]"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </UniformSection>

      {listLoading && !issues.length ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-gray-200 bg-white">
          <List size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">No uniform issues match your filters</p>
          <button type="button" onClick={startNewIssue} className="mt-4 text-xs font-bold uppercase text-amber-600 hover:underline">
            Create first issue
          </button>
        </div>
      ) : (
        <UniformTable
          headers={['Issue no', 'Class', 'Year / Term', { key: 'students', label: 'Students', align: 'center' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'actions', label: 'Actions', align: 'right' }]}
          minWidth="640px"
        >
          {issues.map((row, idx) => (
            <UniformTableRow key={row.id} index={idx}>
              <UniformTableCell className="font-bold text-[#000435]">
                {row.issue_no}
                {row.created_at && (
                  <p className="text-[10px] text-gray-400 mt-0.5 font-normal">
                    {new Date(row.created_at).toLocaleDateString()}
                  </p>
                )}
              </UniformTableCell>
              <UniformTableCell>
                <span className="inline-flex px-2 py-0.5 rounded-lg bg-[#000435]/5 text-xs font-bold text-[#000435]">
                  {row.class_name}
                </span>
              </UniformTableCell>
              <UniformTableCell className="text-gray-500">
                <span className="font-medium text-gray-700">{row.academic_year}</span>
                <span className="text-gray-300 mx-1">·</span>
                {row.term}
              </UniformTableCell>
              <UniformTableCell align="center" className="font-semibold text-[#000435]">
                {row.students_count}
              </UniformTableCell>
              <UniformTableCell align="right" className="font-bold text-[#000435]">
                {formatAmount(row.total_amount)}
              </UniformTableCell>
              <UniformTableCell align="right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="View"
                    onClick={() => openDetail(row.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => startEditIssue(row)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-700 transition"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => setDeleteTarget(row)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </UniformTableCell>
            </UniformTableRow>
          ))}
        </UniformTable>
      )}

      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#000435]/50 backdrop-blur-sm z-[80]"
              onClick={() => !deleting && setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <Trash2 size={22} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-[#000435]">Delete this issue?</h3>
                <p className="text-sm text-gray-500 mt-2">
                  <span className="font-semibold text-[#000435]">{deleteTarget.issue_no}</span>
                  {' '}· {deleteTarget.class_name} · {deleteTarget.students_count} students
                </p>
                <p className="text-xs text-amber-700 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  Stock reserved for this distribution will be restored. Student billing lines for this issue will be removed.
                </p>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border text-xs font-bold uppercase text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteIssue}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold uppercase disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {successIssue && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#000435]/60 z-[70]" onClick={() => setSuccessIssue(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto text-center">
                <BadgeCheck size={32} className="mx-auto text-green-500 mb-3" />
                <h3 className="font-bold text-[#000435]">Issue saved</h3>
                <p className="text-sm text-gray-500 mt-1">{successIssue.issue_no}</p>
                {qrDataUrl && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <img src={qrDataUrl} alt="QR" className="rounded-lg border" />
                    <p className="text-[10px] text-gray-400 flex items-center gap-1"><QrCode size={12} /> Uniform issue receipt</p>
                  </div>
                )}
                <button type="button" onClick={() => setSuccessIssue(null)} className="mt-4 w-full py-2.5 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase">
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
