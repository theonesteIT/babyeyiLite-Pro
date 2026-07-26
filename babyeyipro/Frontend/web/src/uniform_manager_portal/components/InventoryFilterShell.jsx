import { HrPanel, HrPanelHeader } from './uniformUi'
import ReportFiltersBar from './reports/ReportFiltersBar'

export default function InventoryFilterShell({
  filters,
  setFilter,
  resetFilters,
  extraOptions = {},
  searchPlaceholder,
  drawerVariant = 'inventory',
  showSizeToggle = true,
  subtitle = 'Search and date range — open More filters for type, color, supplier and more',
  className = '',
  flat = false,
}) {
  const bar = (
    <ReportFiltersBar
      filters={filters}
      setFilter={setFilter}
      onReset={resetFilters}
      extraOptions={extraOptions}
      layout="compact"
      drawerVariant={drawerVariant}
      showSizeToggle={showSizeToggle}
      searchPlaceholder={searchPlaceholder}
    />
  )

  if (flat) {
    return <div className={`space-y-3 ${className}`}>{bar}</div>
  }

  return (
    <HrPanel className={className}>
      <HrPanelHeader title="Filters" description={subtitle} />
      <div className="px-5 pb-5">
        {bar}
      </div>
    </HrPanel>
  )
}
