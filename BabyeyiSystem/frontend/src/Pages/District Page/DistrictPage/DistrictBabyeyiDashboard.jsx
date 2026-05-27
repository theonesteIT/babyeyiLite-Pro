import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingUp, Building2, BarChart2, LayoutDashboard,
  AlertTriangle, CheckCircle, Clock, Shield, Settings,
} from "lucide-react";
import BabyeyiPortalLoader from "../../../components/BabyeyiPortalLoader";
import { DeoThemeProvider, useDeoTheme } from "./utils/DeoThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { getPostLogoutLoginPath } from "../../../utils/postLogoutLoginPath";

// Utilities
import { apiFetch, apiFetchMultipart } from "./utils/api";
import { C, font, globalStyles } from "./utils/theme";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Toast from "./components/Toast";
import DeoProfileModal from "./components/DeoProfileModal";
import ActionModal from "./components/ActionModal";
import DetailDrawer from "./components/DetailDrawer";

// Tabs
import ListTab from "./tabs/ListTab";
import RequestsTab from "./tabs/RequestsTab";
import SchoolsTab from "./tabs/SchoolsTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import DashboardTab from "./tabs/DashboardTab";
import SettingsTab from "./tabs/SettingsTab";
import DeoFilterDrawer from "./components/DeoFilterDrawer";
import DeoFilterToolbar from "./components/DeoFilterToolbar";
import {
  loadAcademicPeriod,
  saveAcademicPeriod,
  mergeYearOptions,
  mergeTermOptions,
  validateAcademicYear,
  STORAGE_KEYS,
} from "../../../utils/babyeyiAcademicPeriod";
import {
  createDefaultDeoPortalFilters,
  countActiveDeoPortalFilters,
  portalFiltersToAcademicPeriod,
  portalFiltersToListFilters,
  buildDistrictPortalQuery,
} from "./utils/districtPortalFilters";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "list", label: "All Babyeyi", icon: FileText },
  { id: "requests", label: "Increase Requests", icon: TrendingUp },
  { id: "schools", label: "Schools", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const REQ_PAGE_SIZE = 10;

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function DistrictBabyeyiDashboard() {
  return (
    <DeoThemeProvider>
      <DistrictBabyeyiDashboardInner />
    </DeoThemeProvider>
  );
}

function DistrictBabyeyiDashboardInner() {
  const { setDarkMode } = useDeoTheme();
  const { user, loading: authLoading, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [deo,       setDeo]       = useState(null);
  const [authErr,   setAuthErr]   = useState(null);
  const [authLoad,  setAuthLoad]  = useState(true);
  const [deoAssets, setDeoAssets] = useState({ signature_url: null, stamp_url: null });

  const [stats,     setStats]     = useState(null);
  const [statsLoad, setStatsLoad] = useState(false);

  const [items,      setItems]      = useState([]);
  const [listLoad,   setListLoad]   = useState(false);
  const [listErr,    setListErr]    = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const [filters, setFilters] = useState({
    status: "", year: "", term: "", category: "", level: "",
    sector: "", school_id: "", search: "", request_status: "", exceeds_limit: "",
  });
  const [page,        setPage]        = useState(1);
  const [portalFilters, setPortalFilters] = useState(() =>
    createDefaultDeoPortalFilters(loadAcademicPeriod(STORAGE_KEYS.district)),
  );
  const [draftFilters, setDraftFilters] = useState(() =>
    createDefaultDeoPortalFilters(loadAcademicPeriod(STORAGE_KEYS.district)),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterVersion, setFilterVersion] = useState(0);
  const [schoolOptions, setSchoolOptions] = useState([]);
  const [sectorOptions, setSectorOptions] = useState([]);

  const [tab, setTab] = useState("dashboard");
  const [dashboardRecent, setDashboardRecent] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online,     setOnline]     = useState(navigator.onLine);

  const [actionModal, setActionModal] = useState({ open: false, action: null, item: null });
  const [actionLoad,  setActionLoad]  = useState(false);
  const [detailId,    setDetailId]    = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const [toasts,   setToasts]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [reqLoad,  setReqLoad]  = useState(false);
  const [reqErr,   setReqErr]   = useState(null);
  const [reqFilter, setReqFilter] = useState("");
  const [reqPage, setReqPage] = useState(1);
  const [reqPagination, setReqPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [reqSummary, setReqSummary] = useState({ total: 0, pending: 0, recommended: 0, approved: 0, rejected: 0 });

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoad, setAnalyticsLoad] = useState(false);
  const [analyticsSectors, setAnalyticsSectors] = useState([]);
  const [analyticsTablePage, setAnalyticsTablePage] = useState(1);
  const [analyticsTablePagination, setAnalyticsTablePagination] = useState({ total: 0, page: 1, pages: 1 });
  const [analyticsBarPages, setAnalyticsBarPages] = useState({ sector: 1, term: 1, year: 1 });
  const [academicMeta, setAcademicMeta] = useState({ academic_years: [], terms: [] });
  const [academicPeriod, setAcademicPeriod] = useState(() =>
    loadAcademicPeriod(STORAGE_KEYS.district),
  );

  const ANALYTICS_TABLE_SIZE = 12;

  const meFetchedRef = useRef(false);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) navigate(getPostLogoutLoginPath(), { replace: true });
  }, [authLoading, isLoggedIn, navigate]);

  useEffect(() => {
    if (meFetchedRef.current) return;
    meFetchedRef.current = true;
    setAuthLoad(true);
    apiFetch("/district/babyeyi/me")
      .then(r => {
        setDeo(r.data);
        setAuthErr(null);
        return Promise.all([
          apiFetch("/district/babyeyi/deo-assets"),
          apiFetch("/district/babyeyi/settings").catch(() => null),
        ]);
      })
      .then(([assetsRes, settingsRes]) => {
        setDeoAssets(assetsRes?.data || {});
        if (settingsRes?.data?.darkMode != null) setDarkMode(!!settingsRes.data.darkMode);
        const d = settingsRes?.data || {};
        if (d.defaultAcademicYear) {
          const next = {
            academicYear: d.defaultAcademicYear,
            term: d.defaultTerm || '',
          };
          setAcademicPeriod(next);
          saveAcademicPeriod(STORAGE_KEYS.district, next);
          setPortalFilters((prev) => {
            const merged = { ...prev, academicYear: next.academicYear, term: next.term };
            setFilters(portalFiltersToListFilters(merged));
            return merged;
          });
        }
      })
      .catch(err => { meFetchedRef.current = false; setAuthErr(err.message || "Session expired."); })
      .finally(() => setAuthLoad(false));
  }, []);

  const loadStats = useCallback(() => {
    if (!deo) return;
    setStatsLoad(true);
    const qs = buildDistrictPortalQuery(portalFilters);
    const url = qs ? `/district/babyeyi/stats?${qs}` : '/district/babyeyi/stats';
    apiFetch(url)
      .then((r) => {
        setStats(r.data);
        const sectors = (r.data?.sector_breakdown || []).map((s) => s.sector).filter(Boolean);
        if (sectors.length) setSectorOptions((prev) => [...new Set([...prev, ...sectors])].sort());
      })
      .catch((e) => console.error('Stats load failed:', e.message))
      .finally(() => setStatsLoad(false));
  }, [deo, portalFilters]);

  const loadList = useCallback((pageNum = 1) => {
    if (!deo) return;
    setListLoad(true); setListErr(null);
    const params = new URLSearchParams({ page: pageNum, limit: 12 });
    if (deo.district) params.append("district", deo.district);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    apiFetch(`/district/babyeyi/list?${params}`)
      .then(r => { setItems(Array.isArray(r.data) ? r.data : []); setPagination(r.pagination || { total: 0, page: 1, pages: 1 }); })
      .catch(e => setListErr(e.message))
      .finally(() => setListLoad(false));
  }, [deo, filters]);

  const loadRequests = useCallback((pageNum = 1, statusFilter = reqFilter) => {
    if (!deo) return;
    setReqLoad(true); setReqErr(null);
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(REQ_PAGE_SIZE),
    });
    if (deo.district) params.append('district', deo.district);
    const portalQs = buildDistrictPortalQuery(portalFilters);
    if (portalQs) {
      new URLSearchParams(portalQs).forEach((value, key) => params.append(key, value));
    }
    const statusParam = statusFilter || portalFilters.requestStatus || '';
    if (statusParam) params.append('status', statusParam);
    apiFetch(`/district/babyeyi/increase-requests?${params}`)
      .then(r => {
        setRequests(Array.isArray(r.data) ? r.data : []);
        setReqPagination(r.pagination || { total: 0, page: pageNum, pages: 1 });
        setReqSummary(r.summary || { total: 0, pending: 0, recommended: 0, approved: 0, rejected: 0 });
        setReqPage(pageNum);
      })
      .catch(e => setReqErr(e.message || "Failed to load increase requests"))
      .finally(() => setReqLoad(false));
  }, [deo, reqFilter, portalFilters]);

  const loadAnalytics = useCallback((
    tablePage = 1,
    resetBarPages = false,
  ) => {
    if (!deo) return;
    setAnalyticsLoad(true);
    const params = new URLSearchParams({
      page: String(tablePage),
      limit: String(ANALYTICS_TABLE_SIZE),
    });
    if (deo.district) params.append('district', deo.district);
    const portalQs = buildDistrictPortalQuery(portalFilters);
    if (portalQs) {
      new URLSearchParams(portalQs).forEach((value, key) => params.append(key, value));
    }
    apiFetch(`/district/babyeyi/analytics?${params}`)
      .then(r => {
        setAnalyticsData(r.data || null);
        setAnalyticsTablePagination(
          r.data?.school_requests_pagination || { total: 0, page: tablePage, pages: 1 },
        );
        setAnalyticsTablePage(tablePage);
        if (resetBarPages) setAnalyticsBarPages({ sector: 1, term: 1, year: 1 });
        if (r.data?.sector_breakdown?.length) {
          const sectors = r.data.sector_breakdown.map((s) => s.sector).filter(Boolean);
          setAnalyticsSectors(sectors);
          setSectorOptions((prev) => [...new Set([...prev, ...sectors])].sort());
        }
        const years = (r.data?.year_breakdown || []).map((y) => y.academic_year).filter(Boolean);
        if (years.length) {
          setAcademicMeta((prev) => ({
            ...prev,
            academic_years: [...new Set([...(prev.academic_years || []), ...years])],
          }));
        }
      })
      .catch(() => {
        setAnalyticsData(null);
        setAnalyticsTablePagination({ total: 0, page: 1, pages: 1 });
      })
      .finally(() => setAnalyticsLoad(false));
  }, [deo, portalFilters]);

  const loadDashboardRecent = useCallback(() => {
    if (!deo) return;
    const params = new URLSearchParams({ page: 1, limit: 5, status: 'pending' });
    if (deo.district) params.append('district', deo.district);
    const portalQs = buildDistrictPortalQuery(portalFilters);
    if (portalQs) {
      new URLSearchParams(portalQs).forEach((value, key) => {
        if (key !== 'status') params.append(key, value);
      });
    }
    apiFetch(`/district/babyeyi/list?${params}`)
      .then((r) => setDashboardRecent(Array.isArray(r.data) ? r.data : []))
      .catch(() => setDashboardRecent([]));
  }, [deo, portalFilters]);

  useEffect(() => {
    if (!deo) return;
    loadStats();
    apiFetch('/district/babyeyi/schools/list?limit=100')
      .then((r) => {
        setSchoolOptions(
          (r.data || []).map((s) => ({
            id: s.id,
            name: s.school_name || `School #${s.id}`,
          })),
        );
      })
      .catch(() => setSchoolOptions([]));
    if (tab === 'list') loadList(1);
    if (tab === 'dashboard') {
      loadAnalytics(1, false);
      loadDashboardRecent();
    }
  }, [deo]); // eslint-disable-line

  useEffect(() => {
    if (!deo || tab !== 'list') return;
    loadList(page);
  }, [page, filters, tab, deo]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'requests' && deo) loadRequests(reqPage, reqFilter);
  }, [tab, reqPage, reqFilter, deo, filterVersion]); // eslint-disable-line

  useEffect(() => {
    if (!deo) return;
    setPage(1);
    setReqPage(1);
    setAnalyticsTablePage(1);
    loadStats();
    if (tab === 'list') loadList(1);
    if (tab === 'requests') loadRequests(1, reqFilter);
    if (tab === 'analytics') loadAnalytics(1, true);
    if (tab === 'dashboard') {
      loadAnalytics(1, false);
      loadDashboardRecent();
    }
  }, [filterVersion]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'dashboard' && deo) {
      loadAnalytics(1, false);
      loadDashboardRecent();
    }
    if (tab === 'analytics' && deo) loadAnalytics(analyticsTablePage, false);
  }, [tab, deo]); // eslint-disable-line

  const loadDeo = useCallback(() => {
    apiFetch("/district/babyeyi/me").then(r => setDeo(r.data)).catch(() => {});
  }, []);

  const handleAction = (action, item) => setActionModal({ open: true, action, item });

  const confirmAction = async ({ notes, sigFile, stampFile }) => {
    const { action, item } = actionModal;
    if (!item?.id) { toast("Invalid item — missing ID", "error"); return; }
    setActionLoad(true);
    try {
      let result;
      if (sigFile || stampFile) {
        const fd = new FormData();
        fd.append("notes", notes ?? "");
        if (sigFile)   fd.append("deo_signature",  sigFile);
        if (stampFile) fd.append("deo_stamp",      stampFile);
        result = await apiFetchMultipart(`/district/babyeyi/${item.id}/${action}`, fd, "PATCH");
      } else {
        const payload = { notes: notes || "", rejection_reason: notes || "" };
        result = await apiFetch(`/district/babyeyi/${item.id}/${action}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      void result;
      const msg = {
        approve:   `✅ Babyeyi approved for ${item.school_name || "school"}`,
        reject:    `❌ Babyeyi rejected for ${item.school_name || "school"}`,
        recommend: `📤 Sent to NESA for review — ${item.school_name || "school"}`,
      }[action] || "Action completed";
      toast(msg, "success");
      setActionModal({ open: false, action: null, item: null });
      loadStats();
      loadList(page);
      loadRequests(reqPage, reqFilter);
    } catch (err) {
      toast(err.message || "Action failed. Please try again.", "error");
    } finally { setActionLoad(false); }
  };

  const yearOptions = useMemo(
    () => mergeYearOptions(academicMeta.academic_years),
    [academicMeta.academic_years],
  );
  const termOptions = useMemo(
    () => mergeTermOptions(academicMeta.terms),
    [academicMeta.terms],
  );

  const handleAcademicPeriodChange = useCallback(({ academicYear, term }) => {
    const yearCheck = validateAcademicYear(academicYear);
    if (academicYear && !yearCheck.valid) {
      toast(yearCheck.message, 'error');
      return;
    }
    const next = {
      academicYear: yearCheck.normalized || academicYear || '',
      term: term ?? '',
    };
    setAcademicPeriod(next);
    saveAcademicPeriod(STORAGE_KEYS.district, next);
    setPortalFilters((prev) => {
      const merged = { ...prev, academicYear: next.academicYear, term: next.term };
      setFilters(portalFiltersToListFilters(merged, filters.search));
      return merged;
    });
    apiFetch('/district/babyeyi/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultAcademicYear: next.academicYear,
        defaultTerm: next.term,
      }),
    }).catch(() => {});
    setFilterVersion((v) => v + 1);
  }, [filters.search, toast]);

  const activeFilterCount = countActiveDeoPortalFilters(portalFilters);
  const showPortalFilters = tab !== 'settings';

  const openPortalFilters = useCallback(() => {
    setDraftFilters({ ...portalFilters });
    setFilterOpen(true);
  }, [portalFilters]);

  const handleApplyPortalFilters = useCallback(() => {
    const yearCheck = validateAcademicYear(draftFilters.academicYear);
    if (draftFilters.academicYear && !yearCheck.valid) {
      toast(yearCheck.message, 'error');
      return;
    }
    const next = { ...draftFilters, academicYear: yearCheck.normalized || draftFilters.academicYear || '' };
    setPortalFilters(next);
    setFilters(portalFiltersToListFilters(next, filters.search));
    setReqFilter(next.requestStatus || '');
    setFilterOpen(false);
    const period = portalFiltersToAcademicPeriod(next);
    setAcademicPeriod(period);
    saveAcademicPeriod(STORAGE_KEYS.district, period);
    setFilterVersion((v) => v + 1);
  }, [draftFilters, filters.search, toast]);

  const handleResetPortalFilters = useCallback(() => {
    const blank = createDefaultDeoPortalFilters();
    setDraftFilters(blank);
    setPortalFilters(blank);
    setFilters(portalFiltersToListFilters(blank, filters.search));
    setReqFilter('');
    setFilterOpen(false);
    setAcademicPeriod({ academicYear: '', term: '' });
    saveAcademicPeriod(STORAGE_KEYS.district, { academicYear: '', term: '' });
    setFilterVersion((v) => v + 1);
  }, [filters.search]);

  const handleReqFilterPill = useCallback(
    (key) => {
      setReqFilter(key);
      setReqPage(1);
      setPortalFilters((prev) => {
        const merged = { ...prev, requestStatus: key };
        setFilters(portalFiltersToListFilters(merged, filters.search));
        return merged;
      });
      setFilterVersion((v) => v + 1);
    },
    [filters.search],
  );

  const filterBarProps = useMemo(
    () => ({
      portalFilters,
      districtName: deo?.district,
      activeFilterCount,
      onOpenFilters: openPortalFilters,
    }),
    [portalFilters, deo?.district, activeFilterCount, openPortalFilters],
  );

  const applyPortalPatch = useCallback((patch) => {
    setPortalFilters((prev) => {
      const merged = { ...prev, ...patch };
      setFilters(portalFiltersToListFilters(merged, filters.search));
      return merged;
    });
    setFilterVersion((v) => v + 1);
  }, [filters.search]);

  const clearListFilters = useCallback(() => {
    setPortalFilters((prev) => {
      const merged = {
        ...prev,
        babyeyiStatuses: ['all'],
        schoolId: '',
        sector: '',
        category: '',
        level: '',
        exceedsLimit: 'all',
        requestStatus: '',
      };
      setFilters(portalFiltersToListFilters(merged, ''));
      return merged;
    });
    setPage(1);
    setFilterVersion((v) => v + 1);
  }, []);

  const filterUpdate = (key, val) => {
    if (key === 'search') {
      setFilters((f) => ({ ...f, search: val }));
      setPage(1);
      return;
    }
    const patch = {};
    if (key === 'status') patch.babyeyiStatuses = val ? [val] : ['all'];
    if (key === 'year') patch.academicYear = val;
    if (key === 'term') patch.term = val;
    if (key === 'category') patch.category = val;
    if (key === 'level') patch.level = val;
    if (key === 'sector') patch.sector = val;
    if (key === 'school_id') patch.schoolId = val;
    if (key === 'request_status') patch.requestStatus = val;
    if (key === 'exceeds_limit') patch.exceedsLimit = val === '1' ? 'yes' : 'all';
    applyPortalPatch(patch);
    setPage(1);
  };

  const switchTab = (id) => { setTab(id); setMobileOpen(false); };

  const handleDashboardNavigate = (targetTab, filterPatch = {}) => {
    if (targetTab === 'detail' && filterPatch.id) {
      setDetailId(filterPatch.id);
      return;
    }
    const patch = {};
    if (filterPatch.status) patch.babyeyiStatuses = [filterPatch.status];
    if (filterPatch.exceeds_limit === '1') patch.exceedsLimit = 'yes';
    if (filterPatch.school_id) patch.schoolId = String(filterPatch.school_id);
    if (Object.keys(patch).length) applyPortalPatch(patch);
    else Object.entries(filterPatch).forEach(([k, v]) => filterUpdate(k, v));
    setTab(targetTab);
    setMobileOpen(false);
  };

  const refreshDashboard = () => {
    loadStats();
    loadAnalytics(1, false);
    loadDashboardRecent();
  };

  if (authLoad) {
    return <BabyeyiPortalLoader message="Loading" />;
  }

  if (authErr) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6] p-6" style={{ fontFamily: font }}>
        <div className="w-full max-w-md rounded-2xl border border-[#fde68a] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <Shield className="h-7 w-7 text-[#000435]" />
          </div>
          <h2 className="m-0 mb-2 text-lg font-bold text-[#000435]">Access denied</h2>
          <p className="m-0 mb-6 text-sm text-amber-700">{authErr}</p>
          <a
            href={getPostLogoutLoginPath()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-6 py-3 text-sm font-semibold text-amber-400 no-underline shadow-md"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  const refreshAll = () => {
    loadStats();
    if (tab === 'dashboard') refreshDashboard();
    if (tab === 'list') loadList(page);
    if (tab === 'requests') loadRequests(reqPage, reqFilter);
    if (tab === 'analytics') loadAnalytics(analyticsTablePage, false);
  };

  const showDistrictHero = tab === 'dashboard';

  const heroKpis = [
    { key: 'total', icon: FileText, label: 'Total', value: stats?.total ?? '—', onClick: () => switchTab('list') },
    { key: 'approved', icon: CheckCircle, label: 'Approved', value: stats?.approved ?? '—', onClick: () => { switchTab('list'); applyPortalPatch({ babyeyiStatuses: ['approved'] }); } },
    { key: 'pending', icon: Clock, label: 'Pending', value: stats?.pending ?? '—', onClick: () => { switchTab('list'); applyPortalPatch({ babyeyiStatuses: ['pending'] }); } },
    { key: 'exceeds', icon: AlertTriangle, label: 'Exceeds limit', value: stats?.exceeds_count ?? '—', onClick: () => { switchTab('list'); applyPortalPatch({ exceedsLimit: 'yes' }); } },
    { key: 'schools', icon: Building2, label: 'Schools', value: stats?.schools_count ?? '—', onClick: () => switchTab('schools') },
    { key: 'requests', icon: TrendingUp, label: 'Pending requests', value: stats?.pending_requests ?? '—', onClick: () => switchTab('requests') },
  ];

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="deo-main-surface flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden"
      style={{ background: '#F3F4F6', fontFamily: font, color: C.navy }}
    >
      <style>{globalStyles}</style>

      <Sidebar
        tab={tab}
        navConfig={NAV}
        switchTab={switchTab}
        deo={deo}
        online={online}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          currentTabConfig={NAV.find((n) => n.id === tab)}
          deo={deo}
          online={online}
          statsLoad={statsLoad}
          listLoad={listLoad}
          onRefresh={refreshAll}
          setMobileOpen={setMobileOpen}
          onNavigateTab={switchTab}
          showFilterButton={showPortalFilters}
          activeFilterCount={activeFilterCount}
          onOpenFilters={openPortalFilters}
        />

        <main className="deo-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F3F4F6]">
          {showDistrictHero && (
          <section className="anim relative w-full min-h-[200px] overflow-hidden bg-[#c87800] sm:min-h-[220px]">
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/5" aria-hidden />
            <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/5" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent" aria-hidden />

            <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col gap-5 px-4 pb-20 pt-10 sm:flex-row sm:items-center sm:gap-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-xl md:flex">
                <Shield size={40} style={{ color: '#FEBF10' }} strokeWidth={1.75} aria-hidden />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1 w-5 animate-pulse rounded-full bg-[#FEBF10]" aria-hidden />
                  <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FEBF10]">
                    District education · {dateLabel}
                  </p>
                </div>
                <h1
                  className="m-0 text-xl font-semibold uppercase leading-none tracking-tight text-white md:text-2xl md:text-3xl"
                  style={{ fontFamily: font }}
                >
                  District Dashboard
                </h1>
                <p className="m-0 max-w-2xl pt-2 text-[10px] font-medium uppercase tracking-widest text-white/60 md:text-xs">
                  Welcome, {deo?.fullName || 'District Education Officer'}
                  {deo?.province ? ` · ${deo.province}` : ''}
                </p>
              </div>

              <div className="deo-hero-pills flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
                  <FileText size={13} /> {stats?.total || 0} Babyeyi
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#FEBF10]/40 bg-[#FEBF10]/15 px-3 py-1.5 text-[11px] font-semibold text-[#FEBF10]">
                  <CheckCircle size={13} /> {stats?.approved || 0} Approved
                </span>
                {Number(stats?.exceeds_count || 0) > 0 && (
                  <span className="inline-flex animate-pulse items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white">
                    <AlertTriangle size={13} /> {stats.exceeds_count} Exceeding
                  </span>
                )}
              </div>
            </div>
          </section>
          )}

          {showDistrictHero && (
          <div className="relative z-20 mx-auto -mt-12 mb-6 max-w-[1600px] px-4 sm:-mt-14 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-t-[32px] border border-black/10 bg-white shadow-sm">
              <div className="deo-stats-grid grid grid-cols-2 divide-x divide-y divide-black/5 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
                {heroKpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <button
                      key={kpi.key}
                      type="button"
                      onClick={kpi.onClick}
                      className="flex min-h-[6.75rem] flex-col items-center justify-center p-4 text-center transition-colors hover:bg-[#F3F4F6]/80 sm:p-5"
                    >
                      <div className="mb-1.5 shrink-0 opacity-40" style={{ color: '#FEBF10' }}>
                        <Icon size={12} className="mx-auto mb-1.5" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm font-semibold tabular-nums leading-snug tracking-tight text-[#000435] sm:text-lg">
                        {statsLoad ? (
                          <span className="inline-block h-6 w-10 animate-pulse rounded bg-gray-100" />
                        ) : (
                          kpi.value
                        )}
                      </span>
                      <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] text-[#000435]/55 sm:text-[8px]">
                        {kpi.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          <div className={`mx-auto max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-8 ${showDistrictHero ? '' : 'pt-5'}`}>
            {tab === 'dashboard' && (
              <DashboardTab
                deo={deo}
                stats={stats}
                statsLoad={statsLoad}
                analytics={analyticsData}
                analyticsLoad={analyticsLoad}
                onRefresh={refreshDashboard}
                onNavigate={handleDashboardNavigate}
                recentItems={dashboardRecent}
                filterBar={showPortalFilters ? filterBarProps : null}
              />
            )}

            {tab === "list" && (
              <ListTab
                items={items} listLoad={listLoad} listErr={listErr} loadList={loadList}
                filters={filters} filterUpdate={filterUpdate}
                onClearFilters={clearListFilters}
                filterBar={filterBarProps}
                page={page} setPage={setPage} pagination={pagination}
                deo={deo} stats={stats} switchTab={switchTab}
                handleAction={handleAction} setDetailId={setDetailId}
              />
            )}

            {tab === "requests" && (
              <RequestsTab
                requests={requests} reqLoad={reqLoad} reqErr={reqErr}
                reqFilter={reqFilter}
                reqPage={reqPage} setReqPage={setReqPage}
                reqPagination={reqPagination} reqSummary={reqSummary}
                loadRequests={loadRequests} deo={deo} handleAction={handleAction}
                filterBar={filterBarProps}
                onReqFilterPill={handleReqFilterPill}
              />
            )}

            {tab === "settings" && (
              <SettingsTab
                deo={deo}
                toast={toast}
                academicPeriod={academicPeriod}
                yearOptions={yearOptions}
                termOptions={termOptions}
                onAcademicPeriodChange={handleAcademicPeriodChange}
                onEmailUpdated={(email) => setDeo((d) => (d ? { ...d, email } : d))}
                onPhotoUpdated={(photo) => setDeo((d) => (d ? { ...d, photo } : d))}
              />
            )}

            {tab === "schools" && (
              <div className="anim">
                <SchoolsTab
                  district={deo?.district}
                  portalFilters={portalFilters}
                  filterVersion={filterVersion}
                  filterBar={filterBarProps}
                />
              </div>
            )}

            {tab === "analytics" && (
              <div className="anim">
                <AnalyticsTab
                  district={deo?.district}
                  data={analyticsData}
                  loading={analyticsLoad}
                  filterBar={filterBarProps}
                  tablePagination={analyticsTablePagination}
                  barPages={analyticsBarPages}
                  onTablePageChange={(p) => {
                    setAnalyticsTablePage(p);
                    loadAnalytics(p, false);
                  }}
                  onBarPageChange={(key, p) => setAnalyticsBarPages((prev) => ({ ...prev, [key]: p }))}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {profileOpen && (
        <DeoProfileModal
          open={profileOpen}
          deo={deo}
          onClose={() => setProfileOpen(false)}
          onUpdated={loadDeo}
          toast={toast}
        />
      )}
      {actionModal.open && (
        <ActionModal
          action={actionModal.action}
          item={actionModal.item}
          loading={actionLoad}
          deoAssets={deoAssets}
          onRefreshDeoAssets={() => apiFetch("/district/babyeyi/deo-assets").then(r => setDeoAssets(r.data || {}))}
          toast={toast}
          onClose={() => setActionModal({ open: false, action: null, item: null })}
          onConfirm={confirmAction}
        />
      )}

      {detailId && (
        <DetailDrawer
          id={detailId}
          onClose={() => setDetailId(null)}
          onAction={(action, item) => { setDetailId(null); handleAction(action, item); }}
        />
      )}

      {showPortalFilters && (
        <DeoFilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={handleApplyPortalFilters}
          onReset={handleResetPortalFilters}
          yearOptions={yearOptions}
          termOptions={termOptions}
          schoolOptions={schoolOptions}
          sectorOptions={sectorOptions.length ? sectorOptions : analyticsSectors}
          showRequestStatus={tab === 'requests'}
          requestSummary={reqSummary}
        />
      )}

      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  );
}