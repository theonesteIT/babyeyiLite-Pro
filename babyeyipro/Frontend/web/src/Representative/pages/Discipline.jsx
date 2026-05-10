import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { ShieldAlert } from 'lucide-react';

export default function RepresentativeDiscipline() {
  return (
    <RepresentativeHeroShell
      eyebrow="Discipline & student welfare"
      title="Discipline"
      subtitle="Cases, counselling, bullying, parent complaints, risk signals, and boarding monitoring."
      HeroIcon={ShieldAlert}
      kpiTiles={[
        { key: 'o', label: 'Open cases', value: '38', icon: ShieldAlert },
        { key: 'b', label: 'Bullying reports', value: '12', icon: ShieldAlert },
        { key: 'c', label: 'Counselling sessions', value: '640 / mo', icon: ShieldAlert },
        { key: 'r', label: 'Risk detections', value: '4', icon: ShieldAlert },
      ]}
      pageBody={
        <>
          <RepSection title="Welfare pipeline">
            <RepCardGrid>
              <RepStatCard label="Boarding night checks" value="OK" hint="Last sync 4 min ago" />
              <RepStatCard label="Student movement logs" value="Live" hint="Gate + RFID correlation" />
              <RepStatCard label="Parent complaints SLA" value="92%" hint="Within 48h first response" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Recent escalations">
            <RepListCard
              title="Priority"
              rows={[
                { label: 'Violence case · GS Remera', value: 'Investigating' },
                { label: 'Peer conflict cluster · P4', value: 'Counsellor assigned' },
                { label: 'Anonymous tip · substance', value: 'Critical' },
              ]}
            />
          </RepSection>
        </>
      }
    />
  );
}
