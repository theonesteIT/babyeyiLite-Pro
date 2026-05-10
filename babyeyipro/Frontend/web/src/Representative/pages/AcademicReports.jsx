import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { GraduationCap } from 'lucide-react';

export default function RepresentativeAcademic() {
  return (
    <RepresentativeHeroShell
      eyebrow="Academic management"
      title="Academic reports"
      subtitle="Curriculum tracking, timetables, exam reports, predictions, and teacher productivity across schools."
      HeroIcon={GraduationCap}
      kpiTiles={[
        { key: 'c', label: 'Classes monitored', value: '1,204', icon: GraduationCap },
        { key: 'e', label: 'Exam cycles', value: '18', icon: GraduationCap },
        { key: 'tp', label: 'Teacher productivity', value: 'High', icon: GraduationCap },
        { key: 'pred', label: 'AI prediction coverage', value: '76%', icon: GraduationCap },
      ]}
      pageBody={
        <>
          <RepSection title="National exam readiness">
            <RepCardGrid>
              <RepStatCard label="Mock participation" value="97%" hint="All active secondaries" />
              <RepStatCard label="Top students (network)" value="420" hint="Tracked for scholarships" />
              <RepStatCard label="Weak subjects" value="Math · Physics" hint="Cross-school intervention packs" tone="warn" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Timetable & curriculum health">
            <div className="grid gap-4 lg:grid-cols-2">
              <RepListCard
                title="Timetable conflicts"
                rows={[
                  { label: 'Unresolved overlaps', value: '14' },
                  { label: 'Substitute coverage', value: '92%' },
                ]}
              />
              <RepListCard
                title="Exam reports"
                rows={[
                  { label: 'Published this term', value: '156' },
                  { label: 'Pending sign-off', value: '9' },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
