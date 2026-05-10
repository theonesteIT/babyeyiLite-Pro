import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard, RepListCard } from '../components/RepContentCard';
import { useRepresentativeData } from '../context/RepresentativeContext';
import {
  Building2,
  Users,
  UserCheck,
  Wallet,
  TrendingUp,
  Activity,
  Shield,
  Bus,
  Radio,
  Loader2,
} from 'lucide-react';

const formatRwf = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return `RWF ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(1)}K`;
  return `RWF ${v.toLocaleString()}`;
};

export default function RepresentativeDashboard() {
  const { schools, summary, loading, activeSchool, error, refresh } = useRepresentativeData();

  const scope = activeSchool ? 'this school' : 'the network';

  const kpis = [
    { key: 's', label: 'Schools registered', value: summary ? summary.schools : schools.length || 0, icon: Building2 },
    { key: 'a', label: 'Active schools', value: summary ? summary.active_schools : 0, icon: Activity },
    { key: 'st', label: 'Total students', value: summary ? Number(summary.students).toLocaleString() : 0, icon: Users },
    { key: 't', label: 'Staff', value: summary ? Number(summary.staff).toLocaleString() : 0, icon: UserCheck },
    { key: 'r', label: 'Fees collected', value: summary ? formatRwf(summary.fee_collected_rwf) : 'RWF 0', icon: Wallet },
    { key: 'p', label: 'Pending fees', value: summary ? formatRwf(summary.fee_pending_rwf) : 'RWF 0', icon: TrendingUp },
    { key: 'att', label: 'Attendance rate', value: '—', icon: Radio, subValue: 'Wire when ready' },
    { key: 'd', label: 'Discipline score', value: '—', icon: Shield, subValue: 'Wire when ready' },
  ];

  return (
    <RepresentativeHeroShell
      onRefresh={refresh}
      eyebrow={activeSchool ? `Focused on ${activeSchool.school_name}` : 'Babyeyi Rwanda · National oversight'}
      title="School representative dashboard"
      subtitle="Real-time monitoring · Finance transparency · Student safety · Government-ready reporting"
      HeroIcon={Building2}
      headerRight={
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/35">
            {loading ? (
              <Loader2 size={12} className="animate-spin mr-1.5" />
            ) : null}
            {loading ? 'Syncing' : 'Live sync'}
          </span>
          <span className="inline-flex items-center rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FEBF10] ring-1 ring-[#FEBF10]/55">
            {schools.length} schools
          </span>
        </div>
      }
      kpiTiles={kpis}
      pageBody={
        <>
          {error ? (
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mb-4">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            </div>
          ) : null}

          <RepSection
            title={`Today across ${scope}`}
            subtitle="Operational pulse for owners, cooperatives, and education groups managing multiple sites."
          >
            <RepCardGrid>
              <RepStatCard icon={Users} label="Students" value={summary ? Number(summary.students).toLocaleString() : '—'} hint="From assigned schools" />
              <RepStatCard icon={UserCheck} label="Staff" value={summary ? Number(summary.staff).toLocaleString() : '—'} hint="All non-parent / non-student users" />
              <RepStatCard icon={Wallet} label="Fees collected" value={summary ? formatRwf(summary.fee_collected_rwf) : '—'} hint="Babyeyi paid invoices" />
              <RepStatCard icon={TrendingUp} label="Pending fees" value={summary ? formatRwf(summary.fee_pending_rwf) : '—'} hint="Open Babyeyi invoices" tone="warn" />
              <RepStatCard icon={Activity} label="Active schools" value={summary ? summary.active_schools : '—'} hint="School access status" />
              <RepStatCard icon={Bus} label="Bus routes" value="—" hint="Wire when transport API is ready" />
            </RepCardGrid>
          </RepSection>

          <RepSection
            title="My schools"
            subtitle="Assigned by Super Admin. Use the school switcher in the top bar to focus on one school."
          >
            {loading ? (
              <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-sm text-re-text-muted">
                <Loader2 className="mx-auto mb-2 animate-spin" size={20} /> Loading…
              </div>
            ) : schools.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-semibold text-amber-800">
                You don't have any schools assigned yet. Ask the Super Admin to assign your schools.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {schools.slice(0, 9).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm hover:shadow-md transition-shadow ring-1 ring-black/[0.04]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center ring-1 ring-amber-400/35">
                        <Building2 size={18} className="text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#000435] truncate">{s.school_name}</p>
                        <p className="text-[11px] text-re-text-muted truncate">
                          {s.school_code || '—'}
                          {s.district ? ` · ${s.district}` : ''}
                        </p>
                        {s.is_primary ? (
                          <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">
                            Primary
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </RepSection>

          <RepSection
            title="AI insights (preview)"
            subtitle="Predictive signals will combine attendance, marks, and behaviour for the schools you manage."
          >
            <div className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#000435] to-[#00052a] p-6 text-white shadow-lg ring-1 ring-white/10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">Model output · sample</p>
              <p className="mt-3 text-sm text-white/85 leading-relaxed max-w-3xl">
                Once attendance and exam data is wired, this section will surface schools and cohorts that need support
                before national exams.
              </p>
            </div>
          </RepSection>

          <RepListCard
            title="Quick channels"
            rows={[
              { label: 'SMS gateway', value: 'OK' },
              { label: 'Email dispatch', value: 'OK' },
              { label: 'WhatsApp Business API', value: 'Connect' },
              { label: 'Push notifications', value: 'Enabled' },
            ]}
          />
        </>
      }
    />
  );
}
