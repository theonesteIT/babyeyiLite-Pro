import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  pdfHeader,
  pdfTable,
  savePdf,
  stamp,
} from './storeReportExportCommon'
import { mergeSchoolPdfMeta } from './schoolPdfBranding'

async function pdfHeaderWithSchool(doc, title, subtitle = '', landscape = false) {
  const branding = await mergeSchoolPdfMeta()
  return pdfHeader(doc, title, subtitle, landscape, branding)
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

export async function exportFabricPlannerPlansPdf(plans, academicYear = '') {
  const doc = new jsPDF({ orientation: 'landscape' })
  const sub = academicYear ? `Academic year ${academicYear}` : ''
  const y = await pdfHeaderWithSchool(doc, 'Uniform Fabric Planner — Production Plans', sub, true)

  pdfTable(doc, autoTable, {
    startY: y + 2,
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
  })

  savePdf(doc, `fabric-planner-plans-${stamp()}.pdf`)
}

export async function exportFabricPlannerPlanDetailPdf(plan) {
  if (!plan) return
  const doc = new jsPDF()
  const y = await pdfHeaderWithSchool(doc, plan.planNo || 'Production Plan', `${plan.fabricRollName || plan.fabricType || ''} · ${plan.status || ''}`)

  let bodyY = y + 2
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
    doc.setFont('helvetica', 'bold')
    doc.text(`${k}:`, 14, bodyY)
    doc.setFont('helvetica', 'normal')
    doc.text(String(v), 60, bodyY)
    bodyY += 7
  })

  pdfTable(doc, autoTable, {
    startY: bodyY + 4,
    head: [['Uniform', 'Qty', 'M/child']],
    body: (plan.items || []).map((it) => [it.name, String(it.quantity), `${it.metersPerChild}m`]),
    headStyles: { fillColor: [254, 191, 16], textColor: [0, 4, 53] },
  })

  savePdf(doc, `${plan.planNo || 'plan'}-${stamp()}.pdf`)
}
