import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Bell,
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
/** Matches Service.jsx; add local MTN font files + @font-face in index.css if you host the files. */
const FONT_FAMILY = "'MTN Brighter Sans', 'Segoe UI', system-ui, sans-serif";

function disburseLabel(v) {
  const key = String(v || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const m = {
    school_account: 'School bank account (fees / materials at school)',
    personal_account: 'Personal MoMo or bank account',
    other: 'Other (see disbursement details)',
    teacher_momo: 'Teacher MoMo / bank',
    school_operating: 'School operating account',
  };
  return m[key] || (v ? String(v) : '—');
}

function statusChipClass(st) {
  const u = String(st || '').toUpperCase();
  const base = 'border text-[#000435]';
  if (u === 'PAID' || u === 'DISBURSED') return `${base} border-amber-200 bg-amber-50`;
  if (u === 'APPROVED') return `${base} border-amber-300/80 bg-amber-100/50`;
  if (u === 'REJECTED') return `${base} border-slate-300 bg-slate-100`;
  if (u === 'PENDING_APPROVAL') return `${base} border-amber-400 bg-white`;
  if (u === 'DRAFT') return `${base} border-slate-200 bg-amber-50/40 text-slate-700`;
  return `${base} border-slate-200 bg-white text-slate-600`;
}

function formatRwf(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString();
}

function notifyDesktop(title, body) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    const n = new window.Notification(title, {
      body,
      tag: 'shule-avance-new-request',
      icon: '/1BABYEYI LOGO FINAL.png',
    });
    n.onclick = () => {
      try { window.focus(); } catch (_) {}
      n.close();
    };
  } catch (_) {}
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
    <section className="rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/35 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={16} className="text-amber-600 shrink-0" />}
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#000435]">{title}</h3>
      </div>
      <div className="space-y-2 text-sm text-slate-800">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, mono }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-slate-200 last:border-0">
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-500 sm:w-36 shrink-0">{label}</span>
      <span className={`flex-1 text-sm break-words ${mono ? 'font-mono text-xs text-[#000435]' : 'text-slate-800'}`}>{String(value)}</span>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, loading }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-amber-100/90 bg-white p-3 sm:p-5 shadow-sm transition hover:border-amber-200/90">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-amber-400 via-amber-500 to-[#000435]"
        aria-hidden
      />
      {Icon && (
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700/90">
          <Icon size={18} />
        </div>
      )}
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 mb-2 pr-10">{label}</p>
      <p className="text-2xl sm:text-[26px] font-black tabular-nums leading-none text-[#000435]">
        {loading ? '—' : value}
      </p>
      {sub && <p className="mt-2 text-[11px] font-semibold text-slate-500">{sub}</p>}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-amber-100/80">
        <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-amber-400/70 to-[#000435]/40" />
      </div>
    </div>
  );
}

