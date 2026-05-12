import { useCallback, useEffect, useState } from 'react';
import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { useRepresentativeData } from '../context/RepresentativeContext';
import { fetchRepresentativeFinanceOverview } from '../services/api';
import { Wallet, FileDown, Loader2 } from 'lucide-react';

const formatRwf = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `RWF ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(1)}K`;
  return `RWF ${v.toLocaleString()}`;
};

export default function RepresentativeFinance() {
  const { activeSchool, activeSchoolId, loading: ctxLoading, refresh: refreshContext } = useRepresentativeData();
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const scopeHint = activeSchool
    ? `Showing data for ${activeSchool.school_name}`
    : 'Showing totals across all schools assigned to you';

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolParam =
        activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;
      const res = await fetchRepresentativeFinanceOverview(schoolParam);
      if (!res?.success) {
        setFinance(null);
        setError(res?.message || 'Could not load finance overview.');
        return;
      }
      setFinance(res.data || null);
    } catch (e) {
      setFinance(null);
      setError(e?.response?.data?.message || e.message || 'Could not load finance overview.');
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const onRefresh = useCallback(async () => {
    await refreshContext();
    await loadFinance();
  }, [refreshContext, loadFinance]);

  const kpis = finance?.kpis;
  const transparency = finance?.transparency;
  const pl = finance?.pl_snapshot;

  const mobilePct =
    transparency?.mobile_money_share_pct != null ? `${transparency.mobile_money_share_pct}%` : '—';

  const kpiTiles = [
    {
      key: 'rev',
      label: kpis?.revenue_quarter_label || 'Fee revenue (period)',
      value: loading ? '…' : kpis ? formatRwf(kpis.revenue_period_rwf) : '—',
      icon: Wallet,
      subValue: loading ? '' : scopeHint,
    },
    {
      key: 'exp',
      label: 'Operating expenses',
      value: loading ? '…' : kpis ? formatRwf(kpis.operating_expenses_rwf) : '—',
      icon: Wallet,
      subValue: 'Recorded in accountant expenses',
    },
    {
      key: 'out',
      label: 'Outstanding balances',
      value: loading ? '…' : kpis ? formatRwf(kpis.outstanding_rwf) : '—',
      icon: Wallet,
      subValue: 'Open Babyeyi invoices',
    },
    {
      key: 'cf',
      label: 'Cash flow signal',
      value: loading ? '…' : kpis?.cash_flow_health || '—',
      icon: Wallet,
      subValue: loading ? '' : `Paid all-time ${kpis ? formatRwf(kpis.fee_collected_all_time_rwf) : '—'}`,
    },
  ];

  const salaryTone = transparency?.salary_monitoring?.tone === 'warn' ? 'warn' : 'default';

  return (
    <RepresentativeHeroShell
      onRefresh={onRefresh}
      eyebrow={
        activeSchool
          ? `Financial control · ${activeSchool.school_name}`
          : 'Financial control · assigned schools'
      }
      title="Finance"
      subtitle={
        loading && ctxLoading
          ? 'Loading live figures from your Babyeyi workspace…'
          : `${scopeHint}. Revenue uses paid invoices in the last 90 days (when dates exist).`
      }
      HeroIcon={Wallet}
      kpiTiles={kpiTiles}
      pageBody={
        <>
          {error ? (
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            </div>
          ) : null}

          {(loading || ctxLoading) && !finance ? (
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-4 flex items-center gap-2 text-sm text-re-text-muted">
              <Loader2 className="animate-spin shrink-0" size={18} />
              Syncing finance overview…
            </div>
          ) : null}

          <RepSection
            title="Transparency & exports"
            subtitle={scopeHint}
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-amber-400/30 hover:bg-[#00052a] transition-colors"
                >
                  <FileDown size={14} /> PDF
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#000435] hover:bg-amber-300 transition-colors"
                >
                  <FileDown size={14} /> Excel
                </button>
              </div>
            }
          >
            <RepCardGrid>
              <RepStatCard
                label="Mobile money share"
                value={mobilePct}
                hint="Paid invoices tagged MoMo / MTN / Airtel"
              />
              <RepStatCard
                label="Bank settlements"
                value={loading ? '…' : transparency ? formatRwf(transparency.bank_settlements_rwf) : '—'}
                hint="Paid invoices tagged bank / transfer"
              />
              <RepStatCard
                label="Salary monitoring"
                value={loading ? '…' : transparency?.salary_monitoring?.label || '—'}
                hint="Pending payroll requests"
                tone={salaryTone}
              />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Profit / loss snapshot">
            <div className="grid gap-4 lg:grid-cols-2">
              <RepListCard
                title="Budget vs actual (guideline)"
                rows={(pl?.budget_vs_actual || []).map((r) => ({
                  label: r.label,
                  value: `${r.pct_actual}%`,
                }))}
              />
              <RepListCard
                title="Daily transactions"
                rows={[
                  {
                    label: 'Posted today',
                    value: loading ? '…' : String(pl?.daily?.posted_today ?? '—'),
                  },
                  {
                    label: 'Pending approval',
                    value: loading ? '…' : String(pl?.daily?.pending_approval ?? '—'),
                  },
                  {
                    label: 'Fraud watch rules',
                    value: loading ? '…' : `${pl?.daily?.fraud_rules_active ?? '—'} active`,
                  },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
