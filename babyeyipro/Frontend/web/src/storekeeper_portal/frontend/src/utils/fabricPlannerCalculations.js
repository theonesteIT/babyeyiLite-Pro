/**
 * Fabric yield & demand calculations for uniform planning.
 */

export function roundMeters(value, decimals = 1) {
  const n = Number(value) || 0
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

export function quantityPossible(availableMeters, metersPerChild) {
  const per = Number(metersPerChild) || 0
  if (per <= 0) return 0
  return Math.floor((Number(availableMeters) || 0) / per)
}

export function remainingAfterProduction(availableMeters, metersPerChild, quantity) {
  const per = Number(metersPerChild) || 0
  const qty = Number(quantity) || 0
  return roundMeters(Math.max(0, (Number(availableMeters) || 0) - per * qty))
}

/** Fabric needed for one uniform type across selected classes. */
export function fabricNeededForUniform({
  selectedClasses,
  classCounts,
  metersPerChild,
  perClassMode,
  classMeters = {},
}) {
  return roundMeters(
    (selectedClasses || []).reduce((sum, cls) => {
      const students = Number(classCounts[cls]) || 0
      const per = perClassMode
        ? Number(classMeters[cls]) || Number(metersPerChild) || 0
        : Number(metersPerChild) || 0
      return sum + students * per
    }, 0)
  )
}

/** Average meters per child (for display when per-class mode is on). */
export function averageMetersPerChild({
  selectedClasses,
  classCounts,
  metersPerChild,
  perClassMode,
  classMeters = {},
}) {
  const totalStudents = (selectedClasses || []).reduce(
    (s, cls) => s + (Number(classCounts[cls]) || 0),
    0
  )
  if (totalStudents <= 0) return Number(metersPerChild) || 0

  const totalFabric = fabricNeededForUniform({
    selectedClasses,
    classCounts,
    metersPerChild,
    perClassMode,
    classMeters,
  })
  return roundMeters(totalFabric / totalStudents, 2)
}

export function buildForecastRows({
  uniformTypes,
  selectedClasses,
  classCounts,
  availableMeters,
}) {
  return (uniformTypes || []).map((u) => {
    const needed = fabricNeededForUniform({
      selectedClasses,
      classCounts,
      metersPerChild: u.metersPerChild,
      perClassMode: u.perClassMode,
      classMeters: u.classMeters,
    })
    const avgPer = averageMetersPerChild({
      selectedClasses,
      classCounts,
      metersPerChild: u.metersPerChild,
      perClassMode: u.perClassMode,
      classMeters: u.classMeters,
    })
    const possible = quantityPossible(availableMeters, avgPer)
    return {
      id: u.id,
      name: u.name,
      metersPerChild: u.perClassMode ? avgPer : Number(u.metersPerChild) || 0,
      fabricNeeded: needed,
      quantityPossible: possible,
      perClassMode: u.perClassMode,
    }
  })
}

export function totalStudents(selectedClasses, classCounts) {
  return (selectedClasses || []).reduce((s, cls) => s + (Number(classCounts[cls]) || 0), 0)
}

export function totalFabricDemand(forecastRows) {
  return roundMeters((forecastRows || []).reduce((s, r) => s + (r.fabricNeeded || 0), 0))
}

export function fabricStatus(available, required) {
  const avail = Number(available) || 0
  const req = Number(required) || 0
  if (req <= 0) return { enough: true, remaining: avail, shortfall: 0 }
  const enough = avail >= req
  return {
    enough,
    remaining: roundMeters(avail - req),
    shortfall: enough ? 0 : roundMeters(req - avail),
  }
}

export function buildProductionPlan({ uniformTypes, selectedClasses, classCounts }) {
  const students = totalStudents(selectedClasses, classCounts)
  return (uniformTypes || [])
    .filter((u) => String(u.name || '').trim())
    .map((u) => ({
      name: u.name,
      quantity: students,
      metersPerChild: u.perClassMode
        ? averageMetersPerChild({
            selectedClasses,
            classCounts,
            metersPerChild: u.metersPerChild,
            perClassMode: true,
            classMeters: u.classMeters,
          })
        : Number(u.metersPerChild) || 0,
    }))
}

export function actualFabricUsed(consumptionRecords, uniformTypes) {
  return roundMeters(
    (consumptionRecords || []).reduce((sum, rec) => {
      const uniform = (uniformTypes || []).find(
        (u) => String(u.name).toLowerCase() === String(rec.uniform).toLowerCase()
      )
      const per = uniform
        ? uniform.perClassMode
          ? Number(uniform.metersPerChild) || 0
          : Number(uniform.metersPerChild) || 0
        : Number(rec.metersPerChild) || 0
      return sum + (Number(rec.produced) || 0) * per
    }, 0)
  )
}

export const DEFAULT_UNIFORM_TYPES = [
  { name: 'Dress', metersPerChild: 1.5 },
  { name: 'Shirt', metersPerChild: 1.2 },
  { name: 'Trouser', metersPerChild: 1.0 },
]

export const UNIFORM_PACKAGES = {
  nursery: [
    { name: 'Dress', metersPerChild: 1.2 },
    { name: 'Shirt', metersPerChild: 1.0 },
    { name: 'Short', metersPerChild: 0.8 },
  ],
  primary: [
    { name: 'Dress', metersPerChild: 1.4 },
    { name: 'Shirt', metersPerChild: 1.2 },
    { name: 'Trouser', metersPerChild: 1.0 },
    { name: 'Tie', metersPerChild: 0.1 },
  ],
  secondary: [
    { name: 'Shirt', metersPerChild: 1.3 },
    { name: 'Trouser', metersPerChild: 1.1 },
    { name: 'Sweater', metersPerChild: 0.9 },
    { name: 'Tie', metersPerChild: 0.1 },
  ],
}

export function classGroup(className) {
  const c = String(className || '').trim().toUpperCase()
  if (/^N\d/.test(c) || c.startsWith('NURSERY')) return 'nursery'
  if (/^P\d/.test(c) || c.startsWith('PRIMARY')) return 'primary'
  if (/^S\d/.test(c) || /^SEC/.test(c) || c.startsWith('SECONDARY')) return 'secondary'
  return 'other'
}

export function applyWasteAllowance(fabricMeters, wastePercent = 0) {
  const base = Number(fabricMeters) || 0
  const waste = Number(wastePercent) || 0
  return roundMeters(base * (1 + waste / 100), 2)
}

export function fabricUsagePercent(required, available) {
  const req = Number(required) || 0
  const avail = Number(available) || 0
  if (avail <= 0) return req > 0 ? 100 : 0
  return Math.min(100, roundMeters((req / avail) * 100, 0))
}

export function totalFabricDemandWithWaste(forecastRows, wastePercent = 0) {
  return applyWasteAllowance(totalFabricDemand(forecastRows), wastePercent)
}

export function expectedUniformsFromStock(availableMeters, uniformTypes, selectedClasses, classCounts) {
  if (!uniformTypes?.length) return 0
  const primary = uniformTypes[0]
  const avg = averageMetersPerChild({
    selectedClasses,
    classCounts,
    metersPerChild: primary.metersPerChild,
    perClassMode: primary.perClassMode,
    classMeters: primary.classMeters,
  })
  return quantityPossible(availableMeters, avg)
}
