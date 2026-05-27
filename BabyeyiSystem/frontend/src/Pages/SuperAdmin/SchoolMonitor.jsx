import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, MapPin, Activity, AlertTriangle, ShieldOff,
  LogIn, School, ChevronRight, Search, RefreshCw, Eye, Ban, Unlock,
  LogOut, Lock, BarChart3, Radio, Bell, X, Loader2, Menu,
} from 'lucide-react';
import { SUPER_ADMIN_DASHBOARD_PATH } from './components/superAdminNavConfig';
import { BABYEYI_FONT_STACK } from '../../theme/babyeyiDashboardTheme';
import {
  fetchMonitorOverview, fetchProvinces, fetchDistricts, fetchHierarchySectors,
  fetchHierarchySchools, fetchSchoolPanel, fetchSchoolUsers, fetchUserDetail,
  postUserAction, fetchLiveUsers, fetchSuspicious, fetchAnalytics, fetchAlerts,
  fetchDisabledUsers, fetchMapData,
} from './services/schoolMonitoringService';

const NAVY = '#000435';
const AMBER = '#fbbf24';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'schools', label: 'Schools', icon: School },
  { id: 'live', label: 'Live Users', icon: Radio },
  { id: 'activities', label: 'Activities', icon: BarChart3 },
  { id: 'security', label: 'Security', icon: AlertTriangle },
  { id: 'disabled', label: 'Disabled', icon: ShieldOff },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const STATUS_STYLES = {
  online: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  idle: 'bg-amber-100 text-amber-900 border-amber-200',
  offline: 'bg-slate-100 text-slate-600 border-slate-200',
  suspicious: 'bg-red-100 text-red-800 border-red-200',
  disabled: 'bg-slate-800 text-white border-slate-700',
  locked: 'bg-red-50 text-red-700 border-red-300',
};

