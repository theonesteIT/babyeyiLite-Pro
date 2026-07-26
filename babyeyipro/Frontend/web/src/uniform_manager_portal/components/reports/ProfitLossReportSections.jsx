import { useState } from 'react'
import { Shirt, Layers } from 'lucide-react'
import { HrPanel, UniformTabBar } from '../uniformUi'
import ReportDataTable from './ReportDataTable'
import { fmtMoney } from '../../utils/reportUtils'

const SECTION_ICONS = {
  finished: Shirt,
  fabric: Layers,
}

function SectionKpiStrip({ kpis = [] }) {
  if (!kpis.length) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {kpis.map((k) => (
        <div
          key={k.key}
          className={`rounded-xl border px-3 py-2.5 ${
            k.warn ? 'border-red-200 bg-red-50/80' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{k.label}</p>
          <p className={`text-sm font-bold mt-0.5 tabular-nums ${k.warn ? 'text-red-700' : 'text-[#000435]'}`}>
            {k.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function SectionPanel({ section }) {
  const Icon = SECTION_ICONS[section.id] || Shirt
  const subtotal = (section.rows || []).find((r) => r._isSubtotal)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="p-2.5 rounded-xl bg-[#000435]/5 text-[#000435] shrink-0">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-slate-500">{section.subtitle}</p>
        </div>
        {subtotal ? (
          <div className="text-right shrink-0 ml-auto">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Section total</p>
            <p className={`text-base font-bold tabular-nums ${
              subtotal.tone === 'loss' ? 'text-red-700' : subtotal.tone === 'profit' ? 'text-emerald-700' : 'text-slate-600'
            }`}
            >
              {fmtMoney(subtotal.profit_loss)}
            </p>
            <p className="text-[10px] font-semibold mt-0.5">
              {subtotal.resultEmoji} {subtotal.result}
            </p>
          </div>
        ) : null}
      </div>

      <SectionKpiStrip kpis={section.kpis} />

      <ReportDataTable
        columns={section.columns}
        rows={section.rows || []}
        emptyMessage={`No ${section.title.toLowerCase()} records for this period. Try Last 6 months and click Refresh.`}
        variant="profitLoss"
      />
    </div>
  )
}

export default function ProfitLossReportSections({ sections = [], emptyMessage, loading }) {
  const tabs = sections.map((s) => ({
    id: s.id,
    label: s.title,
    icon: SECTION_ICONS[s.id] || Shirt,
  }))
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'finished')
  const activeSection = sections.find((s) => s.id === activeTab) || sections[0]

  if (loading) {
    return (
      <HrPanel>
        <div className="p-10 text-center text-sm text-slate-500">Loading profit & loss…</div>
      </HrPanel>
    )
  }

  if (!sections.length) {
    return (
      <HrPanel>
        <div className="p-10 text-center text-sm text-slate-500">{emptyMessage}</div>
      </HrPanel>
    )
  }

  return (
    <HrPanel>
      <div className="p-5 space-y-5">
        <UniformTabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {activeSection ? <SectionPanel section={activeSection} /> : null}
      </div>
    </HrPanel>
  )
}
