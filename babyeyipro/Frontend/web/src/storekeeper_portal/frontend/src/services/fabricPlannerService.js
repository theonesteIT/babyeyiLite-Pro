import api from './api'

export function classNameOf(entry) {
  if (!entry) return ''
  if (typeof entry === 'string') return entry.trim()
  return String(entry.class_name || entry.name || '').trim()
}

export function normalizeClassList(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows || []) {
    const class_name = classNameOf(row)
    if (!class_name || seen.has(class_name)) continue
    seen.add(class_name)
    out.push({
      class_name,
      count: Number(row?.count ?? row?.student_count ?? 0),
    })
  }
  return out
}

function mapUniformTypeFromApi(u) {
  return {
    id: u.id,
    name: u.name || '',
    metersPerChild: Number(u.metersPerChild ?? u.meters_per_child ?? 0),
    perClassMode: Boolean(u.perClassMode ?? u.per_class_mode),
    classMeters: u.classMeters || u.class_meters || {},
  }
}

function mapPlannerFromApi(data) {
  if (!data) return null
  return {
    id: data.id,
    academicYear: data.academicYear || data.academic_year || '',
    term: data.term || '',
    fabricRollName: data.fabricRollName || data.fabric_roll_name || '',
    fabricType: data.fabricType || data.fabric_type || '',
    availableFabric: data.availableFabric ?? data.available_fabric ?? '',
    fabricReceiptId: data.fabricReceiptId || data.fabric_receipt_id || '',
    supplierName: data.supplierName || data.supplier_name || '',
    costPerMeter: data.costPerMeter ?? data.cost_per_meter ?? '',
    wasteAllowance: Number(data.wasteAllowance ?? data.waste_allowance ?? 0),
    colorAllocations: data.colorAllocations || data.color_allocations || {},
    selectedClasses: Array.isArray(data.selectedClasses) ? data.selectedClasses : [],
    classCounts: data.classCounts || data.class_counts || {},
    uniformTypes: (data.uniformTypes || data.uniform_types || []).map(mapUniformTypeFromApi),
    productionPlan: data.productionPlan || data.production_plan || null,
    consumptionRecords: (data.consumptionRecords || data.consumption_records || []).map((r) => ({
      id: r.id,
      uniform: r.uniform || r.uniform_name,
      produced: Number(r.produced || 0),
      distributed: Number(r.distributed || 0),
      recordedAt: r.recordedAt || r.recorded_at,
    })),
  }
}

