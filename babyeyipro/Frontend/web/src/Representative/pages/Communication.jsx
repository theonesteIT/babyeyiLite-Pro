import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { MessageSquare, Megaphone, AlertTriangle } from 'lucide-react';

export default function RepresentativeCommunication() {
  return (
    <RepresentativeHeroShell
      eyebrow="Communication center"
      title="Communication"
      subtitle="Announcements, parent messaging, broadcasts, emergency channels, circulars, and integrations."
      HeroIcon={MessageSquare}
      kpiTiles={[
        { key: 'a', label: 'Announcements (week)', value: '42', icon: Megaphone },
        { key: 'p', label: 'Parent threads open', value: '128', icon: MessageSquare },
        { key: 'e', label: 'Emergency tests (YTD)', value: '6', icon: AlertTriangle },
        { key: 'd', label: 'Delivery success', value: '99.1%', icon: MessageSquare },
      ]}
      pageBody={
        <>
          <RepSection title="Channels">
            <RepCardGrid>
              <RepStatCard label="SMS gateway" value="Healthy" hint="Latency 120ms p95" />
              <RepStatCard label="Email" value="Queued 34" hint="Burst protection on" />
              <RepStatCard label="WhatsApp API" value="Connected" hint="Template approvals synced" />
            </RepCardGrid>
          </RepSection>
          <RepSection title="Broadcast composer (UI shell)">
            <div className="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm ring-1 ring-black/[0.04] space-y-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#000435]">Audience</label>
              <div className="flex flex-wrap gap-2">
                {['All parents', 'Single school', 'Province', 'Staff only'].map((x) => (
                  <button
                    key={x}
                    type="button"
                    className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold text-[#000435] hover:bg-amber-50 hover:border-amber-400/40 transition-colors"
                  >
                    {x}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-slate-200 p-4 text-sm text-[#000435] outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/50"
                placeholder="Compose emergency or routine message…"
                readOnly
              />
            </div>
          </RepSection>
          <RepSection title="Internal staff chat">
            <RepListCard
              title="Rooms"
              rows={[
                { label: '#network-ops', value: '24 online' },
                { label: '#finance-leads', value: '9 online' },
              ]}
            />
          </RepSection>
        </>
      }
    />
  );
}
