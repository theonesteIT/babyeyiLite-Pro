import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import {
  fetchRepresentativeStoreOverview,
  fetchRepresentativeStoreInventory,
  fetchRepresentativeStoreSuppliers,
  fetchRepresentativeStoreMovements,
} from '../services/api';
import {
  Package,
  Truck,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Search,
  ChevronDown,
  RefreshCw,
  BarChart3,
  Boxes,
  RotateCcw,
  Warehouse,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Loader2,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'movements', label: 'Stock In / Out', icon: ArrowDownToLine },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
];

function fmtMoney(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-RW');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-RW', { day: '2-digit', month: 'short', year: 'numeric' });
}

function OverviewTab({ schoolId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRepresentativeStoreOverview(schoolId)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-re-text-muted animate-spin" /></div>;
  if (!data) return <div className="text-center py-12 text-re-text-muted">No data available</div>;

  const { school_breakdown } = data;

  return (
    <div className="space-y-6">
      {school_breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h3 className="text-xs font-semibold text-re-text uppercase tracking-widest">
              {school_breakdown.length > 1 ? 'School-by-School Breakdown' : 'Store Summary'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                  <th className="text-left px-5 py-3 font-semibold">School</th>
                  <th className="text-right px-4 py-3 font-semibold">Items</th>
                  <th className="text-right px-4 py-3 font-semibold">Stock Value</th>
                  <th className="text-right px-4 py-3 font-semibold">Low Stock</th>
                  <th className="text-right px-4 py-3 font-semibold">Suppliers</th>
                  <th className="text-right px-4 py-3 font-semibold">In (30d)</th>
                  <th className="text-right px-5 py-3 font-semibold">Out (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {school_breakdown.map((s) => (
                  <tr key={s.school_id} className="hover:bg-re-bg/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-re-text">{s.school_name}</td>
                    <td className="text-right px-4 py-3 text-re-text-muted">{s.item_count}</td>
                    <td className="text-right px-4 py-3 text-re-text-muted">{fmtMoney(s.total_value)}</td>
                    <td className="text-right px-4 py-3">
                      {s.low_stock > 0 ? <span className="text-amber-600 font-semibold">{s.low_stock}</span> : <span className="text-re-text-muted">0</span>}
                    </td>
                    <td className="text-right px-4 py-3 text-re-text-muted">{s.suppliers}</td>
                    <td className="text-right px-4 py-3 text-teal-600 font-medium">{fmtMoney(s.stock_in_30d)}</td>
                    <td className="text-right px-5 py-3 text-rose-600 font-medium">{fmtMoney(s.stock_out_30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {school_breakdown.length === 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-10 text-center">
          <Warehouse className="w-10 h-10 text-re-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-re-text-muted font-medium">No inventory data found for the selected school(s)</p>
        </div>
      )}
    </div>
  );
}

function InventoryTab({ schoolId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRepresentativeStoreInventory(schoolId)
      .then((res) => { if (!cancelled) setItems(res.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (catFilter) list = list.filter((i) => i.category === catFilter);
    if (stockFilter === 'low') list = list.filter((i) => i.low_stock);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, catFilter, stockFilter, search]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-re-text-muted animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
          <input type="text" placeholder="Search item name or category..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 bg-white" />
        </div>
        <div className="relative">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 rounded-xl border border-black/10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 cursor-pointer">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted pointer-events-none" />
        </div>
        <div className="flex gap-1 bg-re-bg rounded-xl p-0.5 border border-black/5">
          {[{ v: 'all', l: 'All' }, { v: 'low', l: 'Low Stock' }].map((f) => (
            <button key={f.v} onClick={() => setStockFilter(f.v)}
              className={`px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${stockFilter === f.v ? 'bg-white text-re-text shadow-sm' : 'text-re-text-muted'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                <th className="text-left px-5 py-3 font-semibold">Item</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">School</th>
                <th className="text-right px-4 py-3 font-semibold">Qty</th>
                <th className="text-right px-4 py-3 font-semibold">Reorder</th>
                <th className="text-right px-4 py-3 font-semibold">Unit Cost</th>
                <th className="text-right px-4 py-3 font-semibold">Total Value</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Location</th>
                <th className="text-center px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {filtered.map((item) => (
                <tr key={`${item.school_id}-${item.id}`} className="hover:bg-re-bg/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-re-text">{item.name}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 bg-re-bg rounded text-re-text-muted">{item.category || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-re-text-muted text-xs hidden md:table-cell">{item.school_name}</td>
                  <td className="text-right px-4 py-3 font-semibold text-re-text">{fmtMoney(item.quantity)} <span className="text-[10px] text-re-text-muted">{item.unit}</span></td>
                  <td className="text-right px-4 py-3 text-re-text-muted">{fmtMoney(item.reorder_level)}</td>
                  <td className="text-right px-4 py-3 text-re-text-muted">{fmtMoney(item.unit_cost)}</td>
                  <td className="text-right px-4 py-3 font-semibold text-re-text">{fmtMoney(item.total_value)}</td>
                  <td className="px-4 py-3 text-xs text-re-text-muted hidden lg:table-cell">{item.location || '—'}</td>
                  <td className="text-center px-5 py-3">
                    {item.low_stock ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">Low</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-re-text-muted">No inventory items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-black/5 text-[10px] text-re-text-muted font-semibold uppercase tracking-wider">
            Showing {filtered.length} of {items.length} items
          </div>
        )}
      </div>
    </div>
  );
}

function MovementsTab({ schoolId }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchRepresentativeStoreMovements(schoolId, { type: typeFilter || undefined })
      .then((res) => setMovements(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolId, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return movements;
    const q = search.toLowerCase();
    return movements.filter((m) => m.item_name.toLowerCase().includes(q) || m.ref.toLowerCase().includes(q));
  }, [movements, search]);

  const typeBadge = (type) => {
    switch (type) {
      case 'stock_in': return { label: 'Stock In', cls: 'bg-teal-100 text-teal-700', icon: ArrowDownToLine };
      case 'stock_out': return { label: 'Stock Out', cls: 'bg-rose-100 text-rose-700', icon: ArrowUpFromLine };
      case 'returned': return { label: 'Returned', cls: 'bg-blue-100 text-blue-700', icon: RotateCcw };
      default: return { label: 'Adjusted', cls: 'bg-slate-100 text-slate-600', icon: Package };
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-re-text-muted animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
          <input type="text" placeholder="Search item or reference..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 bg-white" />
        </div>
        <div className="flex gap-1 bg-re-bg rounded-xl p-0.5 border border-black/5">
          {[
            { v: '', l: 'All' },
            { v: 'stock_in', l: 'Stock In' },
            { v: 'stock_out', l: 'Stock Out' },
            { v: 'returned', l: 'Returned' },
          ].map((f) => (
            <button key={f.v} onClick={() => setTypeFilter(f.v)}
              className={`px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                typeFilter === f.v ? 'bg-white text-re-text shadow-sm' : 'text-re-text-muted'
              }`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-re-text-muted uppercase tracking-wider border-b border-black/5">
                <th className="text-left px-5 py-3 font-semibold">Item</th>
                <th className="text-center px-4 py-3 font-semibold">Type</th>
                <th className="text-right px-4 py-3 font-semibold">Qty</th>
                <th className="text-right px-4 py-3 font-semibold">Stock After</th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Unit Cost</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Reference</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">School</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {filtered.map((m) => {
                const badge = typeBadge(m.type);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={m.id} className="hover:bg-re-bg/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-re-text">{m.item_name}</p>
                      {m.note && <p className="text-[10px] text-re-text-muted truncate max-w-[200px]">{m.note}</p>}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                        <BadgeIcon size={11} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 font-semibold text-re-text">{fmtMoney(m.quantity)}</td>
                    <td className="text-right px-4 py-3 text-re-text-muted">{fmtMoney(m.stock_after)}</td>
                    <td className="text-right px-4 py-3 text-re-text-muted hidden md:table-cell">{m.unit_cost > 0 ? fmtMoney(m.unit_cost) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-re-text-muted hidden md:table-cell">{m.ref || '—'}</td>
                    <td className="px-4 py-3 text-xs text-re-text-muted hidden lg:table-cell">{m.school_name}</td>
                    <td className="px-5 py-3 text-xs text-re-text-muted">{fmtDate(m.date)}</td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-re-text-muted">No stock movements found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-black/5 text-[10px] text-re-text-muted font-semibold uppercase tracking-wider">
            Showing {filtered.length} movements
          </div>
        )}
      </div>
    </div>
  );
}

function SuppliersTab({ schoolId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRepresentativeStoreSuppliers(schoolId)
      .then((res) => { if (!cancelled) setSuppliers(res.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || (s.categories || '').toLowerCase().includes(q) || (s.contact_person || '').toLowerCase().includes(q));
  }, [suppliers, search]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-re-text-muted animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-re-text-muted" />
        <input type="text" placeholder="Search supplier name, category, or contact..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#FEBF10]/40 bg-white" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={`${s.school_id}-${s.id}`} className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-re-text">{s.name}</h4>
                  <p className="text-[10px] text-re-text-muted mt-0.5">{s.school_name}</p>
                </div>
                <div className="p-2 rounded-xl bg-[#FEBF10]/10">
                  <Truck size={16} className="text-[#1E3A5F]" />
                </div>
              </div>
              {s.categories && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.categories.split(',').map((c, i) => (
                    <span key={i} className="text-[10px] bg-re-bg text-re-text-muted font-semibold rounded px-2 py-0.5">{c.trim()}</span>
                  ))}
                </div>
              )}
              <div className="space-y-1.5 text-xs text-re-text-muted">
                {s.contact_person && <div className="flex items-center gap-2"><Users size={13} className="opacity-50" />{s.contact_person}</div>}
                {s.phone && <div className="flex items-center gap-2"><Phone size={13} className="opacity-50" />{s.phone}</div>}
                {s.email && <div className="flex items-center gap-2"><Mail size={13} className="opacity-50" />{s.email}</div>}
                {s.address && <div className="flex items-center gap-2"><MapPin size={13} className="opacity-50" /><span className="truncate">{s.address}</span></div>}
              </div>
              {s.note && <p className="text-[10px] text-re-text-muted mt-3 italic line-clamp-2">{s.note}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-10 text-center">
          <Truck className="w-10 h-10 text-re-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-re-text-muted font-medium">No suppliers found</p>
        </div>
      )}
    </div>
  );
}

export default function RepresentativeStoreInventory() {
  const { activeSchoolId, activeSchool } = useRepresentativeData();
  const [tab, setTab] = useState('overview');
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadKpis = useCallback(() => {
    setLoading(true);
    fetchRepresentativeStoreOverview(activeSchoolId)
      .then((res) => setKpiData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeSchoolId]);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  const kpis = kpiData ? [
    { key: 'ti', label: 'Total items', value: fmtMoney(kpiData.kpis.total_items), icon: Boxes },
    { key: 'tv', label: 'Stock value (RWF)', value: fmtMoney(kpiData.kpis.total_value), icon: DollarSign },
    { key: 'ls', label: 'Low stock', value: fmtMoney(kpiData.kpis.low_stock), icon: AlertTriangle },
    { key: 'sp', label: 'Suppliers', value: fmtMoney(kpiData.kpis.total_suppliers), icon: Truck },
    { key: 'si', label: 'Stock in (30d)', value: fmtMoney(kpiData.kpis.stock_in_30d), icon: ArrowDownToLine },
    { key: 'so', label: 'Stock out (30d)', value: fmtMoney(kpiData.kpis.stock_out_30d), icon: ArrowUpFromLine },
  ] : [
    { key: 'ti', label: 'Total items', value: '—', icon: Boxes },
    { key: 'tv', label: 'Stock value', value: '—', icon: DollarSign },
    { key: 'ls', label: 'Low stock', value: '—', icon: AlertTriangle },
    { key: 'sp', label: 'Suppliers', value: '—', icon: Truck },
    { key: 'si', label: 'Stock in (30d)', value: '—', icon: ArrowDownToLine },
    { key: 'so', label: 'Stock out (30d)', value: '—', icon: ArrowUpFromLine },
  ];

  return (
    <RepresentativeHeroShell
      onRefresh={loadKpis}
      eyebrow={activeSchool ? `Store · ${activeSchool.school_name}` : 'Store & Inventory'}
      title="Store Reports"
      subtitle="Monitor inventory levels, stock movements, and supplier information across your assigned schools."
      HeroIcon={Warehouse}
      headerRight={
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/35">
            {loading ? <Loader2 size={12} className="animate-spin mr-1.5" /> : null}
            {loading ? 'Loading' : 'Live data'}
          </span>
        </div>
      }
      kpiTiles={kpis}
      pageBody={
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 pb-10">
          <div className="flex gap-1 bg-white rounded-2xl border border-black/[0.06] p-1 shadow-sm overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                  tab === t.id ? 'bg-[#FEBF10]/15 text-[#1E3A5F] ring-1 ring-[#FEBF10]/30' : 'text-re-text-muted hover:text-re-text hover:bg-re-bg/50'
                }`}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && <OverviewTab schoolId={activeSchoolId} />}
          {tab === 'inventory' && <InventoryTab schoolId={activeSchoolId} />}
          {tab === 'movements' && <MovementsTab schoolId={activeSchoolId} />}
          {tab === 'suppliers' && <SuppliersTab schoolId={activeSchoolId} />}
        </div>
      }
    />
  );
}