export async function fetchFabricPlannerDashboard(academicYear) {
  const res = await api.get('/store/fabric-planner/dashboard', {
    params: { academic_year: academicYear },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load dashboard')
  const d = res.data.data || {}
  return {
    kpis: d.kpis || {},
    consumptionTrend: d.consumptionTrend || [],
    demandByClass: d.demandByClass || [],
    mostProduced: d.mostProduced || [],
    alerts: d.alerts || [],
    recentPlans: (d.recentPlans || []).map((p) => ({
      id: p.id,
      planNo: p.planNo || p.plan_no,
      fabric: p.fabric,
      students: p.students,
      status: p.status,
      reservedFabric: p.reservedFabric,
      requiredFabric: p.requiredFabric,
      remainingFabric: p.remainingFabric,
      createdAt: p.createdAt,
    })),
    planner: mapPlannerFromApi(d.planner),
  }
}

export async function fetchFabricPlanner(academicYear) {
  const res = await api.get('/store/fabric-planner', {
    params: { academic_year: academicYear },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load fabric planner')
  return mapPlannerFromApi(res.data.data)
}

export async function saveFabricPlanner(payload) {
  const res = await api.put('/store/fabric-planner', {
    academic_year: payload.academicYear,
    term: payload.term || null,
    fabric_roll_name: payload.fabricRollName,
    fabric_type: payload.fabricType,
    available_fabric: payload.availableFabric,
    fabric_receipt_id: payload.fabricReceiptId || null,
    supplier_name: payload.supplierName,
    cost_per_meter: payload.costPerMeter,
    waste_allowance: payload.wasteAllowance,
    color_allocations: payload.colorAllocations,
    selected_classes: payload.selectedClasses,
    class_counts: payload.classCounts,
    uniform_types: (payload.uniformTypes || []).map((u) => ({
      name: u.name,
      meters_per_child: u.metersPerChild,
      per_class_mode: u.perClassMode,
      class_meters: u.classMeters,
    })),
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to save fabric planner')
  return mapPlannerFromApi(res.data.data)
}

export async function createFabricProductionPlan(payload) {
  const res = await api.post('/store/fabric-planner/production-plan', {
    academic_year: payload.academicYear,
    reserved_fabric: payload.reservedFabric,
    required_fabric: payload.requiredFabric,
    remaining_fabric: payload.remainingFabric,
    student_total: payload.studentTotal,
    fabric_receipt_id: payload.fabricReceiptId || null,
    fabric_type: payload.fabricType,
    status: payload.status || 'draft',
    reserve_fabric: payload.reserveFabric,
    classes: payload.selectedClasses,
    items: payload.items,
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to create production plan')
  return {
    data: mapPlannerFromApi(res.data.data),
    fabricStockoutId: res.data.fabric_stockout_id,
    planNo: res.data.plan_no,
  }
}

export async function updateFabricPlanStatus(planId, { academicYear, status }) {
  const res = await api.patch(`/store/fabric-planner/plans/${planId}/status`, {
    academic_year: academicYear,
    status,
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update plan status')
  return mapPlannerFromApi(res.data.data)
}

export async function recordFabricPlannerConsumption({ academicYear, uniform, produced, distributed }) {
  const res = await api.post('/store/fabric-planner/consumption', {
    academic_year: academicYear,
    uniform,
    produced,
    distributed,
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to record consumption')
  return mapPlannerFromApi(res.data.data)
}

function mapPlanSummary(p) {
  return {
    id: p.id,
    plannerId: p.plannerId || p.planner_id,
    planNo: p.planNo || p.plan_no,
    academicYear: p.academicYear || p.academic_year || '',
    term: p.term || '',
    fabricType: p.fabricType || p.fabric_type || '',
    fabricRollName: p.fabricRollName || p.fabric_roll_name || '',
    supplierName: p.supplierName || p.supplier_name || '',
    students: Number(p.students || p.student_total || 0),
    status: p.status || 'draft',
    reservedFabric: Number(p.reservedFabric ?? p.reserved_fabric ?? 0),
    requiredFabric: Number(p.requiredFabric ?? p.required_fabric ?? 0),
    remainingFabric: Number(p.remainingFabric ?? p.remaining_fabric ?? 0),
    availableFabric: p.availableFabric ?? p.available_fabric,
    costPerMeter: p.costPerMeter ?? p.cost_per_meter,
    wasteAllowance: p.wasteAllowance ?? p.waste_allowance,
    classes: p.classes || [],
    createdAt: p.createdAt || p.created_at,
  }
}

export async function fetchFabricPlannerPlans({ academicYear, status } = {}) {
  const res = await api.get('/store/fabric-planner/plans', {
    params: {
      academic_year: academicYear || undefined,
      status: status || undefined,
    },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load plans')
  return (res.data.data || []).map(mapPlanSummary)
}

export async function fetchFabricPlanDetail(planId) {
  const res = await api.get(`/store/fabric-planner/plans/${planId}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load plan')
  const d = res.data.data || {}
  return {
    ...mapPlanSummary(d),
    fabricReceiptId: d.fabricReceiptId || d.fabric_receipt_id || '',
    items: (d.items || []).map((it) => ({
      name: it.name || it.uniform_name,
      quantity: Number(it.quantity || 0),
      metersPerChild: Number(it.metersPerChild ?? it.meters_per_child ?? 0),
    })),
    classDetails: (d.classDetails || []).map((c) => ({
      className: c.className || c.class_name,
      studentCount: Number(c.studentCount ?? c.student_count ?? 0),
    })),
    consumptionRecords: (d.consumptionRecords || []).map((r) => ({
      id: r.id,
      uniform: r.uniform || r.uniform_name,
      produced: Number(r.produced || 0),
      distributed: Number(r.distributed || 0),
      recordedAt: r.recordedAt || r.recorded_at,
    })),
    planner: mapPlannerFromApi(d.planner),
  }
}

export async function deleteFabricPlan(planId) {
  const res = await api.delete(`/store/fabric-planner/plans/${planId}`)
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete plan')
  return res.data
}

export async function deleteFabricPlannerConsumption(id, academicYear) {
  const res = await api.delete(`/store/fabric-planner/consumption/${id}`, {
    params: { academic_year: academicYear },
  })
  if (!res.data?.success) throw new Error(res.data?.message || 'Failed to delete consumption')
  return mapPlannerFromApi(res.data.data)
}
