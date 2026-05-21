import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, TrendingUp, Building2, BarChart2,
  AlertTriangle, CheckCircle, Clock, Shield, Loader2
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getPostLogoutLoginPath } from "../../../utils/postLogoutLoginPath";

// Utilities
import { apiFetch, apiFetchMultipart } from "./utils/api";
import { C, font, globalStyles } from "./utils/theme";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatCard from "./components/StatCard";
import Toast from "./components/Toast";
import DeoProfileModal from "./components/DeoProfileModal";
import ActionModal from "./components/ActionModal";
import DetailDrawer from "./components/DetailDrawer";

// Tabs
import ListTab from "./tabs/ListTab";
import RequestsTab from "./tabs/RequestsTab";
import SchoolsTab from "./tabs/SchoolsTab";
import AnalyticsTab from "./tabs/AnalyticsTab";

// ════════════════════════════════════════════════════════════════
// NAV
// ════════════════════════════════════════════════════════════════
const NAV = [
  { id: "list",     label: "All Babyeyi",       icon: FileText   },
  { id: "requests", label: "Increase Requests", icon: TrendingUp },
  { id: "schools",  label: "Schools",           icon: Building2  },
  { id: "analytics", label: "Analytics",         icon: BarChart2  },
];

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function DistrictBabyeyiDashboard() {
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
  const [showFilters, setShowFilters] = useState(false);
  const [page,        setPage]        = useState(1);

  const [tab,        setTab]        = useState("list");
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
  const [reqFilter, setReqFilter] = useState(""); // ""|"pending"|"recommended"|"approved"|"rejected"

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoad, setAnalyticsLoad] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState({ term: "", academic_year: "", sector: "" });
  const [analyticsSectors, setAnalyticsSectors] = useState([]);

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
      .then(r => { setDeo(r.data); setAuthErr(null); return apiFetch("/district/babyeyi/deo-assets"); })
      .then(r => setDeoAssets(r.data || {}))
      .catch(err => { meFetchedRef.current = false; setAuthErr(err.message || "Session expired."); })
      .finally(() => setAuthLoad(false));
  }, []);

  const loadStats = useCallback(() => {
    if (!deo) return;
    setStatsLoad(true);
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    apiFetch(`/district/babyeyi/stats?${params}`)
      .then(r => setStats(r.data))
      .catch(e => console.error("Stats load failed:", e.message))
      .finally(() => setStatsLoad(false));
  }, [deo]);

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

  const loadRequests = useCallback(() => {
    if (!deo) return;
    setReqLoad(true); setReqErr(null);
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    apiFetch(`/district/babyeyi/increase-requests?${params}`)
      .then(r => setRequests(Array.isArray(r.data) ? r.data : []))
      .catch(e => setReqErr(e.message || "Failed to load increase requests"))
      .finally(() => setReqLoad(false));
  }, [deo]);

  const loadAnalytics = useCallback((term = "", academic_year = "", sector = "") => {
    if (!deo) return;
    setAnalyticsLoad(true);
    const params = new URLSearchParams();
    if (deo.district) params.append("district", deo.district);
    if (term) params.append("term", term);
    if (academic_year) params.append("academic_year", academic_year);
    if (sector) params.append("sector", sector);
    apiFetch(`/district/babyeyi/analytics?${params}`)
      .then(r => {
        setAnalyticsData(r.data || null);
        if (!sector && r.data?.sector_breakdown?.length) setAnalyticsSectors(r.data.sector_breakdown.map(s => s.sector));
      })
      .catch(() => setAnalyticsData(null))
      .finally(() => setAnalyticsLoad(false));
  }, [deo]);

  useEffect(() => { if (!deo) return; loadStats(); loadList(1); }, [deo]); // eslint-disable-line
  useEffect(() => { if (!deo) return; loadList(page); }, [page, filters]); // eslint-disable-line
  useEffect(() => { if (tab === "requests" && deo) loadRequests(); }, [tab, deo]); // eslint-disable-line
  useEffect(() => { if (tab === "analytics" && deo) loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector); }, [tab, deo]); // eslint-disable-line

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
      loadRequests();
    } catch (err) {
      toast(err.message || "Action failed. Please try again.", "error");
    } finally { setActionLoad(false); }
  };

  const filterUpdate = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => {
    setFilters({ status:"",year:"",term:"",category:"",level:"",sector:"",school_id:"",search:"",request_status:"",exceeds_limit:"" });
    setPage(1);
  };
  const switchTab = (id) => { setTab(id); setMobileOpen(false); };

  if (authLoading || authLoad) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "white", fontFamily: font,
      }}>
        <div style={{ textAlign: "center" }}>
          <Loader2 style={{ width: 40, height: 40, color: C.gold, animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
          <p style={{ color: C.goldDark, fontWeight: 600, fontSize: 13 }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (authErr) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, background: "white", fontFamily: font,
      }}>
        <div style={{
          background: "white", borderRadius: 24, border: `1px solid ${C.redBorder}`,
          boxShadow: "0 20px 60px rgba(26,18,0,0.12)",
          padding: 32, maxWidth: 400, width: "100%", textAlign: "center",
        }}>
          <div style={{ width: 52, height: 52, background: C.red50, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield style={{ width: 28, height: 28, color: C.red }}/>
          </div>
          <h2 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: "0 0 8px" }}>Access Denied</h2>
          <p style={{ color: C.goldDark, fontSize: 13, margin: "0 0 24px" }}>{authErr}</p>
          <a href={getPostLogoutLoginPath()} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
            color: C.gold, borderRadius: 14, fontSize: 13, fontWeight: 700,
            textDecoration: "none", boxShadow: "0 4px 16px rgba(26,18,0,0.2)",
          }}>Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "white", fontFamily: font, color: C.dark,
    }}>
      <style>{globalStyles}</style>

      <Sidebar tab={tab} navConfig={NAV} switchTab={switchTab} deo={deo} online={online} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onOpenProfile={() => setProfileOpen(true)}/>

      <div className="lg:ml-60" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header tab={tab} currentTabConfig={NAV.find(n => n.id === tab)} deo={deo} online={online} statsLoad={statsLoad} listLoad={listLoad}
          onRefresh={() => {
            loadStats();
            loadList(page);
            if (tab === "requests") loadRequests();
            if (tab === "analytics") loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector);
          }}
          setMobileOpen={setMobileOpen}/>

        <main style={{ flex: 1, padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="lg:px-2">

            {/* ── HERO BANNER ── */}
            <div className="anim" style={{
              background: `linear-gradient(135deg, ${C.dark} 0%, ${C.darkMid} 100%)`,
              borderRadius: 24, padding: "20px 24px",
              boxShadow: "0 8px 32px rgba(26,18,0,0.2)",
              position: "relative", overflow: "hidden", marginBottom: 20,
            }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "radial-gradient(circle at 80% 20%,white 0%,transparent 50%)", pointerEvents: "none" }}/>
              <div style={{ position: "absolute", bottom: -32, right: -32, width: 160, height: 160, borderRadius: "50%", background: "rgba(254,191,16,0.07)", border: `1px solid ${C.gold}22`, pointerEvents: "none" }}/>
              <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.emerald, animation: "pulse 2s infinite", flexShrink: 0 }}/>
                    <span style={{ color: C.goldLight, fontSize: 11 }}>
                      {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, color: "white", margin: "0 0 4px" }}>
                    {deo?.district ? `${deo.district} District` : "DEO Dashboard"}
                  </h2>
                  <p style={{ color: C.goldLight, fontSize: 13, margin: "0 0 14px" }}>
                    Welcome, {deo?.fullName || "District Education Officer"}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { icon: FileText,      label: `${stats?.total || 0} Babyeyi`,   bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.18)"  },
                      { icon: CheckCircle,   label: `${stats?.approved || 0} Approved`, bg: "rgba(16,185,129,0.2)",  border: "rgba(16,185,129,0.3)"   },
                      ...(Number(stats?.exceeds_count || 0) > 0 ? [
                        { icon: AlertTriangle, label: `${stats.exceeds_count} Exceeding!`, bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.3)", pulse: true }
                      ] : []),
                    ].map(({ icon: Icon, label, bg, border, pulse }) => (
                      <span key={label} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 12,
                        background: bg, border: `1px solid ${border}`,
                        fontSize: 11, fontWeight: 700, color: "white",
                        animation: pulse ? "pulse 2s infinite" : "none",
                      }}>
                        <Icon style={{ width: 13, height: 13 }}/> {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hidden sm:flex" style={{
                  width: 52, height: 52, background: "rgba(254,191,16,0.15)",
                  border: `1px solid ${C.gold}44`, borderRadius: 16,
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Shield style={{ width: 26, height: 26, color: C.gold, opacity: 0.8 }}/>
                </div>
              </div>
            </div>

            {/* ── STATS GRID ── */}
            <div className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
              {[
                { icon: FileText,      label: "Total",            value: stats?.total,              color: "gold",    onClick: () => switchTab("list") },
                { icon: CheckCircle,   label: "Approved",         value: stats?.approved,           color: "emerald", onClick: () => { switchTab("list"); filterUpdate("status","approved"); } },
                { icon: Clock,         label: "Pending",          value: stats?.pending,            color: "amber",   onClick: () => { switchTab("list"); filterUpdate("status","pending"); }, alert: Number(stats?.pending||0) > 0 },
                { icon: AlertTriangle, label: "Exceeds Limit",    value: stats?.exceeds_count,      color: "red",     onClick: () => { switchTab("list"); filterUpdate("exceeds_limit","1"); }, alert: true },
                { icon: Building2,     label: "Schools",          value: stats?.schools_count,      color: "blue",    onClick: () => switchTab("schools") },
                { icon: TrendingUp,    label: "Pending Requests", value: stats?.pending_requests,   color: "violet",  onClick: () => switchTab("requests") },
              ].map((s, i) => (
                <StatCard key={i} {...s} loading={statsLoad}/>
              ))}
            </div>

            {/* ── TAB BAR ── */}
            <div className="anim" style={{
              display: "flex", gap: 4, background: "white",
              border: `1px solid ${C.goldBorder}`, borderRadius: 18, padding: 5,
              width: "fit-content", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,4,53,0.08)",
            }}>
              {NAV.map(({ id, label, icon: Icon }) => {
                const isActive = tab === id;
                return (
                  <button key={id} onClick={() => switchTab(id)} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700,
                    border: "none", cursor: "pointer", fontFamily: font,
                    background: isActive ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` : "transparent",
                    color:      isActive ? C.gold : C.goldDeep,
                    boxShadow:  isActive ? "0 4px 12px rgba(26,18,0,0.2)" : "none",
                    transition: "all 150ms",
                  }}>
                    <Icon style={{ width: 15, height: 15 }}/>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* ══════════════════════════════════════════════ */}
            {/* TABS                                           */}
            {/* ══════════════════════════════════════════════ */}
            {tab === "list" && (
              <ListTab
                items={items} listLoad={listLoad} listErr={listErr} loadList={loadList}
                filters={filters} filterUpdate={filterUpdate} clearFilters={clearFilters}
                showFilters={showFilters} setShowFilters={setShowFilters}
                page={page} setPage={setPage} pagination={pagination}
                deo={deo} stats={stats} switchTab={switchTab}
                handleAction={handleAction} setDetailId={setDetailId}
              />
            )}

            {tab === "requests" && (
              <RequestsTab
                requests={requests} reqLoad={reqLoad} reqErr={reqErr}
                reqFilter={reqFilter} setReqFilter={setReqFilter}
                loadRequests={loadRequests} deo={deo} handleAction={handleAction}
              />
            )}

            {tab === "schools" && (
              <div className="anim"><SchoolsTab district={deo?.district}/></div>
            )}

            {tab === "analytics" && (
              <div className="anim">
                <AnalyticsTab
                  district={deo?.district}
                  data={analyticsData}
                  loading={analyticsLoad}
                  filters={analyticsFilters}
                  sectorOptions={analyticsSectors.length ? analyticsSectors : (analyticsData?.sector_breakdown?.map(s => s.sector) || [])}
                  onFilterChange={(key, val) => setAnalyticsFilters(f => ({ ...f, [key]: val }))}
                  onApply={() => loadAnalytics(analyticsFilters.term, analyticsFilters.academic_year, analyticsFilters.sector)}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
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

      <Toast toasts={toasts} remove={removeToast}/>
    </div>
  );
}