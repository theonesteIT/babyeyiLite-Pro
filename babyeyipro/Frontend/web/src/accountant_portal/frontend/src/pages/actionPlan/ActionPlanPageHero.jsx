import AccountantBudgetHeroShell from '../../components/AccountantBudgetHeroShell';
import { getActionPlanHeroConfig } from '../../utils/actionPlanHeroConfig';

/**
 * Ochre hero band for Action Plan pages — same #c87800 layout as accountant Dashboard.
 */
export default function ActionPlanPageHero({
  pageId,
  subtitle,
  headerRight = null,
  kpiTiles = [],
  kpiGridClassName = '',
  compact = false,
}) {
  const cfg = getActionPlanHeroConfig(pageId);
  if (!cfg) return null;

  return (
    <AccountantBudgetHeroShell
      eyebrow={cfg.eyebrow}
      title={cfg.title}
      subtitle={subtitle || cfg.subtitle}
      HeroIcon={cfg.icon}
      headerRight={headerRight}
      kpiTiles={kpiTiles}
      kpiGridClassName={kpiGridClassName}
      outerClassName={compact ? 'shrink-0' : 'shrink-0 bg-slate-100'}
      pageBody={null}
    />
  );
}
