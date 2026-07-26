import ManagerOchreHeroShell from '../../manager/components/ManagerOchreHeroShell'
import { useAuth } from '../context/AuthContext'

export const UNIFORM_FONT = "'Montserrat', sans-serif"

export {
  HrPanel,
  HrPanelHeader,
  HrBtnPrimary,
  HrBtnOutline,
  HrBtnGhost,
  HrHeroAction,
  HrSearch,
  HrSelect,
  HrField,
  HrInput,
  HrTextarea,
  HrFormSelect,
  HrBadge,
  HrStatCard,
  HrDrawer,
  HrModal,
  HrTabs,
  HrFilterPills,
  HrTable,
  HrAlert,
  HrPagination,
  HrToast,
} from '../../manager/pages/HRPages/hrUi'

export function UniformPageLayout({
  eyebrow = 'Uniform Manager',
  title,
  subtitle,
  HeroIcon,
  headerRight,
  heroFooter,
  kpiTiles = [],
  cardBody = null,
  kpiGridClassName = '',
  children,
  contentClassName = 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5',
  showOverlap = true,
}) {
  const { staff } = useAuth()
  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || ''
  const schoolName = staff?.school?.name || staff?.school_name || ''
  const resolvedSubtitle =
    subtitle
    ?? (schoolName
      ? `${displayName ? `${displayName} · ` : ''}${schoolName}`
      : displayName || 'Fabric, finished goods & uniform distribution')

  const hasOverlapContent = showOverlap && (kpiTiles.length > 0 || cardBody)

  return (
    <div className="hr-pages-root uniform-pages-root" style={{ fontFamily: UNIFORM_FONT }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <ManagerOchreHeroShell
        eyebrow={eyebrow}
        title={title}
        subtitle={resolvedSubtitle}
        HeroIcon={HeroIcon}
        headerRight={headerRight}
        heroFooter={heroFooter}
        kpiTiles={kpiTiles}
        kpiGridClassName={kpiGridClassName}
        cardBody={cardBody}
        overlapClassName={
          hasOverlapContent
            ? undefined
            : 'hidden'
        }
        pageBody={children ? <div className={contentClassName}>{children}</div> : null}
      />
    </div>
  )
}

/** Scrollable tab bar — HR Center ochre active state with icons. */
export function UniformTabBar({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`overflow-x-auto -mx-1 px-1 ${className}`}>
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-max min-w-full sm:min-w-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider whitespace-nowrap transition-all ${
                active === tab.id
                  ? 'bg-[#c87800] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
              style={{ fontWeight: 500 }}
            >
              {Icon ? <Icon size={13} strokeWidth={1.75} /> : null}
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
