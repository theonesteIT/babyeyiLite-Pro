import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowRight, ClipboardList, Loader2,
  Package, RefreshCw, Tag, TrendingUp, ArrowDown, ArrowUp,
  Activity, PieChart, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import { useAuth } from '../context/AuthContext';
import StorekeeperOchreHero from '../components/StorekeeperOchreHero';
import { h } from '../utils/href';

function fmtMoney(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function fmtDateTime(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function toN(v, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }

const DonutChart = ({ data = [], size = 140 }) => {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2, cy = size / 2, R = size / 2 - 8, r = R * 0.58;
  if (total === 0) return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={R} fill="#f1f5f9" stroke="white" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r - 4} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">0</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">ITEMS</text>
    </svg>
  );
  const slices = data.reduce((acc, d) => {
    let a = (d.value / total) * 2 * Math.PI;
    if (a >= 2 * Math.PI) a = Math.PI * 1.9999;
    const s = acc.angle, e = s + a;
    const x1 = cx + R * Math.cos(s), y1 = cy + R * Math.sin(s);
    const x2 = cx + R * Math.cos(e), y2 = cy + R * Math.sin(e);
    const xi1 = cx + r * Math.cos(s), yi1 = cy + r * Math.sin(s);
    const xi2 = cx + r * Math.cos(e), yi2 = cy + r * Math.sin(e);
    const large = a > Math.PI ? 1 : 0;
    acc.slices.push({ ...d, path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z` });
    return { angle: e, slices: acc.slices };
  }, { angle: -Math.PI / 2, slices: [] }).slices;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />)}
      <circle cx={cx} cy={cy} r={r - 4} fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">ITEMS</text>
    </svg>
  );
};

const OverviewCard = ({ title, icon: Icon, iconColor, dataPie, subStats }) => (
  <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 flex flex-col items-center relative w-full">
    <div className="flex items-center justify-between gap-2 mb-6 w-full">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Live</span>
    </div>
    <DonutChart data={dataPie} size={150} />
    <div className="w-full mt-6 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[#1E3A5F] font-semibold tabular-nums">{subStats.left.count}</span>
          <span className="text-[8px] font-semibold text-slate-400 mt-0.5 tracking-[0.16em]">{subStats.left.label}</span>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="flex flex-col items-center flex-1">
          <span className="text-amber-600 font-semibold tabular-nums">{subStats.right.count}</span>
          <span className="text-[8px] font-semibold text-slate-400 mt-0.5 tracking-[0.16em]">{subStats.right.label}</span>
        </div>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { staff } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, movRes, reqRes] = await Promise.allSettled([
        api.get('/store/inventory'),
        api.get('/store/movements'),
        api.get('/store/requisitions'),
      ]);
      const inventory = invRes.status === 'fulfilled' && invRes.value.data?.success ? invRes.value.data.data || [] : [];
      const movements = movRes.status === 'fulfilled' && movRes.value.data?.success ? movRes.value.data.data || [] : [];
      let requisitions = reqRes.status === 'fulfilled' && reqRes.value.data?.success ? reqRes.value.data.data || [] : [];
      if (!requisitions.length) {
        try {
          const r2 = await api.get('/accountant/requisitions');
          if (r2.data?.success) requisitions = r2.data.data || [];
        } catch { /* ignore */ }
      }
      setData({ inventory, movements, requisitions });
      setLastUpdated(new Date());
    } catch (e) {
      setError('Could not reach store services. Showing limited data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const derived = useMemo(() => {
    if (!data) return null;
    const { inventory, movements, requisitions } = data;
    const lowStock = inventory.filter(i => toN(i.reorder_level) > 0 && toN(i.quantity) <= toN(i.reorder_level) && toN(i.quantity) > 0);
    const outOfStock = inventory.filter(i => toN(i.quantity) === 0);
    const okStock = inventory.filter(i => {
      const q = toN(i.quantity);
      const rl = toN(i.reorder_level);
      return q > 0 && (rl <= 0 || q > rl);
    });
    const totalValue = inventory.reduce((s, i) => s + toN(i.quantity) * toN(i.unit_cost), 0);
    const pendingReqs = requisitions.filter(r => r.status === 'pending');
    const recentMovements = [...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);
    const categoryBreakdown = inventory.reduce((acc, i) => {
      const c = i.category || 'Other';
      acc[c] = (acc[c] || 0) + toN(i.quantity) * toN(i.unit_cost);
      return acc;
    }, {});
    const topCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ label: k, value: v }));
    const stockPie = [
      { label: 'OK', value: okStock.length, color: '#1E3A5F' },
      { label: 'Low', value: lowStock.length, color: '#f59e0b' },
      { label: 'Out', value: outOfStock.length, color: '#ef4444' },
    ];
    return {
      lowStock, outOfStock, totalValue, totalItems: inventory.length, pendingReqs, recentMovements, topCategories, inventory, stockPie,
    };
  }, [data]);

  const dashHeroStats = useMemo(() => {
    const low = derived?.lowStock?.length ?? 0;
    const out = derived?.outOfStock?.length ?? 0;
    const alerts = low + out;
    return [
      {
        label: 'Total items',
        value: String(derived?.totalItems ?? '—'),
        icon: Package,
        onClick: () => navigate(h('/inventory')),
      },
      {
        label: 'Stock value',
        value: derived ? fmtMoney(derived.totalValue) : '—',
        icon: TrendingUp,
        onClick: () => navigate(h('/inventory')),
      },
      {
        label: 'Restock alerts',
        value: String(alerts),
        icon: AlertTriangle,
        onClick: () => navigate(h('/inventory')),
      },
      {
        label: 'Pending reqs',
        value: String(derived?.pendingReqs?.length ?? '—'),
        icon: ClipboardList,
        onClick: () => navigate(h('/requisitions')),
      },
    ];
  }, [derived, navigate]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-re-bg">
        <Loader2 className="animate-spin text-re-navy opacity-40" />
      </div>
    );
  }

  const displayName = staff?.name || [staff?.first_name, staff?.last_name].filter(Boolean).join(' ') || staff?.email || 'Storekeeper';

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-full pb-24 lg:pb-10 w-full">
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <StorekeeperOchreHero
        eyebrow={PORTAL.brandLine}
        titleLine="Store"
        titleAccent="Overview"
        subtitle={`School store snapshot · ${displayName}`}
        icon={Package}
        rightSlot={
          <>
            <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/90">
                {loading ? 'Updating…' : error ? 'Limited' : 'Live store'}
              </span>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </>
        }
      />

      {lastUpdated && (
        <p className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 -mt-8 sm:-mt-10 relative z-[15] text-[10px] font-semibold uppercase tracking-widest text-re-text-muted/80">
          Last updated {fmtDateTime(lastUpdated)}
        </p>
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6 sm:mb-8">
        <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
              {dashHeroStats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
                >
                  <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                    <stat.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="text-sm sm:text-lg font-semibold text-re-text tracking-tight tabular-nums group-hover:text-[#1E3A5F] transition-colors">
                    {stat.value}
                  </span>
                  <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
                    {stat.label}
                  </p>
                </button>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <Link
                to={h('/inventory')}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                Inventory
              </Link>
              <Link
                to={h('/movements')}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-semibold text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
              >
                Movements
              </Link>
              <Link
                to={h('/requisitions')}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-semibold text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all"
              >
                Requisitions
              </Link>
            </div>
            <div className="lg:hidden grid grid-cols-3 gap-2 p-4 border-t border-black/5 bg-white">
              <Link
                to={h('/inventory')}
                className="h-10 rounded-xl text-[9px] font-semibold uppercase tracking-widest text-white text-center flex items-center justify-center border border-black/10"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                Stock
              </Link>
              <Link
                to={h('/movements')}
                className="h-10 rounded-xl text-[9px] font-semibold uppercase tracking-widest text-[#1E3A5F] border border-black/10 bg-white flex items-center justify-center"
              >
                Moves
              </Link>
              <Link
                to={h('/requisitions')}
                className="h-10 rounded-xl text-[9px] font-semibold uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 flex items-center justify-center"
              >
                Reqs
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8 relative z-10 pb-14" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {error && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-white rounded-[24px] shadow-sm border border-black/10 overflow-hidden grid grid-cols-2">
              <Link to={h('/inventory')} className="p-5 flex flex-col items-center justify-center text-center border-gray-100 border-r border-b hover:bg-slate-50/60 transition-all active:scale-[0.99]">
                <span className="text-xl md:text-2xl font-semibold tracking-tight text-[#1E3A5F] tabular-nums">{derived?.totalItems ?? '—'}</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 opacity-70">Total Items</p>
              </Link>
              <Link to={h('/inventory')} className="p-5 flex flex-col items-center justify-center text-center border-gray-100 border-b hover:bg-slate-50/60 transition-all active:scale-[0.99]">
                <span className="text-xl md:text-2xl font-semibold tracking-tight text-[#1E3A5F] tabular-nums">{derived ? fmtMoney(derived.totalValue) : '—'}</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 opacity-70">Stock Value</p>
              </Link>

              <div className="p-3.5 flex flex-col justify-center items-center text-center border-gray-100 border-r">
                <span className="text-lg md:text-xl font-semibold tracking-tighter text-[#1E3A5F] leading-none">
                  {(derived?.lowStock?.length || 0) + (derived?.outOfStock?.length || 0)}
                </span>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-1 opacity-70 text-center w-full">Items to restock</p>
                <div className="w-full h-px bg-slate-100 my-2" />
                <div className="flex flex-col gap-1 text-[8.5px] font-bold text-slate-500 w-full bg-slate-50 rounded-lg py-1.5 px-2 border border-slate-100">
                  <div className="flex justify-between w-full">
                    <span className="uppercase tracking-widest">Low stock</span>
                    <span className="font-semibold text-amber-600">{derived?.lowStock?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span className="uppercase tracking-widest">Out of stock</span>
                    <span className="font-semibold text-red-500">{derived?.outOfStock?.length ?? 0}</span>
                  </div>
                </div>
              </div>

              <Link to={h('/requisitions')} className="p-5 flex flex-col items-center justify-center text-center border-gray-100 hover:bg-slate-50/60 transition-all active:scale-[0.99]">
                <span className="text-xl md:text-2xl font-semibold tracking-tighter text-[#1E3A5F]">{derived?.pendingReqs?.length ?? '—'}</span>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 opacity-70">Pending Requisitions</p>
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                  <Tag className="w-4 h-4" style={{ color: '#FEBF10' }} /> Value by category
                </h3>
              </div>
              <div className="space-y-3">
                {(derived?.topCategories || []).length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-300">No inventory yet — add items under Inventory.</p>
                ) : derived.topCategories.map((c, i) => {
                  const max = derived.topCategories[0].value;
                  const pct = max > 0 ? Math.round((c.value / max) * 100) : 0;
                  return (
                    <div key={c.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-slate-600">{c.label}</span>
                        <span className="text-[10px] font-semibold text-slate-800">{fmtMoney(c.value)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#1E3A5F' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-[11px] uppercase tracking-widest">
                  <Activity className="w-4 h-4 text-amber-500" /> Quick store actions
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { icon: Package, label: 'Inventory', sub: 'Items, quantities, reorder levels', to: h('/inventory'), c: '#1E3A5F' },
                  { icon: ArrowDownCircle, label: 'Stock movements', sub: 'Receive, issue, adjust stock', to: h('/movements'), c: '#FEBF10' },
                  { icon: ClipboardList, label: 'Requisitions', sub: 'Department requests', to: h('/requisitions'), c: '#f59e0b' },
                ].map(({ icon: Icon, label, sub, to, c }) => (
                  <Link key={to} to={to} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#1E3A5F] group-hover:text-white transition-all">
                      <Icon size={16} style={{ color: c }} className="group-hover:!text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm tracking-tight">{label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sub}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-[#1E3A5F] shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <OverviewCard
              title="Stock health"
              icon={PieChart}
              iconColor="text-[#FEBF10]"
              dataPie={derived?.stockPie || []}
              subStats={{
                left: { count: derived?.stockPie?.[0]?.value ?? 0, label: 'OK level' },
                right: { count: (derived?.lowStock?.length || 0) + (derived?.outOfStock?.length || 0), label: 'Needs attention' },
              }}
            />

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={13} className="text-[#1E3A5F]" /> Pending requisitions
                </h3>
                <Link to={h('/requisitions')} className="text-[9px] font-semibold text-[#1E3A5F] uppercase hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {!derived?.pendingReqs?.length ? (
                  <div className="px-5 py-6 text-[11px] font-bold text-slate-400">No pending requisitions.</div>
                ) : derived.pendingReqs.slice(0, 5).map((r) => (
                  <div key={r.id} className="px-5 py-3.5 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{r.dept} · {r.requester}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">{r.items}</p>
                      </div>
                      <span className="text-[9px] font-semibold text-[#1E3A5F] bg-[#1E3A5F]/5 px-2 py-0.5 rounded-lg shrink-0">{fmtMoney(r.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={13} className="text-[#FEBF10]" /> Recent movements
                </h3>
                <Link to={h('/movements')} className="text-[9px] font-semibold text-[#1E3A5F] uppercase hover:underline">View all</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {!derived?.recentMovements?.length ? (
                  <div className="px-5 py-6 text-[11px] font-bold text-slate-400">No movements yet.</div>
                ) : derived.recentMovements.map((m, i) => {
                  const isIn = m.type === 'received' || m.type === 'returned';
                  return (
                    <div key={m.id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-all">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-re-navy/10 text-re-navy' : 'bg-slate-100 text-slate-600'}`}>
                        {isIn ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-[11px] truncate">{m.item_name || 'Item'}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{m.ref ? `Ref: ${m.ref}` : m.note || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-[12px] ${isIn ? 'text-re-navy' : 'text-slate-600'}`}>{isIn ? '+' : '-'}{m.quantity}</p>
                        <p className="text-[9px] font-bold text-slate-400">{fmtDateTime(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="relative rounded-[24px] p-6 text-white shadow-sm border border-white/10 overflow-hidden group cursor-pointer active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #3D5A80 100%)' }}
            >
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <img src={PORTAL.heroImage} alt="" className="w-full h-full object-cover grayscale" />
              </div>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <Package size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs tracking-widest uppercase leading-none opacity-90" style={{ color: '#FEBF10' }}>Next action</h4>
                  <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                    {derived?.pendingReqs?.length
                      ? `${derived.pendingReqs.length} requisition(s) waiting. Confirm stock and issue or update status.`
                      : 'Keep movement records up to date when goods arrive or leave the store.'}
                  </p>
                </div>
                <Link to={h('/requisitions')} className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest group-hover:gap-2.5 transition-all" style={{ color: '#FEBF10' }}>
                  Open requisitions <ArrowRight size={12} />
                </Link>
              </div>
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