function StatusPill({ status }) {
  const key = String(status || 'offline').toLowerCase();
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[key] || STATUS_STYLES.offline}`}>
      {status}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-amber-600" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#000435] tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function UserDrawer({ userId, onClose, onActionDone }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [selectedOp, setSelectedOp] = useState(null);

  const load = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    fetchUserDetail(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async (action) => {
    if (!userId || acting) return;
    setActing(action);
    try {
      await postUserAction(userId, action);
      onActionDone?.();
      load();
    } catch (e) {
      alert(e.message || 'Action failed');
    } finally {
      setActing('');
    }
  };

  const p = data?.profile;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200" style={{ background: NAVY }}>
          <h2 className="text-white font-bold text-sm">User monitoring</h2>
          <button type="button" onClick={onClose} className="text-amber-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#000435]" /></div>
          )}
          {!loading && p && (
            <>
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-lg font-bold text-[#000435]">
                  {p.name?.slice(0, 2)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#000435] text-lg">{p.name}</h3>
                  <p className="text-sm text-slate-600">{p.role} · {p.school}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusPill status={p.status} />
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">{p.product}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Email', p.email || '—'],
                  ['Phone', p.phone || '—'],
                  ['Last login', p.lastLogin ? new Date(p.lastLogin).toLocaleString() : '—'],
                  ['IP', p.ip || '—'],
                  ['Device', p.device || '—'],
                  ['Last activity', p.lastActivity ? new Date(p.lastActivity).toLocaleString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                    <p className="text-slate-500 font-medium">{k}</p>
                    <p className="text-[#000435] font-semibold truncate">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'disable', label: 'Disable', icon: Ban },
                  { id: 'enable', label: 'Enable', icon: Unlock },
                  { id: 'force_logout', label: 'Force logout', icon: LogOut },
                  { id: 'lock', label: 'Lock', icon: Lock },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!!acting}
                    onClick={() => runAction(id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <Icon className="w-3.5 h-3.5" /> {acting === id ? '…' : label}
                  </button>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#000435] mb-3">Activity timeline</h4>
                <div className="space-y-0 border-l-2 border-amber-200 ml-2 pl-4">
                  {(data.timeline || []).map((t, i) => (
                    <div key={i} className="relative pb-4">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white" />
                      <p className="text-xs font-semibold text-[#000435]">{t.action}</p>
                      <p className="text-[10px] text-slate-500">{t.module} · {new Date(t.time).toLocaleString()}</p>
                    </div>
                  ))}
                  {!data.timeline?.length && <p className="text-xs text-slate-500">No activity recorded yet.</p>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#000435] mb-2">Operations</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(data.operations || []).slice(0, 15).map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedOp(op)}
                      className="w-full text-left rounded-lg border border-slate-100 p-2 hover:border-amber-300 text-xs"
                    >
                      <span className="font-semibold text-[#000435]">{op.action_type}</span>
                      <span className="text-slate-500"> · {op.module}</span>
                    </button>
                  ))}
                </div>
              </div>
              {selectedOp && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1">
                  <p className="font-bold text-[#000435]">Action details</p>
                  <p><strong>Type:</strong> {selectedOp.action_type}</p>
                  <p><strong>Module:</strong> {selectedOp.module}</p>
                  <p><strong>Before:</strong> {selectedOp.before_value || '—'}</p>
                  <p><strong>After:</strong> {selectedOp.after_value || '—'}</p>
                  <p><strong>Risk:</strong> {selectedOp.risk_level}</p>
                  <p><strong>IP:</strong> {selectedOp.ip_address}</p>
                  <p><strong>Time:</strong> {new Date(selectedOp.created_at).toLocaleString()}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-[#000435] mb-2">Activity replay</h4>
                <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                  {(data.replay || []).map((r, i) => (
                    <li key={i}>{r.action || r.step}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchoolMonitor() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [sectorCards, setSectorCards] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolPanel, setSchoolPanel] = useState(null);
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [disabled, setDisabled] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const refreshCore = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [ov, al, pr] = await Promise.all([
        fetchMonitorOverview(),
        fetchAlerts(),
        fetchProvinces(),
      ]);
      setOverview(ov.cards);
      setAlerts(al.alerts || []);
      setProvinces(pr.data || []);
    } catch (e) {
      if (!silent) console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCore(false);
    const t = setInterval(() => refreshCore(true), 60000);
    return () => clearInterval(t);
  }, [refreshCore]);

  useEffect(() => {
    fetchDistricts(province).then((r) => setDistricts(r.data || [])).catch(() => setDistricts([]));
    setDistrict('');
    setSector('');
  }, [province]);

  useEffect(() => {
    if (!district) {
      setSectorCards([]);
      setSchools([]);
      return;
    }
    fetchHierarchySectors(district).then((r) => setSectorCards(r.data || [])).catch(() => setSectorCards([]));
  }, [district]);

  useEffect(() => {
    if (!district) return;
    const params = { district };
    if (sector) params.sector = sector;
    fetchHierarchySchools(params).then((r) => setSchools(r.data || [])).catch(() => setSchools([]));
  }, [district, sector]);

  useEffect(() => {
    if (!selectedSchool?.id) {
      setSchoolPanel(null);
      setSchoolUsers([]);
      return;
    }
    fetchSchoolPanel(selectedSchool.id).then((r) => setSchoolPanel(r.school)).catch(() => setSchoolPanel(null));
    fetchSchoolUsers(selectedSchool.id).then((r) => setSchoolUsers(r.users || [])).catch(() => setSchoolUsers([]));
  }, [selectedSchool]);

  useEffect(() => {
    if (tab === 'live') fetchLiveUsers().then((r) => setLiveUsers(r.users || [])).catch(() => setLiveUsers([]));
    if (tab === 'analytics') fetchAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    if (tab === 'disabled') fetchDisabledUsers().then((r) => setDisabled(r.users || [])).catch(() => setDisabled([]));
    if (tab === 'security') fetchSuspicious().then((r) => setSuspicious(r.data || [])).catch(() => setSuspicious([]));
    if (tab === 'overview') fetchMapData().then((r) => setMapData(r.districts || [])).catch(() => setMapData([]));
  }, [tab]);

  const filteredSchoolUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schoolUsers;
    return schoolUsers.filter((u) =>
      `${u.name} ${u.role} ${u.email} ${u.ip}`.toLowerCase().includes(q)
    );
  }, [schoolUsers, search]);

  const cards = overview || {};

  const selectTab = (id) => {
    setTab(id);
    setNavOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-50 text-[#000435]"
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <header className="flex-shrink-0 flex flex-col gap-2 px-3 sm:px-4 py-3 bg-[#000435] border-b border-amber-500/30">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="lg:hidden flex-shrink-0 w-10 h-10 rounded-lg border border-amber-400/40 text-amber-300 flex items-center justify-center hover:bg-amber-400/10"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(SUPER_ADMIN_DASHBOARD_PATH)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-400/40 text-amber-300 text-xs font-semibold hover:bg-amber-400/10 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm sm:text-base truncate">School Monitoring</h1>
              <p className="text-amber-200/80 text-[10px] sm:text-[11px] truncate">Schools · users · logins · lite & pro</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAlertsOpen((o) => !o)}
              className="xl:hidden relative w-10 h-10 rounded-lg border border-amber-400/40 text-amber-300 flex items-center justify-center hover:bg-amber-400/10"
              aria-label="Alerts"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[#000435] text-[9px] font-bold flex items-center justify-center">
                  {alerts.length > 9 ? '9+' : alerts.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => refreshCore(false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 text-[#000435] text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(SUPER_ADMIN_DASHBOARD_PATH)}
          className="sm:hidden w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-amber-400/40 text-amber-300 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Super Admin
        </button>
        {alertsOpen && (
          <div className="xl:hidden rounded-lg border border-amber-400/30 bg-[#000435]/95 p-3 max-h-40 overflow-y-auto space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-lg bg-amber-50/10 border border-amber-400/20 p-2 text-[11px] text-amber-100">
                <p className="font-semibold text-amber-200">{a.title || a.type}</p>
                <p className="text-white/70 mt-0.5">{a.message}</p>
              </div>
            ))}
            {!alerts.length && <p className="text-xs text-amber-200/70">No alerts.</p>}
          </div>
        )}
      </header>

      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="flex-1 flex min-h-0 relative">
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 max-w-[88vw] lg:w-52 flex-shrink-0 bg-[#000435] text-white/80 p-2 overflow-y-auto transition-transform duration-250 ease-out shadow-xl lg:shadow-none ${
            navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-2 mb-1 lg:hidden border-b border-white/10">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Navigation</span>
            <button type="button" onClick={() => setNavOpen(false)} className="text-white/70 hover:text-white p-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-3 lg:py-2.5 rounded-lg text-left text-sm lg:text-xs font-medium mb-0.5 min-h-[44px] ${
                  active ? 'bg-amber-400/20 text-amber-300' : 'hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 min-w-0 w-full lg:w-auto">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
                <Kpi icon={Users} label="Online users" value={cards.onlineUsers ?? 0} />
                <Kpi icon={School} label="Schools online" value={cards.schoolsOnline ?? 0} />
                <Kpi icon={MapPin} label="Active districts" value={cards.activeDistricts ?? 0} />
                <Kpi icon={Activity} label="Activities today" value={cards.activitiesToday ?? 0} />
                <Kpi icon={AlertTriangle} label="Suspicious" value={cards.suspiciousActivities ?? 0} />
                <Kpi icon={ShieldOff} label="Disabled accounts" value={cards.disabledAccounts ?? 0} />
                <Kpi icon={LogIn} label="Logins 24h" value={`${cards.loginSuccess ?? 0} / ${(cards.loginSuccess ?? 0) + (cards.loginFailed ?? 0)}`} sub="success / total" />
                <Kpi icon={Building2} label="Most active school" value={cards.mostActiveSchool || '—'} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold mb-3">Rwanda activity map (by district)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {mapData.map((d) => (
                    <div
                      key={d.district}
                      className={`rounded-lg p-3 border text-xs ${
                        d.activityLevel === 'high' ? 'bg-red-50 border-red-200' :
                        d.activityLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
                        'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <p className="font-bold text-[#000435]">{d.district}</p>
                      <p className="text-slate-600 mt-1">{d.online_users} online · {d.activities} actions</p>
                    </div>
                  ))}
                  {!mapData.length && <p className="text-slate-500 text-sm col-span-full">No district data yet — activity will appear as schools use the system.</p>}
                </div>
              </div>
            </div>
          )}

          {tab === 'schools' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold mb-3">Filter hierarchy</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={province} onChange={(e) => setProvince(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">All provinces</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={district} onChange={(e) => { setDistrict(e.target.value); setSector(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select district</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={sector} onChange={(e) => setSector(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="">All sectors</option>
                    {sectorCards.map((s) => <option key={s.sector} value={s.sector}>{s.sector}</option>)}
                  </select>
                </div>
              </div>

              {district && !sector && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sectorCards.map((s) => (
                    <button
                      key={s.sector}
                      type="button"
                      onClick={() => setSector(s.sector)}
                      className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-400 hover:shadow-md transition-all"
                    >
                      <p className="font-bold text-[#000435]">{s.sector}</p>
                      <p className="text-xs text-slate-600 mt-2">{s.schools} schools · {s.onlineUsers} online</p>
                      <ChevronRight className="w-4 h-4 text-amber-600 mt-2" />
                    </button>
                  ))}
                </div>
              )}

              {district && sector && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="p-3">School</th>
                        <th className="p-3">Online</th>
                        <th className="p-3">Today</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Status</th>
                        <th className="p-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((s) => (
                        <tr key={s.id} className="border-t border-slate-100 hover:bg-amber-50/50">
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3">{s.onlineUsers}</td>
                          <td className="p-3">{s.activitiesToday}</td>
                          <td className="p-3 uppercase text-xs font-bold">{s.product}</td>
                          <td className="p-3"><StatusPill status={s.status === 'Active' ? 'online' : 'idle'} /></td>
                          <td className="p-3">
                            <button type="button" onClick={() => setSelectedSchool(s)} className="text-amber-700 font-semibold text-xs flex items-center gap-1">
                              Open <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedSchool && schoolPanel && (
                <div className="rounded-xl border-2 border-amber-300 bg-white p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-[#000435]">{schoolPanel.name}</h3>
                      <p className="text-sm text-slate-600">{schoolPanel.code} · {schoolPanel.district} · {schoolPanel.sector}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedSchool(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-500">Total users</p><p className="font-bold">{schoolPanel.totalUsers}</p></div>
                    <div className="bg-emerald-50 rounded-lg p-2"><p className="text-slate-500">Online</p><p className="font-bold">{schoolPanel.onlineUsers}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-500">Product</p><p className="font-bold uppercase">{schoolPanel.product}</p></div>
                    <div className="bg-slate-50 rounded-lg p-2"><p className="text-slate-500">Last activity</p><p className="font-bold">{schoolPanel.lastActivity ? new Date(schoolPanel.lastActivity).toLocaleString() : '—'}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-[#000435] text-amber-200 text-left">
                        <tr>
                          <th className="p-2">User</th>
                          <th className="p-2">Role</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Login</th>
                          <th className="p-2">Last activity</th>
                          <th className="p-2">Device</th>
                          <th className="p-2">IP</th>
                          <th className="p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchoolUsers.map((u) => (
                          <tr key={u.id} className="border-t border-slate-100">
                            <td className="p-2 font-medium">{u.name}</td>
                            <td className="p-2">{u.role}</td>
                            <td className="p-2"><StatusPill status={u.status} /></td>
                            <td className="p-2">{u.loginTime ? new Date(u.loginTime).toLocaleTimeString() : '—'}</td>
                            <td className="p-2">{u.lastActivity ? new Date(u.lastActivity).toLocaleTimeString() : '—'}</td>
                            <td className="p-2">{u.device}</td>
                            <td className="p-2 font-mono">{u.ip}</td>
                            <td className="p-2">
                              <button type="button" onClick={() => setDrawerUserId(u.id)} className="flex items-center gap-1 text-amber-700 font-semibold">
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'live' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <div className="p-4 border-b flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm">Live sessions (last 30 min)</h3>
              </div>
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">School</th>
                    <th className="p-3">Product</th><th className="p-3">IP</th><th className="p-3">Status</th><th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {liveUsers.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.school}</td>
                      <td className="p-3 uppercase text-xs font-bold">{u.product}</td>
                      <td className="p-3 font-mono text-xs">{u.ip}</td>
                      <td className="p-3"><StatusPill status={u.status} /></td>
                      <td className="p-3">
                        <button type="button" onClick={() => setDrawerUserId(u.id)} className="text-amber-700 text-xs font-semibold">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!liveUsers.length && <p className="p-8 text-center text-slate-500 text-sm">No users online right now.</p>}
            </div>
          )}

          {tab === 'security' && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-sm mb-3">Suspicious activities</h3>
              <div className="space-y-2">
                {suspicious.map((s) => (
                  <div key={s.id} className="rounded-lg border-l-4 border-red-500 bg-red-50/50 p-3 text-sm">
                    <p className="font-semibold text-red-800">{s.threat_type}</p>
                    <p className="text-slate-700 text-xs mt-1">{s.detail}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{s.school_name} · {new Date(s.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!suspicious.length && <p className="text-slate-500 text-sm">No suspicious flags yet.</p>}
              </div>
            </div>
          )}

          {tab === 'disabled' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead className="bg-slate-50"><tr>
                  <th className="p-3 text-left">User</th><th className="p-3 text-left">School</th><th className="p-3 text-left">State</th>
                </tr></thead>
                <tbody>
                  {disabled.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.school}</td>
                      <td className="p-3">{u.locked ? 'Locked' : 'Disabled'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'analytics' && analytics && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-white p-4">
                <h4 className="font-bold text-sm mb-2">Activity by role (7d)</h4>
                {(analytics.byRole || []).map((r) => (
                  <div key={r.name} className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span>{r.name}</span><span className="font-mono font-bold">{r.count}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border bg-white p-4">
                <h4 className="font-bold text-sm mb-2">Top schools (7d)</h4>
                {(analytics.topSchools || []).map((r) => (
                  <div key={r.name} className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="truncate pr-2">{r.name}</span><span className="font-mono font-bold">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'activities' && (
            <p className="text-sm text-slate-600 rounded-xl border bg-white p-6">
              All API write operations are logged automatically. Open a school → select a user → <strong>View</strong> for the full timeline and operation details.
            </p>
          )}
        </main>

        <aside className="w-64 flex-shrink-0 border-l border-slate-200 bg-white p-3 overflow-y-auto hidden xl:block">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase text-slate-500">Live alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-[11px]">
                <p className="font-semibold text-[#000435]">{a.title || a.type}</p>
                <p className="text-slate-600 mt-0.5">{a.message}</p>
              </div>
            ))}
            {!alerts.length && <p className="text-xs text-slate-500">No alerts.</p>}
          </div>
        </aside>
      </div>

      {drawerUserId && (
        <UserDrawer
          userId={drawerUserId}
          onClose={() => setDrawerUserId(null)}
          onActionDone={() => {
            if (selectedSchool?.id) fetchSchoolUsers(selectedSchool.id).then((r) => setSchoolUsers(r.users || []));
            refreshCore(false);
          }}
        />
      )}

      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.25s ease; }
      `}</style>
    </div>
  );
}
