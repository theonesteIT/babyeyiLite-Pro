import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PieChart,
  RefreshCw,
  School,
  Search,
  Settings,
  User,
  Wallet,
  X,
  XCircle,
  Banknote,
  Eye,
  Download,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import babyeyiLogo from '../../assets/1BABYEYI LOGO FINAL.png';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const PUBLIC_API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const ax = { withCredentials: true, headers: { 'Content-Type': 'application/json' } };

const NAVY = '#000435';

function disburseLabel(v) {
  const m = {
    school_account: 'School account (fees / materials)',
    teacher_momo: 'Teacher MoMo / bank',
    school_operating: 'School operating account',
  };
  return m[v] || v || '—';
}

function statusChipClass(st) {
  const u = String(st || '').toUpperCase();
  if (u === 'PAID' || u === 'DISBURSED') return 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35';
  if (u === 'APPROVED') return 'bg-amber-400/15 text-amber-100 border-amber-400/35';
  if (u === 'REJECTED') return 'bg-red-500/15 text-red-200 border-red-400/30';
  if (u === 'PENDING_APPROVAL') return 'bg-sky-500/15 text-sky-100 border-sky-400/35';
  if (u === 'DRAFT') return 'bg-white/10 text-white/75 border-white/15';
  return 'bg-white/10 text-white/70 border-white/12';
}

function formatRwfCompact(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function initialsFromOrg(name) {
  const s = String(name || 'SA').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-amber-400/15 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={16} className="text-amber-300 shrink-0" />}
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200/90">{title}</h3>
      </div>
      <div className="space-y-2 text-sm text-white/90">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white/40 sm:w-36 shrink-0">{label}</span>
      <span className={`flex-1 text-sm break-words ${mono ? 'font-mono text-xs text-amber-100/95' : ''}`}>{String(value)}</span>
    </div>
  );
}

