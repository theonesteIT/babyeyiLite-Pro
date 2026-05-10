import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { ClipboardCheck, Fingerprint, Radio } from 'lucide-react';

export default function RepresentativeAttendance() {
  return (
    <RepresentativeHeroShell
      eyebrow="Smart attendance"
      title="Attendance"
      subtitle="RFID, biometric, teacher, boarding, and bus attendance with chronic absenteeism analytics."
      HeroIcon={ClipboardCheck}
      kpiTiles={[
        { key: 'o', label: 'Overall rate', value: '94.2%', icon: ClipboardCheck },
        { key: 'bio', label: 'Biometric coverage', value: '88%', icon: Fingerprint },
        { key: 'bus', label: 'Bus check-ins', value: 'Live', icon: Radio },
        { key: 'late', label: 'Late arrivals today', value: '3.1%', icon: ClipboardCheck },
      ]}
      pageBody={
        <>
          <RepSection title="Chronic absenteeism">
            <RepCardGrid>
              <RepStatCard label="Students flagged (>10%)" value="412" hint="Intervention workflows" tone="warn" />
              <RepStatCard label="Class ranking (network)" value="S3 Sci · GS Kimironko" hint="Best week-over-week improvement" />
              <RepStatCard label="Teacher absence alerts" value="7" hint="Auto substitute requests" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Hardware & channels">
            <div className="grid gap-4 lg:grid-cols-2">
              <RepListCard
                title="RFID / biometric"
                rows={[
                  { label: 'Readers online', value: '186 / 192' },
                  { label: 'Firmware drift', value: '2 sites' },
                ]}
              />
              <RepListCard
                title="Boarding & night roll"
                rows={[
                  { label: 'Dormitories reporting', value: '28' },
                  { label: 'Missed night counts', value: '0' },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
