import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard } from '../components/RepContentCard';
import { Sparkles, Brain, LineChart } from 'lucide-react';

export default function RepresentativeInsights() {
  return (
    <RepresentativeHeroShell
      eyebrow="AI-powered insights"
      title="AI insights"
      subtitle="Explainable models across attendance, finance, marks, and welfare — tuned for Rwanda school realities."
      HeroIcon={Sparkles}
      kpiTiles={[
        { key: 'm', label: 'Models active', value: '6', icon: Brain },
        { key: 'c', label: 'Confidence avg', value: '0.81', icon: LineChart },
        { key: 'f', label: 'Flags this week', value: '27', icon: Sparkles },
        { key: 'h', label: 'Human reviews done', value: '19', icon: Sparkles },
      ]}
      pageBody={
        <>
          <RepSection title="What the network sees">
            <RepCardGrid>
              <RepStatCard
                label="Exam performance prediction"
                value="S3 Science basket"
                hint="Downside risk if teacher absence stays above 8% for two weeks."
                tone="warn"
              />
              <RepStatCard label="Fee fraud risk" value="Low" hint="Anomaly detection on duplicate receipts" />
              <RepStatCard label="Student risk (welfare)" value="14 students" hint="Counsellor routing suggested" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Responsible AI">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 text-sm text-re-text-muted leading-relaxed ring-1 ring-black/[0.04]">
              Predictions are advisory. Final decisions stay with school leadership and ministry procedures. Audit trails are
              retained per school for transparency and appeals.
            </div>
          </RepSection>
        </>
      }
    />
  );
}
