import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { FileSearch, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RepresentativeInspections() {
  return (
    <RepresentativeHeroShell
      eyebrow="Inspection & compliance"
      title="Inspections"
      subtitle="Hygiene, infrastructure, capacity, teacher qualifications, MINEDUC tracking, and safety logs."
      HeroIcon={FileSearch}
      kpiTiles={[
        { key: 's', label: 'Safe', value: '34', icon: CheckCircle2 },
        { key: 'n', label: 'Needs attention', value: '10', icon: AlertCircle },
        { key: 'c', label: 'Critical', value: '4', icon: AlertCircle },
        { key: 'm', label: 'MINEDUC tasks', value: '18 open', icon: FileSearch },
      ]}
      pageBody={
        <>
          <RepSection title="Status indicators (sample)">
            <RepCardGrid>
              <RepStatCard label="Classroom capacity" value="Overcrowding 3 sites" hint="Fire egress review" tone="warn" />
              <RepStatCard label="Teacher qualification check" value="96% valid" hint="Expiry reminders enabled" />
              <RepStatCard label="Infrastructure" value="Roofing · 2 tickets" hint="Government grant alignment" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Inspection reports">
            <RepListCard
              title="Latest filings"
              rows={[
                { label: 'Hygiene · GS Nyamirambo', value: 'Safe' },
                { label: 'Laboratory safety · TVET Rubavu', value: 'Needs attention' },
                { label: 'Dormitory fire drill · INES', value: 'Critical follow-up' },
              ]}
            />
          </RepSection>
        </>
      }
    />
  );
}
