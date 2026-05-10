import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { Bus, MapPin } from 'lucide-react';

export default function RepresentativeTransport() {
  return (
    <RepresentativeHeroShell
      eyebrow="Transport & boarding"
      title="Transport"
      subtitle="Bus tracking, boarding attendance, dormitory monitoring, meals, and visitor logs."
      HeroIcon={Bus}
      kpiTiles={[
        { key: 'r', label: 'Routes live', value: '128', icon: Bus },
        { key: 'd', label: 'Delays now', value: '3', icon: Bus },
        { key: 'b', label: 'Boarding occupancy', value: '84%', icon: Bus },
        { key: 'v', label: 'Visitor logs (today)', value: '126', icon: Bus },
      ]}
      pageBody={
        <>
          <RepSection title="Fleet map placeholder">
            <div className="rounded-2xl border border-black/[0.06] bg-[#000435] min-h-[200px] flex items-center justify-center text-amber-400/90 gap-2 ring-1 ring-amber-400/25">
              <MapPin size={22} />
              <span className="text-sm font-bold uppercase tracking-widest">Map / GPS integration region</span>
            </div>
          </RepSection>
          <RepSection title="Operations">
            <RepCardGrid>
              <RepStatCard label="Meal service compliance" value="98%" hint="Boarding kitchens reporting" />
              <RepStatCard label="Night attendance" value="Complete" hint="Last round 23:45" />
              <RepStatCard label="Bus maintenance due" value="6 vehicles" hint="Within 14 days" tone="warn" />
            </RepCardGrid>
            <div className="mt-6">
              <RepListCard
                title="Route exceptions"
                rows={[
                  { label: 'KGL-04 · traffic', value: '18 min late' },
                  { label: 'Southern loop · weather hold', value: 'Monitoring' },
                ]}
              />
            </div>
          </RepSection>
        </>
      }
    />
  );
}
