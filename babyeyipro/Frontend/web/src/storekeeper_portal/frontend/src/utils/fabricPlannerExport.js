import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

function metaRows(title, extra = []) {
  return [
    [title],
    [`Exported: ${new Date().toLocaleString()}`],
    ...extra.map((line) => [line]),
    [],
  ]
}

function downloadWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function exportFabricPlannerPlansExcel(plans, academicYear = '') {
  const data = [
    ...metaRows('Uniform Fabric Planner — Production Plans', academicYear ? [`Academic year: ${academicYear}`] : []),
    ['Plan No', 'Academic Year', 'Term', 'Fabric', 'Supplier', 'Students', 'Required (m)', 'Reserved (m)', 'Remaining (m)', 'Status', 'Created'],
    ...(plans || []).map((p) => [
      p.planNo || p.plan_no || '',
      p.academicYear || '',
      p.term || '',
      p.fabricRollName || p.fabricType || p.fabric || '',
      p.supplierName || '',
      Number(p.students || 0),
      Number(p.requiredFabric || 0),
      Number(p.reservedFabric || 0),
      Number(p.remainingFabric || 0),
      p.status || '',
      p.createdAt ? String(p.createdAt).slice(0, 16) : '',
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plans')
  downloadWorkbook(wb, `fabric-planner-plans-${stamp()}.xlsx`)
}

export function exportFabricPlannerPlanDetailExcel(plan) {
  if (!plan) return
  const data = [
    ...metaRows(`Plan ${plan.planNo}`, [
      `Status: ${plan.status}`,
      `Academic year: ${plan.academicYear}`,
    ]),
    ['Field', 'Value'],
    ['Plan No', plan.planNo],
    ['Fabric', plan.fabricRollName || plan.fabricType],
    ['Supplier', plan.supplierName || '—'],
    ['Students', plan.students],
    ['Required fabric (m)', plan.requiredFabric],
    ['Reserved fabric (m)', plan.reservedFabric],
    ['Remaining (m)', plan.remainingFabric],
    ['Available fabric (m)', plan.availableFabric],
    ['Cost per meter', plan.costPerMeter],
    ['Waste %', plan.wasteAllowance],
    ['Status', plan.status],
    [],
    ['Uniform items'],
    ['Uniform', 'Quantity', 'Meters / child'],
    ...(plan.items || []).map((it) => [it.name, it.quantity, it.metersPerChild]),
    [],
    ['Classes'],
    ['Class', 'Students'],
    ...(plan.classDetails || []).map((c) => [c.className, c.studentCount]),
    [],
    ['Consumption'],
    ['Uniform', 'Produced', 'Distributed'],
    ...(plan.consumptionRecords || []).map((r) => [r.uniform, r.produced, r.distributed]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plan Detail')
  downloadWorkbook(wb, `${plan.planNo || 'plan'}-${stamp()}.xlsx`)
}

export function exportFabricPlannerPlansPdf(plans, academicYear = '') {
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFillColor(0, 4, 53)
  doc.rect(0, 0, 297, 28, 'F')
  doc.setTextColor(254, 191, 16)
  doc.setFontSize(14)
  doc.text('Uniform Fabric Planner — Production Plans', 14, 12)
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(`Exported ${new Date().toLocaleString()}${academicYear ? ` · ${academicYear}` : ''}`, 14, 20)

  autoTable(doc, {
    startY: 34,
    head: [['Plan', 'Year', 'Fabric', 'Students', 'Required', 'Reserved', 'Status', 'Created']],
    body: (plans || []).map((p) => [
      p.planNo || '',
      p.academicYear || '',
      p.fabricRollName || p.fabricType || '',
      String(p.students || 0),
      `${p.requiredFabric || 0}m`,
      `${p.reservedFabric || 0}m`,
      p.status || '',
      p.createdAt ? String(p.createdAt).slice(0, 10) : '',
    ]),
    styles: { fontSize: 8, textColor: [0, 4, 53] },
    headStyles: { fillColor: [0, 4, 53], textColor: [254, 191, 16] },
    alternateRowStyles: { fillColor: [255, 251, 235] },
  })
  doc.save(`fabric-planner-plans-${stamp()}.pdf`)
}

export function exportFabricPlannerPlanDetailPdf(plan) {
  if (!plan) return
  const doc = new jsPDF()
  doc.setFillColor(0, 4, 53)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setTextColor(254, 191, 16)
  doc.setFontSize(16)
  doc.text(plan.planNo || 'Production Plan', 14, 14)
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(`${plan.fabricRollName || plan.fabricType || ''} · ${plan.status || ''}`, 14, 22)

  let y = 40
  const lines = [
    ['Academic year', plan.academicYear],
    ['Term', plan.term || '—'],
    ['Students', String(plan.students || 0)],
    ['Required fabric', `${plan.requiredFabric || 0} m`],
    ['Reserved fabric', `${plan.reservedFabric || 0} m`],
    ['Remaining', `${plan.remainingFabric || 0} m`],
    ['Supplier', plan.supplierName || '—'],
  ]
  doc.setTextColor(0, 4, 53)
  doc.setFontSize(10)
  lines.forEach(([k, v]) => {
    doc.setFont(undefined, 'bold')
    doc.text(`${k}:`, 14, y)
    doc.setFont(undefined, 'normal')
    doc.text(String(v), 60, y)
    y += 7
  })

  autoTable(doc, {
    startY: y + 4,
    head: [['Uniform', 'Qty', 'M/child']],
    body: (plan.items || []).map((it) => [it.name, String(it.quantity), `${it.metersPerChild}m`]),
    styles: { fontSize: 9, textColor: [0, 4, 53] },
    headStyles: { fillColor: [254, 191, 16], textColor: [0, 4, 53] },
  })

  doc.save(`${plan.planNo || 'plan'}-${stamp()}.pdf`)
}
