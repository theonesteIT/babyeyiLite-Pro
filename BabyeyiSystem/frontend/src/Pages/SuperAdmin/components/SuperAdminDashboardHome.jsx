/**
 * SuperAdminDashboardHome — KPI cards + charts (School Manager style, navy + amber only)
 */
import {
  School,
  Users,
  Flag,
  MapPin,
  AlertTriangle,
  Bell,
  ArrowUpRight,
  Activity,
  TrendingUp,
  PlusCircle,
  DollarSign,
  FileText,
  GraduationCap,
  Fingerprint,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { BABYEYI_FONT_STACK } from '../../../theme/babyeyiDashboardTheme';
import { HBarChart, LineAreaChart } from '../../School Manager/components/UI';
import SuperAdminDashboardSchoolPeek from '../SmartAccess/SuperAdminDashboardSchoolPeek';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function KpiCard({ icon: Icon, label, value, sub, highlight, alert, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all hover:shadow-md active:scale-[0.98] w-full ${
        alert
          ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/90'
          : highlight
            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/80'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            alert || highlight ? 'bg-amber-400' : 'bg-amber-50'
          }`}
        >
          <Icon className={`w-4 h-4 ${alert || highlight ? 'text-[#000435]' : 'text-amber-600'}`} />
        </div>
        {onClick && <ArrowUpRight className="w-4 h-4 text-amber-700 shrink-0 opacity-60" />}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-[#000435] tabular-nums">{value ?? '—'}</p>
      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub ? <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p> : null}
    </button>
  );
}

export default function SuperAdminDashboardHome({
  counts,
  setPage,
  user,
  navigate,
  parentUpgradeStats = { total_accounts: 0, upgraded_accounts: 0, recent: [] },
  webhookAlertRed = 0,
  unmatchedYellow = 0,
}) {
  const platformBarData = [
    { label: 'Schools', value: counts.schools ?? 0, color: '#fbbf24' },
    { label: 'School Admins', value: counts.admins ?? 0, color: '#000435' },
    { label: 'NESA Admins', value: counts.nesa ?? 0, color: '#d97706' },
    { label: 'DEO Officers', value: counts.deo ?? 0, color: '#000435' },
    { label: 'Platform Users', value: counts.total ?? 0, color: '#fbbf24' },
  ].filter((d) => d.value > 0);

  const barChartData =
    platformBarData.length > 0
      ? platformBarData
      : [
          { label: 'Schools', value: 0, color: '#fbbf24' },
          { label: 'NESA', value: 0, color: '#000435' },
          { label: 'DEO', value: 0, color: '#d97706' },
        ];

  const monthIdx = new Date().getMonth();
  const monthlyActivity = MONTH_LABELS.map((label, i) => ({
    label,
    value: i === monthIdx ? Math.max(counts.schools ?? 0, 1) : 0,
  }));

  const kpiCards = [
    { icon: School, label: 'Schools', value: counts.schools, onClick: () => setPage('schools') },
    { icon: Users, label: 'School Admins', value: counts.admins, onClick: () => setPage('admins') },
    { icon: Flag, label: 'NESA Admins', value: counts.nesa, onClick: () => setPage('nesa') },
    { icon: MapPin, label: 'DEO Officers', value: counts.deo, onClick: () => setPage('deo') },
    {
      icon: AlertTriangle,
      label: 'Webhook Errors',
      value: webhookAlertRed,
      sub: webhookAlertRed > 0 ? 'Needs reconciliation' : 'Healthy',
      alert: webhookAlertRed > 0,
      onClick: () => setPage('parents-control-payments'),
    },
    {
      icon: Bell,
      label: 'Unmatched Webhooks',
      value: unmatchedYellow,
      sub: unmatchedYellow > 0 ? 'Check references' : 'All matched',
      highlight: unmatchedYellow > 0,
      onClick: () => setPage('parents-control-payments'),
    },
  ];

  const quickActions = [
    { icon: PlusCircle, label: 'Register School', action: () => navigate('/add-school') },
    { icon: DollarSign, label: 'Set Prices', action: () => navigate('/manage-requirements-prices') },
    { icon: FileText, label: 'Prices List', action: () => navigate('/requirement-prices-list') },
    { icon: GraduationCap, label: 'Student Smart Access', action: () => navigate('/superadmin/smart-access/students') },
    { icon: Fingerprint, label: 'Staff Smart Access', action: () => navigate('/superadmin/smart-access/staff') },
    { icon: Flag, label: 'NESA Admins', action: () => setPage('nesa') },
    { icon: MapPin, label: 'DEO Officers', action: () => setPage('deo') },
    { icon: UserCheck, label: 'Parent Accounts', action: () => setPage('parents-control-accounts') },
  ];

  return (
    <div className="space-y-4 sm:space-y-5" style={{ fontFamily: BABYEYI_FONT_STACK }}>
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
        <time
          dateTime={new Date().toISOString().slice(0, 10)}
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-[#000435]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-[#000435] tracking-tight">
          Welcome, {user?.first_name || 'Super Admin'}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          Edupoto Suite · Full system access · Session-secured
        </p>
        <div className="mt-2 h-1 w-12 rounded-full bg-amber-400" />
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#000435]">
            <Users className="w-3.5 h-3.5 text-amber-600" />
            {counts.total} platform users
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-[#000435]">
            <Flag className="w-3.5 h-3.5 text-[#000435]" />
            {counts.nesa} NESA
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#000435]">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            {counts.deo} DEO
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {kpiCards.map((card, i) => (
          <KpiCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm mb-4">
            <Activity className="w-4 h-4 text-amber-500 shrink-0" />
            Platform Overview
          </h3>
          <HBarChart data={barChartData} labelKey="label" valueKey="value" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
          <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm mb-4">
            <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
            Activity Snapshot
          </h3>
          <LineAreaChart
            data={monthlyActivity}
            labelKey="label"
            valueKey="value"
            color="#fbbf24"
            height={180}
          />
          <p className="text-[10px] text-slate-400 text-center mt-2">Schools registered · current year</p>
        </div>
      </div>

      <SuperAdminDashboardSchoolPeek navigate={navigate} />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-bold text-[#000435] text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-500" />
            Parent portal upgrades
          </h3>
          <span className="text-xs font-semibold text-amber-800">
            {parentUpgradeStats.upgraded_accounts || 0} upgraded / {parentUpgradeStats.total_accounts || 0} total
          </span>
        </div>
        {!parentUpgradeStats.recent?.length ? (
          <p className="text-xs text-slate-500">No parent portal accounts yet.</p>
        ) : (
          <div className="space-y-2">
            {parentUpgradeStats.recent.slice(0, 6).map((p) => {
              const name = p.father_full_name || p.mother_full_name || 'Parent';
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#000435] truncate">{name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{p.phone}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      p.created_via_phone_only
                        ? 'bg-amber-100 text-[#000435] border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {p.created_via_phone_only ? 'Completed' : 'Direct'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
        <h3 className="font-bold text-[#000435] mb-3 text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {quickActions.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="p-4 rounded-2xl border border-slate-200 bg-white text-center transition-all active:scale-95 hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-sm"
            >
              <Icon className="mx-auto mb-2 w-5 h-5 text-[#000435]" />
              <p className="text-xs font-bold text-[#000435]">{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#000435] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#000435]">Secure Session Active</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Authenticated as <strong>{user?.email}</strong> via httpOnly cookie. No tokens in browser storage.
          </p>
        </div>
      </div>
    </div>
  );
}