function KpiCard({ accent, label, value, sub, icon: Icon, loading }) {
  const top = {
    amber: 'before:bg-amber-400',
    blue: 'before:bg-blue-500',
    green: 'before:bg-emerald-500',
    red: 'before:bg-red-500',
    teal: 'before:bg-teal-500',
    purple: 'before:bg-violet-500',
  }[accent] || 'before:bg-amber-400';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-400/15 bg-white/[0.05] p-4 sm:p-5 transition hover:border-amber-400/40 hover:-translate-y-0.5 before:absolute before:inset-x-0 before:top-0 before:h-[3px] ${top}`}
    >
      {Icon && (
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white/40">
          <Icon size={18} />
        </div>
      )}
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/35 mb-2 pr-10">{label}</p>
      <p className={`text-2xl sm:text-[26px] font-black tabular-nums leading-none text-white ${accent === 'amber' ? 'text-amber-300' : ''}`}>
        {loading ? '—' : value}
      </p>
      {sub && <p className="mt-2 text-[11px] font-semibold text-white/40">{sub}</p>}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div className="h-full w-3/5 rounded-full bg-amber-400/40" />
      </div>
    </div>
  );
}

function Panel({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-amber-400/15 bg-white/[0.05] p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] font-semibold text-white/40">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function ShuleAvancePartnerDashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterApplicant, setFilterApplicant] = useState('');

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        axios.get(`${API}/shule-avance-partner/me`, ax),
        axios.get(`${API}/shule-avance-partner/stats`, ax),
        axios.get(`${API}/shule-avance-partner/requests`, ax),
      ]);
      if (a.data.success) setMe(a.data.data);
      if (b.data.success) setStats(b.data.data);
      if (c.data.success) setRows(c.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setDetailId(id);
    setDetail(null);
    setDetailErr('');
    setDetailLoading(true);
    setSidebarOpen(false);
    try {
      const { data } = await axios.get(`${API}/shule-avance-partner/requests/${id}`, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      setDetail(data.data);
    } catch (e) {
      setDetailErr(e.response?.data?.message || e.message || 'Could not load request');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailErr('');
  };

  const logout = async () => {
    await auth.logout();
    navigate('/login', { replace: true });
  };

  const act = async (id, action) => {
    setBusyId(id);
    setErr('');
    try {
      const { data } = await axios.patch(`${API}/shule-avance-partner/requests/${id}`, { action }, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      await load();
      if (detailId === id) await openDetail(id);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const orgName = me?.org_name || 'ShuleAvance Partner';
  const pendingCount = Number(stats?.pending ?? 0);

  const analytics = useMemo(() => {
    const list = rows || [];
    const totalRwf = list.reduce((s, r) => s + Number(r.total_rwf || 0), 0);
    const paidRwf = list
      .filter((r) => String(r.invoice_status || '').toUpperCase() === 'PAID')
      .reduce((s, r) => s + Number(r.total_rwf || 0), 0);
    const schoolIds = new Set(list.map((r) => r.school_id).filter((x) => x != null && x !== ''));
    const byApplicant = {};
    list.forEach((r) => {
      const k = (r.applicant_category || 'Other').trim() || 'Other';
      byApplicant[k] = (byApplicant[k] || 0) + 1;
    });
    const applicantSorted = Object.entries(byApplicant).sort((a, b) => b[1] - a[1]);

    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString(undefined, { month: 'short', year: '2-digit' }),
      });
    }
    const byMonth = Object.fromEntries(months.map((m) => [m.key, { count: 0, rwf: 0 }]));
    list.forEach((r) => {
      if (!r.created_at) return;
      const k = monthKey(r.created_at);
      if (byMonth[k]) {
        byMonth[k].count += 1;
        byMonth[k].rwf += Number(r.total_rwf || 0);
      }
    });
    const monthBars = months.map((m) => ({
      ...m,
      ...byMonth[m.key],
    }));
    const maxMonth = Math.max(1, ...monthBars.map((m) => m.count));

    const bySchool = {};
    list.forEach((r) => {
      const sid = r.school_id != null ? String(r.school_id) : '—';
      bySchool[sid] = (bySchool[sid] || 0) + 1;
    });
    const topSchools = Object.entries(bySchool)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const maxSchool = Math.max(1, ...topSchools.map(([, c]) => c));

    const byStatusRwf = {};
    list.forEach((r) => {
      const st = String(r.invoice_status || 'Unknown').toUpperCase() || 'UNKNOWN';
      byStatusRwf[st] = (byStatusRwf[st] || 0) + Number(r.total_rwf || 0);
    });
    const statusBars = Object.entries(byStatusRwf).sort((a, b) => b[1] - a[1]);
    const maxStatusRwf = Math.max(1, ...statusBars.map(([, v]) => v));

    const total = list.length || 1;
    const donut = applicantSorted.map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / total) * 1000) / 10,
      color: ['#FBBF24', '#3b82f6', '#10b981', '#8b5cf6', '#14b8a6', '#f472b6'][i % 6],
    }));

    const financingByStatus = {};
    list.forEach((r) => {
      const k = r.financing_request_status || '—';
      financingByStatus[k] = (financingByStatus[k] || 0) + 1;
    });
    const financingSorted = Object.entries(financingByStatus).sort((a, b) => b[1] - a[1]);

    return {
      totalRwf,
      paidRwf,
      uniqueSchools: schoolIds.size,
      applicantSorted,
      monthBars,
      maxMonth,
      topSchools,
      maxSchool,
      statusBars,
      maxStatusRwf,
      donut,
      financingSorted,
      totalRows: list.length,
    };
  }, [rows]);

  const applicantOptions = useMemo(() => {
    const s = new Set();
    rows.forEach((r) => {
      const k = (r.applicant_category || '').trim();
      if (k) s.add(k);
    });
    return [...s].sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterInvoice && String(r.invoice_status || '').toUpperCase() !== filterInvoice.toUpperCase()) return false;
      if (filterApplicant && String(r.applicant_category || '') !== filterApplicant) return false;
      if (!q) return true;
      const blob = [
        r.id,
        r.invoice_no,
        r.payer_name,
        r.purpose,
        r.applicant_category,
        r.school_id,
        r.babyeyi_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, filterInvoice, filterApplicant]);

  const p = detail?.payload || {};
  const sa = p?.payment_plan?.shule_avance || {};
  const students = Array.isArray(p.selected_students) && p.selected_students.length
    ? p.selected_students
    : (p.selected_student ? [p.selected_student] : []);
  const invoicePdfHref = detail?.invoice_no && detail?.id
    ? `${PUBLIC_API}/public/babyeyi-pay/invoice/${Number(detail.id)}.pdf?invoice_no=${encodeURIComponent(detail.invoice_no)}`
    : '';
  const hasSchoolBlock = Boolean(
    detail?.school_name
    || detail?.school_id
    || detail?.province
    || detail?.district
    || detail?.sector
  );

  const total = Number(stats?.total ?? 0);
  const approved = Number(stats?.approved ?? 0);
  const approvalPct = total > 0 ? Math.round((approved / total) * 1000) / 10 : 0;

  const navTitle = {
    overview: 'Dashboard',
    requests: 'Requests',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  const navSub = {
    overview: '/ Overview',
    requests: '/ All financing requests',
    analytics: '/ Insights from your data',
    settings: '/ Organization',
  };

  return (
    <div
      className="min-h-screen text-white antialiased [font-family:Nunito,system-ui,sans-serif]"
      style={{ background: NAVY }}
    >
      <h1 className="sr-only">ShuleAvance partner financing dashboard for {orgName}</h1>

      {err && (
        <div className="fixed top-16 left-1/2 z-[500] max-w-lg -translate-x-1/2 px-4 w-full">
          <div className="rounded-xl border border-red-400/40 bg-red-950/90 px-4 py-3 text-sm text-red-100 shadow-xl backdrop-blur">
            {err}
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[250] bg-[#000435]/70 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            'fixed lg:sticky top-0 z-[260] flex h-screen w-[min(260px,88vw)] shrink-0 flex-col border-r border-amber-400/15 bg-[#000435]/98 transition-[transform] duration-300 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <div className="border-b border-amber-400/15 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 shrink-0 items-center justify-center rounded-[10px] bg-[#1F2937] border border-amber-300/40 px-2">
                <img src={babyeyiLogo} alt="Babyeyi logo" className="h-7 w-auto object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-black leading-tight truncate">ShuleAvance</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">Finance platform</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              <span className="text-[11px] font-bold text-amber-200 truncate">{orgName}</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-2">
            <p className="px-2 pb-1 pt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/35">Main</p>
            <button
              type="button"
              onClick={() => { setActiveNav('overview'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'overview' ? 'bg-amber-400 text-[#000435]' : 'text-white/60 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <LayoutDashboard size={16} className="shrink-0 opacity-80" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setActiveNav('requests'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'requests' ? 'bg-amber-400 text-[#000435]' : 'text-white/60 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <FileText size={16} className="shrink-0 opacity-80" />
              <span className="flex-1 truncate">Requests</span>
              {pendingCount > 0 && (
                <span className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-black ${activeNav === 'requests' ? 'bg-[#000435]/25 text-[#000435]' : 'bg-red-500 text-white'}`}>
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>

            <p className="px-2 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/35">Insights</p>
            <button
              type="button"
              onClick={() => { setActiveNav('analytics'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'analytics' ? 'bg-amber-400 text-[#000435]' : 'text-white/60 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <PieChart size={16} className="shrink-0 opacity-80" />
              Analytics
            </button>

            <p className="px-2 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/35">Account</p>
            <button
              type="button"
              onClick={() => { setActiveNav('settings'); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'settings' ? 'bg-amber-400 text-[#000435]' : 'text-white/60 hover:bg-white/[0.08] hover:text-white'}`}
            >
              <Settings size={16} className="shrink-0 opacity-80" />
              Settings
            </button>
          </nav>

          <div className="border-t border-amber-400/15 p-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-400/15 bg-white/[0.05] px-2.5 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-[#000435]">
                {initialsFromOrg(orgName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-white">{orgName}</p>
                <p className="truncate text-[10px] font-semibold text-white/35">Financing partner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-[200] flex h-[60px] shrink-0 items-center gap-3 border-b-[3px] border-amber-400 bg-[#000435]/95 px-4 backdrop-blur-md sm:px-6">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-white/[0.06] text-white/80 lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <span className="text-[15px] font-black">{navTitle[activeNav]}</span>
              <span className="ml-1 text-[11px] font-semibold text-white/35">{navSub[activeNav]}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-400/35 px-3 text-xs font-bold text-white/85 hover:bg-white/[0.06] disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-xs font-black text-[#000435] hover:bg-amber-300"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
            {activeNav === 'overview' && (
              <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
                  <KpiCard accent="amber" label="Total requests" value={loading ? null : Number(stats?.total ?? 0).toLocaleString()} sub={`${analytics.totalRows} loaded in view`} icon={FileText} loading={loading} />
                  <KpiCard accent="blue" label="Pending review" value={loading ? null : Number(stats?.pending ?? 0).toLocaleString()} sub="Awaiting partner action" icon={Clock} loading={loading} />
                  <KpiCard accent="green" label="Approved" value={loading ? null : Number(stats?.approved ?? 0).toLocaleString()} sub={total ? `${approvalPct}% of total` : '—'} icon={CheckCircle2} loading={loading} />
                  <KpiCard accent="red" label="Rejected" value={loading ? null : Number(stats?.rejected ?? 0).toLocaleString()} icon={XCircle} loading={loading} />
                  <KpiCard accent="teal" label="Paid / disbursed" value={loading ? null : Number(stats?.paid ?? 0).toLocaleString()} icon={Banknote} loading={loading} />
                  <KpiCard accent="amber" label="Volume (RWF)" value={loading ? null : formatRwfCompact(analytics.totalRwf)} sub="Sum of request amounts" icon={Wallet} loading={loading} />
                  <KpiCard accent="purple" label="Schools (IDs)" value={loading ? null : String(analytics.uniqueSchools)} sub="Distinct school_id in feed" icon={School} loading={loading} />
                  <KpiCard accent="blue" label="Paid volume" value={loading ? null : formatRwfCompact(analytics.paidRwf)} sub="Invoice status PAID" icon={Banknote} loading={loading} />
                </div>

                <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
                  <Panel title="Requests over time" subtitle="Last 6 months · count per month">
                    <div className="flex h-[200px] items-end gap-2 sm:gap-3">
                      {analytics.monthBars.map((m) => (
                        <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex w-full flex-1 items-end justify-center">
                            <div
                              className="w-full max-w-[48px] rounded-t-md bg-amber-400/80 transition-all hover:bg-amber-400"
                              style={{ height: `${Math.max(8, (m.count / analytics.maxMonth) * 100)}%` }}
                              title={`${m.count} requests`}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-white/45">{m.label}</span>
                          <span className="text-[11px] font-black text-amber-200/90">{m.count}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="By applicant category" subtitle="Share of routed requests">
                    {analytics.donut.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/45">No category data yet.</p>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="mx-auto flex w-full max-w-[200px] shrink-0 flex-col items-center gap-3">
                          <div className="flex h-4 w-full overflow-hidden rounded-full border border-white/10">
                            {analytics.donut.map((d) => (
                              <div
                                key={d.label}
                                className="h-full min-w-[4px] transition-all"
                                style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                                title={`${d.label}: ${d.pct}%`}
                              />
                            ))}
                          </div>
                          <div className="text-center">
                            <span className="block text-2xl font-black leading-none">{analytics.totalRows}</span>
                            <span className="text-[10px] font-bold uppercase text-white/40">requests</span>
                          </div>
                        </div>
                        <ul className="min-w-0 flex-1 space-y-2">
                          {analytics.donut.map((d) => (
                            <li key={d.label} className="flex items-center gap-2 text-xs font-bold text-white/70">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                              <span className="flex-1 truncate">{d.label}</span>
                              <span className="shrink-0 font-mono text-amber-200/90">{d.pct}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
                  <Panel title="Amount by invoice status" subtitle="RWF in current feed (max 200 rows)">
                    <div className="space-y-3">
                      {analytics.statusBars.length === 0 ? (
                        <p className="text-sm text-white/45">No data.</p>
                      ) : (
                        analytics.statusBars.map(([st, rwf]) => (
                          <div key={st}>
                            <div className="mb-1 flex justify-between text-[11px] font-bold">
                              <span className="text-white/50">{st}</span>
                              <span className="font-mono text-amber-200/90">{formatRwfCompact(rwf)} RWF</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-amber-400/70"
                                style={{ width: `${Math.min(100, (rwf / analytics.maxStatusRwf) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>

                  <Panel title="Top school IDs" subtitle="By request count">
                    <div className="flex flex-col gap-2.5">
                      {analytics.topSchools.length === 0 ? (
                        <p className="text-sm text-white/45">No schools in feed.</p>
                      ) : (
                        analytics.topSchools.map(([sid, cnt], idx) => (
                          <div key={sid} className="flex items-center gap-2">
                            <span className="w-4 text-right text-[11px] font-black text-white/35">{idx + 1}</span>
                            <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-white/85" title={sid}>{sid}</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08] sm:w-24">
                              <div className="h-full rounded-full bg-amber-400" style={{ width: `${(cnt / analytics.maxSchool) * 100}%` }} />
                            </div>
                            <span className="w-8 text-right font-mono text-[11px] font-black text-amber-300">{cnt}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300/90 hover:underline"
                  >
                    <ArrowLeft size={14} /> Babyeyi home
                  </button>
                </div>
              </div>
            )}

            {activeNav === 'requests' && (
              <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-2xl border border-amber-400/15 bg-white/[0.04]">
                  <div className="flex flex-wrap items-center gap-2 border-b border-amber-400/15 p-3 sm:p-4">
                    <div className="relative min-w-[200px] max-w-md flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search ID, invoice, payer, purpose…"
                        className="h-9 w-full rounded-lg border border-amber-400/25 bg-white/[0.06] pl-9 pr-3 text-sm font-semibold text-white placeholder:text-white/30 outline-none focus:border-amber-400"
                      />
                    </div>
                    <select
                      value={filterInvoice}
                      onChange={(e) => setFilterInvoice(e.target.value)}
                      className="h-9 rounded-lg border border-amber-400/20 bg-white/[0.06] px-2 text-xs font-bold text-white/80 outline-none focus:border-amber-400"
                    >
                      <option value="">All invoice statuses</option>
                      {['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'DRAFT'].map((s) => (
                        <option key={s} value={s} className="bg-[#000c6b]">{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    <select
                      value={filterApplicant}
                      onChange={(e) => setFilterApplicant(e.target.value)}
                      className="h-9 rounded-lg border border-amber-400/20 bg-white/[0.06] px-2 text-xs font-bold text-white/80 outline-none focus:border-amber-400"
                    >
                      <option value="">All applicant types</option>
                      {applicantOptions.map((a) => (
                        <option key={a} value={a} className="bg-[#000c6b]">{a}</option>
                      ))}
                    </select>
                    <span className="ml-auto text-xs font-bold text-white/40">
                      {filteredRows.length} / {rows.length}
                    </span>
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-amber-400/25 bg-amber-400/[0.06]">
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">ID</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">Amount</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">Applicant</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">Purpose</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">Invoice</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">Status</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-white/45">View</th>
                          <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wide text-white/45">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r) => (
                          <tr key={r.id} className="border-b border-white/[0.06] hover:bg-amber-400/[0.04]">
                            <td className="px-3 py-3 font-mono text-xs text-amber-200/90">#{r.id}</td>
                            <td className="px-3 py-3 font-bold tabular-nums text-white">{formatRwfCompact(r.total_rwf)}</td>
                            <td className="px-3 py-3 text-xs capitalize text-white/75">{r.applicant_category || '—'}</td>
                            <td className="px-3 py-3 text-xs text-white/55 max-w-[160px] truncate">{r.purpose || '—'}</td>
                            <td className="px-3 py-3 font-mono text-xs text-amber-200/80">{r.invoice_no || '—'}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusChipClass(r.invoice_status)}`}>
                                {r.invoice_status || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openDetail(r.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-100 hover:bg-amber-400/20"
                              >
                                <Eye size={12} /> View
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex flex-wrap justify-end gap-1">
                                {['approve', 'reject', 'request_info', 'mark_disbursed'].map((a) => (
                                  <button
                                    key={a}
                                    type="button"
                                    disabled={busyId === r.id}
                                    onClick={() => act(r.id, a)}
                                    className="rounded-md border border-white/15 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white/85 hover:bg-amber-400/15 disabled:opacity-40"
                                  >
                                    {a.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-white/10">
                    {filteredRows.map((r) => (
                      <div key={r.id} className="p-4 space-y-3">
                        <div className="flex justify-between gap-2">
                          <span className="font-mono text-xs text-amber-200">#{r.id}</span>
                          <span className="font-mono text-sm font-black text-white">{formatRwfCompact(r.total_rwf)} RWF</span>
                        </div>
                        <p className="text-xs text-white/60 capitalize">{r.applicant_category || '—'}</p>
                        <p className="text-xs text-white/45 line-clamp-2">{r.purpose || '—'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${statusChipClass(r.invoice_status)}`}>{r.invoice_status || '—'}</span>
                          <span className="font-mono text-[10px] text-white/40">{r.invoice_no || '—'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openDetail(r.id)} className="flex-1 rounded-lg border border-amber-400/40 bg-amber-400/15 py-2 text-xs font-black text-amber-100">
                            View
                          </button>
                          {['approve', 'reject', 'request_info', 'mark_disbursed'].map((a) => (
                            <button
                              key={a}
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, a)}
                              className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-bold uppercase text-white/80 disabled:opacity-40"
                            >
                              {a.split('_')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {loading && (
                    <div className="flex justify-center py-16 text-amber-200">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                  {!loading && !filteredRows.length && (
                    <div className="py-16 text-center text-sm text-white/45">No requests match your filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeNav === 'analytics' && (
              <div className="mx-auto max-w-7xl space-y-5">
                <Panel title="Analytics workspace" subtitle="Built live from your organization’s request feed (same data as Dashboard)">
                  <p className="text-sm text-white/60 leading-relaxed">
                    Charts and rankings update when you press Refresh. For deeper reporting, export from your core banking or ask Babyeyi for extended APIs.
                  </p>
                </Panel>
                <div className="grid gap-3.5 lg:grid-cols-2">
                  <Panel title="Applicant mix" subtitle="Counts">
                    <div className="space-y-2">
                      {analytics.applicantSorted.length === 0 ? (
                        <p className="text-sm text-white/45">No data.</p>
                      ) : (
                        analytics.applicantSorted.map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between text-sm font-bold">
                            <span className="text-white/70">{label}</span>
                            <span className="font-mono text-amber-200">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                  <Panel title="Financing status (payload)" subtitle="Latest snapshot per row">
                    <div className="space-y-2">
                      {analytics.financingSorted.length === 0 ? (
                        <p className="text-sm text-white/45">No data.</p>
                      ) : (
                        analytics.financingSorted.map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm font-bold">
                            <span className="text-white/65">{k}</span>
                            <span className="font-mono text-amber-200">{v}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {activeNav === 'settings' && (
              <div className="mx-auto max-w-2xl">
                <Panel title="Organization profile" subtitle="From partner session /me">
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Name</dt>
                      <dd className="mt-1 font-bold text-white">{me?.org_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Type</dt>
                      <dd className="mt-1 font-bold text-white/85">{me?.org_type || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Contact</dt>
                      <dd className="mt-1 font-bold text-white/85">{me?.contact_email || '—'}</dd>
                      <dd className="mt-0.5 font-bold text-white/85">{me?.contact_phone || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${me?.is_active ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' : 'border-white/20 bg-white/10 text-white/60'}`}>
                          {me?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </Panel>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Detail drawer */}
      {detailId != null && (
        <div className="fixed inset-0 z-[400] flex justify-end bg-[#000435]/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sa-detail-title">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label="Close panel" onClick={closeDetail} />
          <div
            className="relative z-[410] flex h-full w-full max-w-lg flex-col border-l-2 border-amber-400 bg-[#000c6b] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-amber-400/20 bg-[#000c6b] px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p id="sa-detail-title" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-300/90">Request & invoice</p>
                <p className="truncate text-lg font-black text-white">
                  {detail?.invoice_no ? detail.invoice_no : detailLoading ? 'Loading…' : `Request #${detailId}`}
                </p>
                {detail?.invoice_status && (
                  <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusChipClass(detail.invoice_status)}`}>
                    {detail.invoice_status}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="shrink-0 rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4">
              {detailLoading && (
                <div className="flex justify-center py-16 text-amber-200">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {detailErr && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{detailErr}</div>
              )}
              {!detailLoading && detail && !detailErr && (
                <>
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-200/80">Amount (RWF)</p>
                        <p className="text-3xl font-black tabular-nums text-amber-100">{Number(detail.total_rwf || 0).toLocaleString()}</p>
                      </div>
                      {invoicePdfHref && (
                        <a
                          href={invoicePdfHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-[#000435] hover:bg-amber-300"
                        >
                          <Download size={18} /> PDF
                        </a>
                      )}
                    </div>
                  </div>

                  <SectionCard icon={FileText} title="Invoice & intent">
                    <DetailRow label="Invoice number" value={detail.invoice_no} mono />
                    <DetailRow label="Invoice status" value={detail.invoice_status} />
                    <DetailRow label="Intent status" value={detail.status} />
                    <DetailRow label="Submitted" value={detail.created_at ? new Date(detail.created_at).toLocaleString() : null} />
                    <DetailRow label="Babyeyi document ID" value={detail.babyeyi_id} />
                  </SectionCard>

                  {hasSchoolBlock && (
                    <SectionCard icon={Building2} title="School">
                      <DetailRow label="School name" value={detail.school_name} />
                      <DetailRow label="Province" value={detail.province} />
                      <DetailRow label="District" value={detail.district} />
                      <DetailRow label="Sector" value={detail.sector} />
                      <DetailRow label="School ID" value={detail.school_id} />
                    </SectionCard>
                  )}

                  <SectionCard icon={User} title="Payer / contact">
                    <DetailRow label="Name" value={detail.payer_name} />
                    <DetailRow label="Phone" value={detail.payer_phone} />
                    <DetailRow label="Email" value={detail.payer_email} />
                  </SectionCard>

                  <SectionCard icon={Wallet} title="ShuleAvance application">
                    <DetailRow label="Organization" value={sa.organization_name} />
                    <DetailRow label="Applicant category" value={sa.applicant_category} />
                    <DetailRow label="Notification email" value={sa.applicant_notification_email} />
                    <DetailRow label="Purpose" value={sa.purpose} />
                    <DetailRow label="Repayment (months)" value={sa.repayment_period_months} />
                    <DetailRow label="Disbursement preference" value={disburseLabel(sa.disbursement_preference)} />
                    <DetailRow label="Supporting note" value={sa.supporting_note} />
                    <DetailRow label="Routing summary" value={sa.routing_summary} />
                    <DetailRow label="Financing status" value={sa.financing_request_status} />
                    {sa.partner_last_note ? <DetailRow label="Partner note" value={sa.partner_last_note} /> : null}
                  </SectionCard>

                  {Array.isArray(sa.approval_history) && sa.approval_history.length > 0 && (
                    <SectionCard icon={Calendar} title="Approval history">
                      <ul className="space-y-2">
                        {sa.approval_history.map((h, i) => (
                          <li key={i} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs">
                            <span className="font-extrabold uppercase text-amber-200/90">{h.action || '—'}</span>
                            {h.at && <span className="ml-2 text-white/40">{new Date(h.at).toLocaleString()}</span>}
                            {h.note && <p className="mt-1 text-white/75">{h.note}</p>}
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {students.length > 0 && (
                    <SectionCard icon={School} title="Students in this payment">
                      {students.map((st, i) => (
                        <div key={i} className="mb-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs last:mb-0 space-y-1">
                          <DetailRow label="Name" value={st.student_name || st.name} />
                          <DetailRow
                            label="School"
                            value={st.school_name || st.schoolName || st.school || detail.school_name}
                          />
                          <DetailRow label="Class" value={st.class_name} />
                          <DetailRow label="Code" value={st.student_code || st.student_uid} />
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-black text-white/90 hover:bg-white/5"
                    >
                      Close
                    </button>
                    {invoicePdfHref && (
                      <a
                        href={invoicePdfHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-amber-400/50 py-3 text-sm font-black text-amber-100 hover:bg-amber-400/10"
                      >
                        Open PDF <ChevronRight size={16} />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pb-6">
                    {['approve', 'reject', 'request_info', 'mark_disbursed'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        disabled={busyId === detailId}
                        onClick={() => act(detailId, a)}
                        className="flex-1 min-w-[120px] rounded-xl border border-white/15 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-white/90 hover:bg-amber-400/15 disabled:opacity-40"
                      >
                        {a.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
