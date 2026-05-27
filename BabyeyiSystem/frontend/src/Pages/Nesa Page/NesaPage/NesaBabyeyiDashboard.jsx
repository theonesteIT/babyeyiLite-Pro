import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import BabyeyiPortalLoader from '../../../components/BabyeyiPortalLoader';
import { useAuth } from '../../../context/AuthContext';
import { getPostLogoutLoginPath } from '../../../utils/postLogoutLoginPath';
import { BABYEYI_PAGE_BG } from '../../../theme/babyeyiDashboardTheme';
import { NAV } from './utils/navConfig';
import { C, font, globalStyles } from './utils/theme';
import { apiFetch, NESA_API } from './utils/api';
import { mapNesaUser } from './utils/helpers';
import { buildHeroConfig } from './utils/heroConfig';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';
import NesaPageHero from './components/NesaPageHero';
import TuitionManagerPage from './pages/TuitionManagerPage';
import MonitoringPage from './pages/MonitoringPage';
import ApprovalsPage from './pages/ApprovalsPage';
import SchoolsPage from './pages/SchoolsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import DeoOfficersPage from './pages/DeoOfficersPage';
import DashboardPage from './pages/DashboardPage';
import NesaFilterDrawer from './components/NesaFilterDrawer';
import NesaFilterToolbar from './components/NesaFilterToolbar';
import {
  loadAcademicPeriod,
  saveAcademicPeriod,
  mergeYearOptions,
  mergeTermOptions,
  validateAcademicYear,
  STORAGE_KEYS,
} from '../../../utils/babyeyiAcademicPeriod';
import {
  createDefaultDashboardFilters,
  countActiveDashboardFilters,
  portalFiltersToAcademicPeriod,
  buildNesaPortalQuery,
} from './utils/dashboardFilters';
import {
  NotificationsView,
  NesaProfileModal,
} from './nesaTabViews';

