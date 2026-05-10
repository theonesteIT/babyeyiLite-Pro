import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { Wallet, FileDown } from 'lucide-react';

export default function RepresentativeFinance() {
  return (
    <RepresentativeHeroShell
      eyebrow="Financial control center"
      title="Finance"
      subtitle="Revenue, expenses, salaries, mobile money, bank flows, and audit-ready exports."
      HeroIcon={Wallet}
      kpiTiles={[
        { key: 'rev', label: 'Network revenue (Q)', value: 'RWF 1.05B', icon: Wallet },
        { key: 'exp', label: 'Operating expenses', value: 'RWF 612M', icon: Wallet },
        { key: 'out', label: 'Outstanding balances', value: 'RWF 186M', icon: Wallet },
        { key: 'cf', label: 'Cash flow health', value: 'Strong', icon: Wallet },
      ]}
      pageBody={
        <>
          <RepSection
            title="Transparency & exports"
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
              <RepStatCard label="Mobile money share" value="61%" hint="MTN · Airtel · aggregated per school" />
              <RepStatCard label="Bank settlements" value="RWF 318M" hint="Reconciled last 48h" />
              <RepStatCard label="Salary monitoring" value="On track" hint="2 anomalies flagged for review" tone="warn" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Profit / loss snapshot">
            <div className="grid gap-4 lg:grid-cols-2">
              <RepListCard
                title="Budget vs actual (sample)"
                rows={[
                  { label: 'Instruction materials', value: '94%' },
                  { label: 'Utilities', value: '108%' },
                  { label: 'Transport', value: '101%' },
                  { label: 'Boarding meals', value: '89%' },
                ]}
              />
              <RepListCard
                title="Daily transactions"
                rows={[
                  { label: 'Posted today', value: '1,842' },
                  { label: 'Pending approval', value: '36' },
                  { label: 'Fraud watch rules', value: '12 active' },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
