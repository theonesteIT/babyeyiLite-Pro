import { Link } from 'react-router-dom'
import { FileBarChart, ArrowRight, Search, X, Layers, TrendingUp, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  REPORT_CATEGORIES,
  INVENTORY_REPORTS,
  FINANCIAL_REPORTS,
  VISIBLE_REPORTS,
} from '../../config/reportCatalog'
import { uniformHref } from '../../config/portal'
import {
  UniformPageLayout,
  HrPanel,
  HrPanelHeader,
} from '../../components/uniformUi'

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All reports', icon: Sparkles },
  { id: 'inventory', label: 'Inventory', icon: Layers },
  { id: 'financial', label: 'Financial', icon: TrendingUp },
]

function ReportCard({ report }) {
  const Icon = report.icon
  const to = report.legacyRoute
    ? uniformHref('/reports/general-stock')
    : uniformHref(`/reports/${report.slug}`)

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-lg hover:border-[#FEBF10]/50 hover:-translate-y-0.5 transition-all flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#000435]/8 to-[#FEBF10]/10 text-[#000435] group-hover:from-[#FEBF10]/20 group-hover:to-amber-100 transition-colors">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        {report.placeholder && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Coming soon
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-bold text-[#000435]">{report.title}</h3>
        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{report.subtitle}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c87800] mt-auto">
        Open report
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  )
}

function ReportSection({ category, reports, query }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reports
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.subtitle || '').toLowerCase().includes(q)
    )
  }, [reports, query])

  if (!filtered.length) return null
  const cat = REPORT_CATEGORIES[category]

  return (
    <HrPanel>
      <HrPanelHeader
        title={cat?.label || category}
        description={`${filtered.length} report${filtered.length === 1 ? '' : 's'} available`}
      />
      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((report) => (
          <ReportCard key={report.slug} report={report} />
        ))}
      </div>
    </HrPanel>
  )
}

export default function ReportsHub() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const filteredCount = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = category === 'all'
      ? VISIBLE_REPORTS
      : category === 'inventory'
        ? INVENTORY_REPORTS
        : FINANCIAL_REPORTS
    if (!q) return pool.length
    return pool.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.subtitle || '').toLowerCase().includes(q)
    ).length
  }, [query, category])

  const showInventory = category === 'all' || category === 'inventory'
  const showFinancial = category === 'all' || category === 'financial'

  return (
    <UniformPageLayout
      eyebrow="Uniform Manager"
      title="Reports Center"
      subtitle="Live inventory and financial reports with filters and export"
      HeroIcon={FileBarChart}
      headerRight={(
        <Link
          to={uniformHref('/reports/general-stock')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c87800] text-white text-xs uppercase tracking-wider hover:bg-[#b36d00] transition-colors font-medium shadow-sm"
        >
          General stock count
        </Link>
      )}
    >
      {/* Modern search hero */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-amber-50/20 to-slate-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#c87800]">Find a report</p>
              <h2 className="text-lg font-bold text-[#000435] mt-0.5">Search inventory & financial reports</h2>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by report name, stock, sales, profit…"
                className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-[#000435] placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 focus:border-[#FEBF10]/60 transition-all"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#000435] transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((f) => {
                const Icon = f.icon
                const active = category === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCategory(f.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-[#000435] text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-[#FEBF10]/50 hover:bg-amber-50/50'
                    }`}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
            <div className="rounded-2xl bg-[#000435] text-white px-5 py-4 min-w-[140px] shadow-sm">
              <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">Live reports</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{VISIBLE_REPORTS.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 min-w-[140px] shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Matching</p>
              <p className="text-3xl font-bold mt-1 tabular-nums text-[#000435]">{filteredCount}</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-4 pt-4 border-t border-slate-200/80">
          PDF, Excel, CSV and print export · Date filters and advanced search on each report
        </p>
      </div>

      {filteredCount === 0 ? (
        <HrPanel>
          <div className="p-10 text-center">
            <Search size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-[#000435]">No reports match your search</p>
            <p className="text-xs text-slate-500 mt-1">Try a different keyword or clear the category filter</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setCategory('all') }}
              className="mt-4 text-xs font-bold text-[#c87800] hover:underline"
            >
              Reset search
            </button>
          </div>
        </HrPanel>
      ) : (
        <>
          {showInventory ? <ReportSection category="inventory" reports={INVENTORY_REPORTS} query={query} /> : null}
          {showFinancial ? <ReportSection category="financial" reports={FINANCIAL_REPORTS} query={query} /> : null}
        </>
      )}
    </UniformPageLayout>
  )
}
