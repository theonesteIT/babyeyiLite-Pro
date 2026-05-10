import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { Settings, Users, Shield } from 'lucide-react';

export default function RepresentativeSettings() {
  return (
    <RepresentativeHeroShell
      eyebrow="User & role management"
      title="Settings"
      subtitle="Managers, approvals, permissions, roles, login activity, and device posture for the representative workspace."
      HeroIcon={Settings}
      kpiTiles={[
        { key: 'm', label: 'School managers', value: '96', icon: Users },
        { key: 'p', label: 'Pending school approvals', value: '3', icon: Shield },
        { key: 'r', label: 'Custom roles', value: '8', icon: Settings },
        { key: 'd', label: 'Devices tracked', value: '214', icon: Shield },
      ]}
      pageBody={
        <>
          <RepSection title="Access governance">
            <RepCardGrid>
              <RepStatCard label="MFA enforcement" value="On" hint="Representative tier required" />
              <RepStatCard label="Login anomalies (7d)" value="2" hint="Geo velocity checks" tone="warn" />
              <RepStatCard label="API keys (integrations)" value="4 active" hint="Rotate in 30 days" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Activity">
            <RepListCard
              title="Recent logins"
              rows={[
                { label: 'U. Mukamana · Kigali', value: 'Today 08:12' },
                { label: 'J. Nkurunziza · Web', value: 'Yesterday' },
              ]}
            />
          </RepSection>
        </>
      }
    />
  );
}