export default function NesaBabyeyiDashboard() {
  const { user, loading: authLoading, isLoggedIn, refresh } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [notifCount, setNotifCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoad, setStatsLoad] = useState(false);
  const [feeStats, setFeeStats] = useState(null);
  const [tabMetrics, setTabMetrics] = useState({});
  const [feeHeroActions, setFeeHeroActions] = useState(null);
  const [academicMeta, setAcademicMeta] = useState({ academic_years: [], terms: [] });
  const [academicPeriod, setAcademicPeriod] = useState(() =>
    loadAcademicPeriod(STORAGE_KEYS.nesa),
  );
  const [portalFilters, setPortalFilters] = useState(() =>
    createDefaultDashboardFilters(loadAcademicPeriod(STORAGE_KEYS.nesa)),
  );
  const [draftFilters, setDraftFilters] = useState(() =>
    createDefaultDashboardFilters(loadAcademicPeriod(STORAGE_KEYS.nesa)),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterVersion, setFilterVersion] = useState(0);
  const [schoolOptions, setSchoolOptions] = useState([]);

  const nesaUser = useMemo(() => mapNesaUser(user), [user]);

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  );

  const heroConfig = useMemo(
    () =>
      buildHeroConfig(tab, {
        stats,
        feeStats,
        nesaUser,
        dateLabel,
        tabMetrics,
      }),
    [tab, stats, feeStats, nesaUser, dateLabel, tabMetrics],
  );

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate(getPostLogoutLoginPath(), { replace: true });
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const switchTab = (id) => {
    setTab(id);
    setMobileOpen(false);
    setFeeHeroActions(null);
  };

  const loadStats = useCallback(async () => {
    setStatsLoad(true);
    try {
      const qs = buildNesaPortalQuery(portalFilters);
      const url = qs ? `${NESA_API}/stats?${qs}` : `${NESA_API}/stats`;
      const res = await apiFetch(url);
      setStats(res?.data || {});
    } catch {
      toast('Failed to load dashboard stats', 'error');
    } finally {
      setStatsLoad(false);
    }
  }, [toast, portalFilters]);

  useEffect(() => {
    if (isLoggedIn) loadStats();
  }, [isLoggedIn, loadStats, filterVersion]);

  const loadAcademicMeta = useCallback(async () => {
    try {
      const metaRes = await apiFetch(`${NESA_API}/requests/meta`);
      const d = metaRes?.data || {};
      setAcademicMeta({
        academic_years: d.academic_years || [],
        terms: d.terms || ['Term 1', 'Term 2', 'Term 3'],
        districts: d.districts || [],
      });
    } catch {
      try {
        const periodRes = await apiFetch(`${NESA_API}/academic-period/meta`);
        const d = periodRes?.data || {};
        setAcademicMeta({
          academic_years: d.academic_years || [],
          terms: d.terms || ['Term 1', 'Term 2', 'Term 3'],
          districts: [],
        });
      } catch {
        /* keep prior meta */
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadAcademicMeta();
    apiFetch(`${NESA_API}/schools?limit=80`)
      .then((r) => {
        const rows = r?.data || [];
        setSchoolOptions(
          rows.map((s) => ({
            id: s.id,
            name: s.school_name || s.name || `School #${s.id}`,
            district: s.district,
          })),
        );
      })
      .catch(() => setSchoolOptions([]));
    apiFetch(`${NESA_API}/settings`)
      .then((r) => {
        const d = r.data || {};
        if (d.defaultAcademicYear || d.defaultTerm !== undefined) {
          const next = {
            academicYear: d.defaultAcademicYear ?? '',
            term: d.defaultTerm ?? '',
          };
          setAcademicPeriod(next);
          saveAcademicPeriod(STORAGE_KEYS.nesa, next);
          setPortalFilters((prev) => ({ ...prev, ...next }));
        }
      })
      .catch(() => {});
  }, [isLoggedIn, loadAcademicMeta]);

  const yearOptions = useMemo(
    () => mergeYearOptions(academicMeta.academic_years),
    [academicMeta.academic_years],
  );
  const termOptions = useMemo(
    () => mergeTermOptions(academicMeta.terms),
    [academicMeta.terms],
  );

  const handleAcademicPeriodChange = useCallback(
    async ({ academicYear, term }, { skipRegister } = {}) => {
      const yearCheck = validateAcademicYear(academicYear);
      if (!yearCheck.valid) {
        toast(yearCheck.message, 'error');
        return;
      }
      const next = { academicYear: yearCheck.normalized || '', term: term ?? '' };
      setAcademicPeriod(next);
      setPortalFilters((prev) => ({ ...prev, ...next }));
      saveAcademicPeriod(STORAGE_KEYS.nesa, next);
      if (next.academicYear && !skipRegister) {
        try {
          await apiFetch(`${NESA_API}/academic-period/years`, {
            method: 'POST',
            body: JSON.stringify({ academic_year: next.academicYear }),
          });
          await loadAcademicMeta();
        } catch {
          /* non-blocking */
        }
      }
      apiFetch(`${NESA_API}/settings`, {
        method: 'PUT',
        body: JSON.stringify({
          defaultAcademicYear: next.academicYear,
          defaultTerm: next.term,
        }),
      }).catch(() => {});
      setFilterVersion((v) => v + 1);
    },
    [toast, loadAcademicMeta],
  );

  const activeFilterCount = countActiveDashboardFilters(portalFilters);

  const openPortalFilters = useCallback(() => {
    setDraftFilters({ ...portalFilters });
    setFilterOpen(true);
  }, [portalFilters]);

  const handleApplyPortalFilters = useCallback(async () => {
    const yearCheck = validateAcademicYear(draftFilters.academicYear);
    if (!yearCheck.valid) {
      toast(yearCheck.message, 'error');
      return;
    }
    const next = { ...draftFilters, academicYear: yearCheck.normalized || '' };
    setPortalFilters(next);
    setFilterOpen(false);
    await handleAcademicPeriodChange(
      { academicYear: next.academicYear, term: next.term },
      { skipRegister: !next.academicYear },
    );
  }, [draftFilters, toast, handleAcademicPeriodChange]);

  const handleResetPortalFilters = useCallback(async () => {
    const blank = createDefaultDashboardFilters();
    setDraftFilters(blank);
    setPortalFilters(blank);
    setFilterOpen(false);
    setFilterVersion((v) => v + 1);
    await handleAcademicPeriodChange({ academicYear: '', term: '' }, { skipRegister: true });
  }, [handleAcademicPeriodChange]);

  const academicPeriodFromFilters = useMemo(
    () => portalFiltersToAcademicPeriod(portalFilters),
    [portalFilters],
  );

  const portalFilterProps = {
    portalFilters,
    filterVersion,
    academicPeriod: academicPeriodFromFilters,
    yearOptions,
    termOptions,
    onAcademicPeriodChange: handleAcademicPeriodChange,
    onAcademicMetaRefresh: loadAcademicMeta,
  };

  const showPortalFilters = tab !== 'settings' && tab !== 'deo';

  const refreshAll = () => {
    loadStats();
    feeHeroActions?.refresh?.();
  };

  const handleHeroKpiClick = (kpi) => {
    if (tab === 'dashboard') {
      if (kpi.key === 'violations') switchTab('monitoring');
      else switchTab('approvals');
    }
  };

  const updateMonitoringMetrics = useCallback((metrics) => {
    setTabMetrics((prev) => ({ ...prev, monitoring: metrics }));
  }, []);

  const updateSchoolsMetrics = useCallback((metrics) => {
    setTabMetrics((prev) => ({ ...prev, schools: metrics }));
  }, []);

  const updateNotificationsMetrics = useCallback((metrics) => {
    setTabMetrics((prev) => ({ ...prev, notifications: metrics }));
  }, []);

  const updateApprovalsMetrics = useCallback((metrics) => {
    setTabMetrics((prev) => ({ ...prev, approvals: metrics }));
  }, []);

  const feeHeroActionsSlot =
    tab === 'fees' && feeHeroActions ? (
      <>
        <button
          type="button"
          onClick={feeHeroActions.refresh}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          onClick={feeHeroActions.openCreate}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-none bg-[#000435] px-4 py-2.5 text-[13px] font-bold text-amber-400 shadow-md transition-opacity hover:opacity-95"
        >
          <Plus size={16} />
          Set New Limit
        </button>
      </>
    ) : null;

  return (
    <div
      className="flex h-[100dvh] max-h-full overflow-hidden"
      style={{ background: '#F3F4F6', fontFamily: font, color: C.navy }}
    >
      <style>{globalStyles}</style>

      <Sidebar
        tab={tab}
        navConfig={NAV}
        switchTab={switchTab}
        nesaUser={nesaUser}
        online={online}
        notifCount={notifCount}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          currentTabConfig={NAV.find((n) => n.id === tab)}
          nesaUser={nesaUser}
          online={online}
          statsLoad={statsLoad}
          onRefresh={refreshAll}
          setMobileOpen={setMobileOpen}
          notifCount={notifCount}
          onNavigateTab={switchTab}
          showFilterButton={showPortalFilters}
          activeFilterCount={activeFilterCount}
          onOpenFilters={openPortalFilters}
        />

        <main className="nesa-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F3F4F6]">
          <NesaPageHero
            config={heroConfig}
            loading={statsLoad && tab !== 'fees'}
            actions={feeHeroActionsSlot}
            onKpiClick={tab === 'dashboard' ? handleHeroKpiClick : undefined}
          />

          <div className="mx-auto max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-8">
            {showPortalFilters && <NesaFilterToolbar portalFilters={portalFilters} />}
            <div className="anim">
              {tab === 'dashboard' && (
                <DashboardPage
                  toast={toast}
                  setTab={switchTab}
                  shellStats={stats}
                  statsLoad={statsLoad}
                  onRefresh={refreshAll}
                  {...portalFilterProps}
                />
              )}
              {tab === 'fees' && (
                <TuitionManagerPage
                  toast={toast}
                  onStatsChange={setFeeStats}
                  onHeroActions={setFeeHeroActions}
                  {...portalFilterProps}
                />
              )}
              {tab === 'monitoring' && (
                <MonitoringPage toast={toast} onMetricsChange={updateMonitoringMetrics} {...portalFilterProps} />
              )}
              {tab === 'approvals' && (
                <ApprovalsPage toast={toast} onMetricsChange={updateApprovalsMetrics} {...portalFilterProps} />
              )}
              {tab === 'schools' && (
                <SchoolsPage toast={toast} onMetricsChange={updateSchoolsMetrics} {...portalFilterProps} />
              )}
              {tab === 'analytics' && <AnalyticsPage toast={toast} {...portalFilterProps} />}
              {tab === 'deo' && <DeoOfficersPage toast={toast} />}
              {tab === 'notifications' && (
                <NotificationsView
                  toast={toast}
                  setNotifCount={setNotifCount}
                  hideTopStats
                  onMetricsChange={updateNotificationsMetrics}
                  portalFilters={portalFilters}
                  filterVersion={filterVersion}
                />
              )}
              {tab === 'settings' && (
                <SettingsPage
                  toast={toast}
                  academicPeriod={academicPeriod}
                  yearOptions={yearOptions}
                  termOptions={termOptions}
                  onAcademicPeriodChange={handleAcademicPeriodChange}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {profileOpen && (
        <NesaProfileModal
          open={profileOpen}
          user={user}
          onClose={() => setProfileOpen(false)}
          onUpdated={refresh}
          toast={toast}
        />
      )}

      {showPortalFilters && (
        <NesaFilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={handleApplyPortalFilters}
          onReset={handleResetPortalFilters}
          yearOptions={yearOptions}
          termOptions={termOptions}
          schoolOptions={schoolOptions}
        />
      )}

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
