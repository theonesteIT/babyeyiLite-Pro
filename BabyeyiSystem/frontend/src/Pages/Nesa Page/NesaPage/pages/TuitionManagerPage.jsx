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
  academicPeriod,
  yearOptions,
  sortedYearOptions,
  termOptions,
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
      academicPeriod={academicPeriod}
      yearOptions={yearOptions}
      sortedYearOptions={sortedYearOptions}
      termOptions={termOptions}
      onAcademicMetaRefresh={onAcademicMetaRefresh}
      onAcademicPeriodChange={onAcademicPeriodChange}
    />
  );
}
