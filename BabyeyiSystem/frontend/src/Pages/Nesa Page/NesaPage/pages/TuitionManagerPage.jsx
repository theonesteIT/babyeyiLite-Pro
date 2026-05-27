import FeeLimitsView from '../../NESAPages/FeeLimitsView';

/**
 * Dedicated Tuition Manager page — content only; amber hero lives in the shell.
 */
export default function TuitionManagerPage({
  toast,
  onStatsChange,
  onHeroActions,
  portalFilters,
  filterVersion,
  yearOptions,
  onAcademicMetaRefresh,
  onAcademicPeriodChange,
}) {
  return (
    <FeeLimitsView
      toast={toast}
      embedded
      onStatsChange={onStatsChange}
      onHeroActions={onHeroActions}
      portalFilters={portalFilters}
      filterVersion={filterVersion}
      yearOptions={yearOptions}
      onAcademicMetaRefresh={onAcademicMetaRefresh}
      onAcademicPeriodChange={onAcademicPeriodChange}
    />
  );
}
