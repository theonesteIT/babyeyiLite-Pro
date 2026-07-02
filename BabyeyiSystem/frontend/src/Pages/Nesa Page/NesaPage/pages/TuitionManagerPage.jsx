import NesaFeesLimit from '../../NESAPages/NesaFeesLimit';

/**
 * Dedicated Tuition Manager page — national fee limits (NesaFeesLimit).
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
    <NesaFeesLimit
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
