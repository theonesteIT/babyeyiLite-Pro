import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { BarChart3 } from 'lucide-react';

export default function RepresentativeAnalytics() {
  return (
    <RepresentativeHeroShell
      eyebrow="Performance intelligence"
      title="School performance analytics"
      subtitle="Rankings, pass rates, discipline, attendance heatmaps, and dropout signals for national-level oversight."
      HeroIcon={BarChart3}
      kpiTiles={[
        { key: 'b', label: 'Top decile schools', value: '12', icon: BarChart3 },
        { key: 'w', label: 'Watch list', value: '7', icon: BarChart3 },
        { key: 'e', label: 'National exam pass', value: '81.4%', icon: BarChart3 },
        { key: 'dr', label: 'Dropout risk index', value: 'Low', icon: BarChart3 },
      ]}
      pageBody={
        <>
          <RepSection
            title="Charts (placeholder layout)"
            subtitle="Drop in Recharts or your analytics stack — spacing is tuned for heatmaps and multi-series trends."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-dashed border-amber-400/50 bg-white p-8 min-h-[220px] flex items-center justify-center text-center">
                <div>
                  <p className="text-sm font-bold text-[#000435]">Monthly student growth · fee collection</p>
                  <p className="text-xs text-re-text-muted mt-2">Dual-axis chart region</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-[#000435]/25 bg-white p-8 min-h-[220px] flex items-center justify-center text-center">
                <div>
                  <p className="text-sm font-bold text-[#000435]">Attendance heatmap</p>
                  <p className="text-xs text-re-text-muted mt-2">By school × weekday</p>
                </div>
              </div>
            </div>
          </RepSection>
          <RepSection title="League tables">
            <RepCardGrid>
              <RepStatCard label="Best performing (composite)" value="GS Kimisagara" hint="Attendance + marks + discipline" />
              <RepStatCard label="Weak performing (support)" value="EP Sector 3" hint="Intervention playbook suggested" tone="warn" />
              <RepStatCard label="Student growth YoY" value="+6.8%" hint="Net new admissions minus transfers out" />
            </RepCardGrid>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <RepListCard
                title="Discipline trend"
                rows={[
                  { label: 'Serious incidents', value: '-12% MoM' },
                  { label: 'Bullying reports', value: '18 open' },
                  { label: 'Counselling sessions', value: '240 / week' },
                ]}
              />
              <RepListCard
                title="Academic performance"
                rows={[
                  { label: 'STEM basket avg', value: '72.4%' },
                  { label: 'Languages basket', value: '68.1%' },
                  { label: 'Weak subjects (network)', value: 'Mathematics P6' },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