function Panel({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-amber-100/90 bg-white p-4 sm:p-5 shadow-sm ring-1 ring-amber-50 ${className}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-[#000435]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0 sm:ml-auto">{right}</div>}
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
  const [notifToast, setNotifToast] = useState('');
  const [unreadPendingIds, setUnreadPendingIds] = useState([]);
  const prevPendingIdsRef = useRef(null);
  const notifStorageKey = useMemo(
    () => `shule_avance_unread_pending_${String(me?.id || auth?.user?.shule_avance_org?.id || 'partner')}`,
    [me?.id, auth?.user?.shule_avance_org?.id]
  );

  const load = useCallback(async ({ silent = false, detectNew = false, skipMe = false } = {}) => {
    setErr('');
    if (!silent) setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        skipMe ? Promise.resolve(null) : axios.get(`${API}/shule-avance-partner/me`, ax),
        axios.get(`${API}/shule-avance-partner/stats`, ax),
        axios.get(`${API}/shule-avance-partner/requests`, ax),
      ]);
      if (!skipMe && a?.data?.success) setMe(a.data.data);
      if (b.data.success) setStats(b.data.data);
      if (c.data.success) {
        const nextRows = c.data.data || [];
        const nextPendingIds = new Set(
          nextRows
            .filter((r) => String(r.invoice_status || '').toUpperCase() === 'PENDING_APPROVAL')
            .map((r) => Number(r.id || 0))
            .filter((n) => Number.isFinite(n) && n > 0)
        );

        if (detectNew && prevPendingIdsRef.current && prevPendingIdsRef.current.size > 0) {
          let fresh = 0;
          const freshIds = [];
          nextPendingIds.forEach((id) => {
            if (!prevPendingIdsRef.current.has(id)) {
              fresh += 1;
              freshIds.push(id);
            }
          });
          if (fresh > 0) {
            setNotifToast(`${fresh} new request${fresh > 1 ? 's' : ''} received. Open Notifications to review.`);
            if (typeof document === 'undefined' || document.hidden || !document.hasFocus()) {
              notifyDesktop(
                fresh === 1 ? 'New ShuleAvance request' : `${fresh} new ShuleAvance requests`,
                'Open Notifications to review pending requests.'
              );
            }
            setUnreadPendingIds((prev) => {
              const base = new Set((prev || []).filter((x) => nextPendingIds.has(x)));
              freshIds.forEach((id) => base.add(id));
              return [...base];
            });
          }
        }

        prevPendingIdsRef.current = nextPendingIds;
        setUnreadPendingIds((prev) => (prev || []).filter((id) => nextPendingIds.has(id)));
        setRows(nextRows);
      }
    } catch (e) {
      if (!silent) setErr(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load({ detectNew: false }); }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      load({ silent: true, detectNew: true, skipMe: true });
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(notifStorageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        setUnreadPendingIds(arr.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0));
      }
    } catch (_) {}
  }, [notifStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(notifStorageKey, JSON.stringify(unreadPendingIds));
    } catch (_) {}
  }, [notifStorageKey, unreadPendingIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (window.Notification.permission === 'default') {
      window.Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!notifToast) return undefined;
    const timer = setTimeout(() => setNotifToast(''), 6000);
    return () => clearTimeout(timer);
  }, [notifToast]);

  const markRequestSeen = useCallback((id) => {
    const n = Number(id || 0);
    if (!n) return;
    setUnreadPendingIds((prev) => (prev || []).filter((x) => x !== n));
  }, []);

  const openDetail = async (id) => {
    markRequestSeen(id);
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
      await load({ silent: true, detectNew: false, skipMe: true });
      if (action !== 'request_info') markRequestSeen(id);
      if (detailId === id) await openDetail(id);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const orgName = me?.org_name || 'ShuleAvance Partner';
  const pendingCount = Number(stats?.pending ?? 0);
  const unreadCount = unreadPendingIds.length;
  const pendingRows = useMemo(
    () => (rows || []).filter((r) => String(r.invoice_status || '').toUpperCase() === 'PENDING_APPROVAL'),
    [rows]
  );

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
    const donutPalette = ['#000435', '#F59E0B', '#475569', '#94A3B8', '#CBD5E1', '#E2E8F0'];
    const donut = applicantSorted.map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / total) * 1000) / 10,
      color: donutPalette[i % donutPalette.length],
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
        r.preferred_disbursement,
        r.disbursement_target_value,
        r.deposit_account_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search, filterInvoice, filterApplicant]);

  const p = detail?.payload || {};
  const sa = p?.payment_plan?.shule_avance || {};
  const prefRaw = sa?.preferred_disbursement ?? sa?.disbursement_preference;
  const prefNorm = String(prefRaw || 'school_account')
    .toLowerCase()
    .replace(/-/g, '_');
  const disburseTarget = String(sa?.disbursement_target_value || '').trim();
  const hasSchoolDepositFields = Boolean(
    detail?.deposit_bank_name
    || detail?.deposit_account_number
    || detail?.deposit_account_name
    || detail?.deposit_bank_branch
  );
  const showSchoolDepositCard = hasSchoolDepositFields || prefNorm === 'school_account';
  const applicantProfile = useMemo(() => {
    const fullName = String(sa?.applicant_full_name || detail?.payer_name || '').trim();
    const nationalId = String(sa?.applicant_national_id || '').trim();
    const email = String(sa?.applicant_email || detail?.payer_email || '').trim();
    const phone = String(sa?.applicant_notification_phone || detail?.payer_phone || '').trim();
    const occupation = String(sa?.applicant_occupation || '').trim();
    const district = String(sa?.applicant_district || '').trim();
    return { fullName, nationalId, email, phone, occupation, district };
  }, [sa, detail?.payer_name, detail?.payer_email, detail?.payer_phone]);
  const hasApplicantProfile = useMemo(
    () => Object.values(applicantProfile).some((v) => String(v || '').trim()),
    [applicantProfile]
  );
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
    notifications: 'Notifications',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  const navSub = {
    overview: '/ Overview',
    requests: '/ All financing requests',
    notifications: '/ Pending request alerts',
    analytics: '/ Insights from your data',
    settings: '/ Organization',
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-amber-50/25 to-white text-slate-900 antialiased"
      style={{ fontFamily: FONT_FAMILY }}
    >
      <h1 className="sr-only">ShuleAvance partner financing dashboard for {orgName}</h1>

      {err && (
        <div className="fixed top-[max(4rem,env(safe-area-inset-top))] left-1/2 z-[500] max-w-lg -translate-x-1/2 px-4 w-full">
          <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-800 shadow-lg">
            {err}
          </div>
        </div>
      )}
      {notifToast && (
        <div className="fixed top-[max(8rem,env(safe-area-inset-top))] left-1/2 z-[500] max-w-lg -translate-x-1/2 px-4 w-full">
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm font-bold text-[#000435] shadow-lg flex items-center justify-between gap-3">
            <span>{notifToast}</span>
            <button
              type="button"
              onClick={() => setNotifToast('')}
              className="rounded-md border border-amber-300/80 bg-white px-2 py-0.5 text-[11px] font-bold text-[#000435] hover:bg-amber-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — brand color only */}
        <aside
          style={{ background: NAVY }}
          className={[
            'fixed lg:sticky top-0 z-[260] flex h-screen w-[min(260px,88vw)] shrink-0 flex-col border-r border-amber-400/20 text-white transition-[transform] duration-300 lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ].join(' ')}
        >
          <div className="border-b border-amber-400/25 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              <img
                src={babyeyiLogo}
                alt="Babyeyi"
                className="h-9 w-auto max-h-10 max-w-[min(9rem,42vw)] shrink-0 object-contain object-left drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
              />
              <div className="min-w-0">
                <p className="text-[15px] font-black leading-tight truncate">ShuleAvance</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">Finance platform</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/15 px-2.5 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" aria-hidden />
              <span className="text-[11px] font-bold text-amber-50 truncate">{orgName}</span>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-2">
            <p className="px-2 pb-1 pt-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/45">Main</p>
            <button
              type="button"
              onClick={() => { setActiveNav('overview'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'overview' ? 'bg-amber-400 text-[#000435] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <LayoutDashboard size={16} className="shrink-0 opacity-90" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => { setActiveNav('requests'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'requests' ? 'bg-amber-400 text-[#000435] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <FileText size={16} className="shrink-0 opacity-90" />
              <span className="truncate">Requests</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveNav('notifications'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'notifications' ? 'bg-amber-400 text-[#000435] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Bell size={16} className="shrink-0 opacity-90" />
              <span className="flex-1 truncate">Notifications</span>
              {unreadCount > 0 && (
                <span className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-black ${activeNav === 'notifications' ? 'bg-[#000435]/15 text-[#000435]' : 'bg-white text-[#000435] ring-1 ring-amber-300/50'}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <p className="px-2 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/45">Insights</p>
            <button
              type="button"
              onClick={() => { setActiveNav('analytics'); setSidebarOpen(false); }}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'analytics' ? 'bg-amber-400 text-[#000435] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <PieChart size={16} className="shrink-0 opacity-90" />
              Analytics
            </button>

            <p className="px-2 pb-1 pt-4 text-[9px] font-extrabold uppercase tracking-[0.14em] text-white/45">Account</p>
            <button
              type="button"
              onClick={() => { setActiveNav('settings'); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2.5 py-2 text-left text-[13px] font-bold transition ${activeNav === 'settings' ? 'bg-amber-400 text-[#000435] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              <Settings size={16} className="shrink-0 opacity-90" />
              Settings
            </button>
          </nav>

          <div className="border-t border-amber-400/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2.5 rounded-lg border border-amber-400/25 bg-white/10 px-2.5 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-[#000435]">
                {initialsFromOrg(orgName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-white">{orgName}</p>
                <p className="truncate text-[10px] font-semibold text-white/50">Financing partner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col bg-white/80">
          <header
            style={{ background: NAVY }}
            className="sticky top-0 z-[200] flex min-h-[52px] shrink-0 items-center gap-2 border-b-[3px] border-amber-400 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:min-h-[60px] sm:gap-3 sm:px-4 sm:py-0 md:px-6 text-white shadow-sm"
          >
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-sm font-black leading-tight sm:inline sm:text-[15px]">{navTitle[activeNav]}</span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold leading-tight text-white/50 sm:mt-0 sm:ml-1 sm:inline sm:text-[11px]">{navSub[activeNav]}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => load({ detectNew: false })}
                disabled={loading}
                className="inline-flex h-10 min-w-[2.5rem] touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-white/25 px-2.5 text-xs font-bold text-white/90 hover:bg-white/10 disabled:opacity-50 sm:px-3"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 touch-manipulation items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 text-xs font-black text-[#000435] hover:bg-amber-300 sm:px-3"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] sm:p-5 md:p-6 md:pb-24 bg-gradient-to-b from-white via-amber-50/20 to-white">
            {activeNav === 'overview' && (
              <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
                  <KpiCard label="Total requests" value={loading ? null : Number(stats?.total ?? 0).toLocaleString()} sub={`${analytics.totalRows} loaded in view`} icon={FileText} loading={loading} />
                  <KpiCard label="Pending review" value={loading ? null : Number(stats?.pending ?? 0).toLocaleString()} sub="Awaiting partner action" icon={Clock} loading={loading} />
                  <KpiCard label="Approved" value={loading ? null : Number(stats?.approved ?? 0).toLocaleString()} sub={total ? `${approvalPct}% of total` : '—'} icon={CheckCircle2} loading={loading} />
                  <KpiCard label="Rejected" value={loading ? null : Number(stats?.rejected ?? 0).toLocaleString()} icon={XCircle} loading={loading} />
                  <KpiCard label="Paid" value={loading ? null : Number(stats?.paid ?? 0).toLocaleString()} icon={Banknote} loading={loading} />
                  <KpiCard label="Amount (RWF)" value={loading ? null : formatRwf(analytics.totalRwf)} sub="Sum of request amounts" icon={Wallet} loading={loading} />
                  <KpiCard label="Schools" value={loading ? null : String(analytics.uniqueSchools)} sub="Distinct school_id in feed" icon={School} loading={loading} />
                  <KpiCard label="Paid Amount" value={loading ? null : formatRwf(analytics.paidRwf)} sub="Invoice status PAID" icon={Banknote} loading={loading} />
                </div>

                <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
                  <Panel title="Requests over time" subtitle="Last 6 months · count per month">
                    <div className="w-full overflow-x-auto overscroll-x-contain -mx-1 px-1 pb-1">
                      <div className="flex h-[min(200px,42vh)] min-h-[160px] min-w-[300px] items-end gap-1.5 sm:min-w-0 sm:gap-2 md:gap-3">
                        {analytics.monthBars.map((m, mi) => (
                          <div key={m.key} className="flex min-w-[36px] flex-1 flex-col items-center gap-1.5 sm:min-w-0 sm:gap-2">
                            <div className="flex w-full flex-1 items-end justify-center">
                              <div
                                className={`w-full max-w-[48px] rounded-t-md transition-all ${mi % 2 === 0 ? 'bg-[#000435]/90 hover:bg-[#000435]' : 'bg-amber-500/90 hover:bg-amber-500'}`}
                                style={{ height: `${Math.max(8, (m.count / analytics.maxMonth) * 100)}%` }}
                                title={`${m.count} requests`}
                              />
                            </div>
                            <span className="max-w-full truncate text-center text-[9px] font-bold text-slate-500 sm:text-[10px]">{m.label}</span>
                            <span className="text-[10px] font-black text-[#000435] sm:text-[11px]">{m.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Panel>

                  <Panel title="By applicant category" subtitle="Share of routed requests">
                    {analytics.donut.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">No category data yet.</p>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="mx-auto flex w-full max-w-[200px] shrink-0 flex-col items-center gap-3">
                          <div className="flex h-4 w-full overflow-hidden rounded-full border border-amber-100">
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
                            <span className="block text-2xl font-black leading-none text-[#000435]">{analytics.totalRows}</span>
                            <span className="text-[10px] font-bold uppercase text-slate-500">requests</span>
                          </div>
                        </div>
                        <ul className="min-w-0 flex-1 space-y-2">
                          {analytics.donut.map((d) => (
                            <li key={d.label} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                              <span className="flex-1 truncate">{d.label}</span>
                              <span className="shrink-0 font-mono text-[#000435]">{d.pct}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
                  <Panel title="Amount by invoice status" subtitle="RWF in current feed (max 200 rows)">
                    <div className="space-y-3">
                      {analytics.statusBars.length === 0 ? (
                        <p className="text-sm text-slate-500">No data.</p>
                      ) : (
                        analytics.statusBars.map(([st, rwf]) => (
                          <div key={st}>
                            <div className="mb-1 flex justify-between text-[11px] font-bold">
                              <span className="text-slate-600">{st}</span>
                              <span className="font-mono text-[#000435]">{formatRwf(rwf)} RWF</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-amber-50">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#000435]/80"
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
                        <p className="text-sm text-slate-500">No schools in feed.</p>
                      ) : (
                        analytics.topSchools.map(([sid, cnt], idx) => (
                          <div key={sid} className="flex items-center gap-2">
                            <span className="w-4 text-right text-[11px] font-black text-slate-400">{idx + 1}</span>
                            <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-slate-800" title={sid}>{sid}</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-amber-50 sm:w-24">
                              <div className="h-full rounded-full bg-[#000435]/75" style={{ width: `${(cnt / analytics.maxSchool) * 100}%` }} />
                            </div>
                            <span className="w-8 text-right font-mono text-[11px] font-black text-[#000435]">{cnt}</span>
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                  >
                    <ArrowLeft size={14} /> Babyeyi home
                  </button>
                </div>
              </div>
            )}

            {activeNav === 'requests' && (
              <div className="mx-auto max-w-7xl">
                <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm ring-1 ring-amber-50">
                  <div className="flex flex-col gap-2 border-b border-amber-100 bg-gradient-to-r from-amber-50/90 to-white p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:p-4">
                    <div className="relative min-w-0 w-full sm:min-w-[200px] sm:max-w-md sm:flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search ID, invoice, payer…"
                        className="h-10 w-full rounded-lg border border-amber-100 bg-white pl-9 pr-3 text-base font-semibold text-[#000435] placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 sm:h-9 sm:text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:contents">
                      <select
                        value={filterInvoice}
                        onChange={(e) => setFilterInvoice(e.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-amber-100 bg-white px-2 text-xs font-bold text-[#000435] outline-none focus:border-amber-400 sm:h-9 sm:min-w-[148px] sm:flex-initial"
                      >
                        <option value="">All invoice statuses</option>
                        {['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'DRAFT'].map((s) => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                      <select
                        value={filterApplicant}
                        onChange={(e) => setFilterApplicant(e.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-amber-100 bg-white px-2 text-xs font-bold text-[#000435] outline-none focus:border-amber-400 sm:h-9 sm:min-w-[140px] sm:flex-initial"
                      >
                        <option value="">All applicant types</option>
                        {applicantOptions.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      <span className="w-full text-center text-xs font-bold text-slate-500 sm:ml-auto sm:w-auto sm:text-left">
                        {filteredRows.length} / {rows.length}
                      </span>
                    </div>
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-[13px] text-slate-800">
                      <thead>
                        <tr className="border-b border-amber-100 bg-gradient-to-r from-amber-50/70 to-white">
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">ID</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Amount</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Applicant</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Purpose</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Invoice</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-3 py-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">View</th>
                          <th className="px-3 py-3 text-right text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="px-3 py-3 font-mono text-xs text-[#000435]">#{r.id}</td>
                            <td className="px-3 py-3 font-bold tabular-nums text-slate-900">{formatRwf(r.total_rwf)} RWF</td>
                            <td className="px-3 py-3 text-xs capitalize text-slate-700">{r.applicant_category || '—'}</td>
                            <td className="px-3 py-3 text-xs text-slate-600 max-w-[160px] truncate">{r.purpose || '—'}</td>
                            <td className="px-3 py-3 font-mono text-xs text-slate-700">{r.invoice_no || '—'}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${statusChipClass(r.invoice_status)}`}>
                                {r.invoice_status || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openDetail(r.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#000435] hover:bg-amber-100"
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
                                    className="rounded-md border border-amber-100 bg-white px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[#000435] hover:bg-amber-50 disabled:opacity-40"
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

                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredRows.map((r) => (
                      <div key={r.id} className="p-4 space-y-3">
                        <div className="flex justify-between gap-2">
                          <span className="font-mono text-xs text-[#000435]">#{r.id}</span>
                          <span className="font-mono text-sm font-black text-slate-900">{formatRwf(r.total_rwf)} RWF</span>
                        </div>
                        <p className="text-xs text-slate-600 capitalize">{r.applicant_category || '—'}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{r.purpose || '—'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${statusChipClass(r.invoice_status)}`}>{r.invoice_status || '—'}</span>
                          <span className="font-mono text-[10px] text-slate-400">{r.invoice_no || '—'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <button type="button" onClick={() => openDetail(r.id)} className="col-span-2 min-h-[44px] touch-manipulation rounded-lg border border-amber-300 bg-amber-50 py-2.5 text-xs font-black text-[#000435] hover:bg-amber-100 sm:col-span-1 sm:flex-1">
                            View
                          </button>
                          {['approve', 'reject', 'request_info', 'mark_disbursed'].map((a) => (
                            <button
                              key={a}
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => act(r.id, a)}
                              className="min-h-[40px] touch-manipulation rounded-lg border border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-700 disabled:opacity-40 sm:min-h-0 sm:py-1.5"
                            >
                              {a.split('_')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {loading && (
                    <div className="flex justify-center py-16 text-[#000435]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                  {!loading && !filteredRows.length && (
                    <div className="py-16 text-center text-sm text-slate-500">No requests match your filters.</div>
                  )}
                </div>
              </div>
            )}

            {activeNav === 'analytics' && (
              <div className="mx-auto max-w-7xl space-y-5">
                <Panel title="Analytics workspace" subtitle="Built live from your organization’s request feed (same data as Dashboard)">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Charts and rankings update when you press Refresh. For deeper reporting, export from your core banking or ask Babyeyi for extended APIs.
                  </p>
                </Panel>
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <Panel title="Applicant mix" subtitle="Counts">
                    <div className="space-y-2">
                      {analytics.applicantSorted.length === 0 ? (
                        <p className="text-sm text-slate-500">No data.</p>
                      ) : (
                        analytics.applicantSorted.map(([label, count]) => (
                          <div key={label} className="flex items-center justify-between text-sm font-bold">
                            <span className="text-slate-700">{label}</span>
                            <span className="font-mono text-[#000435]">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                  <Panel title="Financing status (payload)" subtitle="Latest snapshot per row">
                    <div className="space-y-2">
                      {analytics.financingSorted.length === 0 ? (
                        <p className="text-sm text-slate-500">No data.</p>
                      ) : (
                        analytics.financingSorted.map(([k, v]) => (
                          <div key={k} className="flex justify-between text-sm font-bold">
                            <span className="text-slate-700">{k}</span>
                            <span className="font-mono text-[#000435]">{v}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {activeNav === 'notifications' && (
              <div className="mx-auto max-w-5xl space-y-4">
                <Panel
                  title="Request notifications"
                  subtitle="Pending requests that need partner action"
                  right={<span className="max-w-full text-right text-xs font-black leading-snug text-amber-700">{pendingRows.length} pending · {unreadCount} unread</span>}
                >
                  {pendingRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">No pending request notifications right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {pendingRows.map((r) => (
                        <div
                          key={`notif-${r.id}`}
                          className={`rounded-xl border px-3 py-3 flex flex-wrap items-center gap-2 ${
                            unreadPendingIds.includes(Number(r.id))
                              ? 'border-amber-300 bg-amber-50/90'
                              : 'border-amber-100 bg-white'
                          }`}
                        >
                          <span className="font-mono text-xs text-[#000435]">#{r.id}</span>
                          <span className="font-mono text-xs text-slate-700">{r.invoice_no || 'No invoice number'}</span>
                          <span className="text-xs text-slate-600">{r.purpose || 'School financing request'}</span>
                          <span className="ml-auto font-mono text-sm font-black text-slate-900">{formatRwf(r.total_rwf)} RWF</span>
                          {unreadPendingIds.includes(Number(r.id)) && (
                            <span className="rounded-full border border-[#000435]/30 bg-white px-2 py-0.5 text-[10px] font-black text-[#000435]">NEW</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openDetail(r.id)}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#000435] hover:bg-amber-100"
                          >
                            View request
                          </button>
                          {unreadPendingIds.includes(Number(r.id)) && (
                            <button
                              type="button"
                              onClick={() => markRequestSeen(r.id)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                            >
                              Mark seen
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {activeNav === 'settings' && (
              <div className="mx-auto max-w-2xl">
                <Panel title="Organization profile" subtitle="From partner session /me">
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Name</dt>
                      <dd className="mt-1 font-bold text-slate-900">{me?.org_name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Type</dt>
                      <dd className="mt-1 font-bold text-slate-800">{me?.org_type || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Contact</dt>
                      <dd className="mt-1 font-bold text-slate-800">{me?.contact_email || '—'}</dd>
                      <dd className="mt-0.5 font-bold text-slate-800">{me?.contact_phone || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase ${me?.is_active ? 'border-amber-300 bg-amber-50 text-[#000435]' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
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

      {/* Detail drawer — full-width on small screens, safe areas for notched devices */}
      {detailId != null && (
        <div className="fixed inset-0 z-[400] flex justify-end bg-black/40 backdrop-blur-sm p-0 sm:p-0" role="dialog" aria-modal="true" aria-labelledby="sa-detail-title">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label="Close panel" onClick={closeDetail} />
          <div
            className="relative z-[410] flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl sm:h-full sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ background: NAVY }}
              className="flex shrink-0 items-start gap-3 border-b-[3px] border-amber-400 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 text-white"
            >
              <div className="min-w-0 flex-1">
                <p id="sa-detail-title" className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/70">Request & invoice</p>
                <p className="truncate text-lg font-black">
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
                className="shrink-0 rounded-lg border border-white/25 p-2 text-white/90 hover:bg-white/10"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4 space-y-4 bg-gradient-to-b from-white to-amber-50/30 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {detailLoading && (
                <div className="flex justify-center py-16 text-[#000435]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {detailErr && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{detailErr}</div>
              )}
              {!detailLoading && detail && !detailErr && (
                <>
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800/80">Amount (RWF)</p>
                        <p className="text-3xl font-black tabular-nums text-[#000435]">{Number(detail.total_rwf || 0).toLocaleString()}</p>
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

                  {showSchoolDepositCard && (
                    <SectionCard icon={Wallet} title="School deposit / collection account">
                      {hasSchoolDepositFields ? (
                        <>
                          <DetailRow label="Bank" value={detail.deposit_bank_name} />
                          <DetailRow label="Account number" value={detail.deposit_account_number} mono />
                          <DetailRow label="Account name" value={detail.deposit_account_name} />
                          <DetailRow label="Branch" value={detail.deposit_bank_branch} />
                        </>
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Applicant chose disbursement to the school’s account, but no bank details are stored on this school’s Babyeyi document. Confirm the correct deposit account with the school before transferring funds.
                        </p>
                      )}
                    </SectionCard>
                  )}

                  <SectionCard icon={User} title="Payer / contact">
                    <DetailRow label="Name" value={detail.payer_name} />
                    <DetailRow label="Phone" value={detail.payer_phone} />
                    <DetailRow label="Email" value={detail.payer_email} />
                  </SectionCard>

                  {hasApplicantProfile && (
                    <SectionCard icon={User} title="Applicant profile">
                      <DetailRow label="Full name" value={applicantProfile.fullName} />
                      <DetailRow label="National ID" value={applicantProfile.nationalId} mono />
                      <DetailRow label="Email" value={applicantProfile.email} />
                      <DetailRow label="Phone (SMS updates)" value={applicantProfile.phone} />
                      <DetailRow label="Occupation" value={applicantProfile.occupation} />
                      <DetailRow label="District / residence" value={applicantProfile.district} />
                    </SectionCard>
                  )}

                  <SectionCard icon={Wallet} title="ShuleAvance application">
                    <DetailRow label="Organization" value={sa.organization_name} />
                    <DetailRow label="Notification email" value={sa.applicant_notification_email} />
                    <DetailRow label="Purpose" value={sa.purpose} />
                    <DetailRow label="Repayment (months)" value={sa.repayment_period_months} />
                    <DetailRow label="Disbursement preference" value={disburseLabel(prefRaw || 'school_account')} />
                    {disburseTarget && (prefNorm === 'personal_account' || prefNorm === 'other') ? (
                      <DetailRow
                        label={prefNorm === 'personal_account' ? 'Personal account / MoMo (disbursement)' : 'Disbursement instructions'}
                        value={disburseTarget}
                        mono={prefNorm === 'personal_account'}
                      />
                    ) : null}
                    <DetailRow label="Supporting note" value={sa.supporting_note} />
                    <DetailRow label="Routing summary" value={sa.routing_summary} />
                    <DetailRow label="Financing status" value={sa.financing_request_status} />
                    {sa.partner_last_note ? <DetailRow label="Partner note" value={sa.partner_last_note} /> : null}
                  </SectionCard>

                  {Array.isArray(sa.approval_history) && sa.approval_history.length > 0 && (
                    <SectionCard icon={Calendar} title="Approval history">
                      <ul className="space-y-2">
                        {sa.approval_history.map((h, i) => (
                          <li key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                            <span className="font-extrabold uppercase text-[#000435]">{h.action || '—'}</span>
                            {h.at && <span className="ml-2 text-slate-500">{new Date(h.at).toLocaleString()}</span>}
                            {h.note && <p className="mt-1 text-slate-700">{h.note}</p>}
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {students.length > 0 && (
                    <SectionCard icon={School} title="Students in this payment">
                      {students.map((st, i) => (
                        <div key={i} className="mb-2 rounded-lg border border-amber-100 bg-white p-3 text-xs last:mb-0 space-y-1">
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

                  <div className="flex flex-col gap-2 border-t border-amber-100 pt-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-800 hover:bg-amber-50/50"
                    >
                      Close
                    </button>
                    {invoicePdfHref && (
                      <a
                        href={invoicePdfHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-amber-400 bg-amber-50 py-3 text-sm font-black text-[#000435] hover:bg-amber-100"
                      >
                        Open PDF <ChevronRight size={16} />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-6 sm:flex sm:flex-wrap">
                    {['approve', 'reject', 'request_info', 'mark_disbursed'].map((a) => (
                      <button
                        key={a}
                        type="button"
                        disabled={busyId === detailId}
                        onClick={() => act(detailId, a)}
                        className="min-h-[44px] touch-manipulation rounded-xl border border-amber-200 bg-white py-2.5 text-[10px] font-extrabold uppercase tracking-wide text-[#000435] hover:bg-amber-50 hover:border-amber-300 disabled:opacity-40 sm:min-w-[120px] sm:flex-1 sm:text-[11px]"
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
