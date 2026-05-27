import { useState, useEffect, useMemo } from "react";
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, XCircle, Clock,
  Wrench, ShoppingCart, BarChart2,   ArrowDownCircle, ArrowUpCircle, ArrowDownUp,
  RefreshCw, Building2, DollarSign, ShieldCheck, CheckCircle2,
  Download, Printer, FileSpreadsheet, Search, Filter, Loader2,
} from "lucide-react";
import api from '../services/api';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';

const ACCENT = "#1E3A5F";
const GOLD   = "#FEBF10";

const CATEGORY_COLORS = ["#1E3A5F","#d97706","#059669","#dc2626","#7c3aed","#0891b2","#db2777","#0f172a"];

const MOVEMENT_TYPE_LABELS = {
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  returned: 'Returned',
  adjusted: 'Adjusted',
};

const NAV_TABS = [
  { id: "dashboard",   label: "Dashboard",     Icon: BarChart2 },
  { id: "stockin",     label: "Stock In",       Icon: ArrowDownCircle },
  { id: "stockout",    label: "Stock Out",      Icon: ArrowUpCircle },
  { id: "returned",    label: "Returned",       Icon: RefreshCw },
  { id: "adjusted",    label: "Adjusted",       Icon: Wrench },
  { id: "allmove",     label: "All Movements",  Icon: ArrowDownUp },
  { id: "lowstock",    label: "Low Stock",      Icon: AlertTriangle },
  { id: "inventory",   label: "All Items",      Icon: Package },
];

function fmtQty(n) { return Number(n || 0).toLocaleString(); }
function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en", { day:"2-digit", month:"short", year:"numeric" });
}

const Badge = ({ label, color = "#059669", bg }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:3, padding:"3px 9px",
    borderRadius:20, fontSize:10, fontWeight:700,
    background: bg || `${color}18`, color,
  }}>{label}</span>
);

/** Same source as storekeeper `Inventory.jsx` / `StockMovements.jsx`: portal `/store/*` + `store_inventory_items`. */
function mapStoreInventoryRow(r) {
  const q = Number(r.quantity) || 0;
  const rl = Number(r.reorder_level) || 0;
  return {
    id: r.id,
    item_name: r.name || '',
    current_qty: q,
    reorder_level: rl,
    category: r.category || '',
    sku: null,
    unit: r.unit || '',
    status: q === 0 ? 'OUT' : rl > 0 && q <= rl ? 'LOW' : 'ACTIVE',
    term: r.term || '',
    academic_year: r.academic_year || '',
    location: r.location || '',
  };
}

function mapStoreMovementRow(m) {
  const t = String(m.type || '').toLowerCase();
  const qty = Math.abs(Number(m.quantity) || 0);
  const isOut = t === 'stock_out';
  const movement_type = isOut ? 'OUT' : 'IN';
  const quantity_change = isOut ? -qty : qty;
  const parts = [m.ref, m.note].map((x) => String(x || '').trim()).filter(Boolean);
  const reason = parts.length ? parts.join(' · ') : '';
  return {
    ...m,
    raw_type: t,
    type_label: MOVEMENT_TYPE_LABELS[t] || t,
    movement_type,
    quantity_change,
    reason,
    movement_date: m.movement_date,
    created_at: m.created_at,
    item_name: m.item_name,
    category: m.item_category || '—',
    unit: '—',
    supplier_name: m.supplier_name || '',
    supplier_id: m.supplier_id || null,
    unit_cost: m.unit_cost,
  };
}

export default function StockReports() {
  const [tab, setTab]           = useState("dashboard");
  const [items, setItems]       = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [storeMeta, setStoreMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setStoreMeta(null);
      try {
        const [iRes, mRes] = await Promise.allSettled([
          api.get('/store/inventory'),
          api.get('/store/movements'),
        ]);
        if (cancelled) return;
        if (iRes.status === 'fulfilled' && iRes.value.data?.success) {
          const raw = Array.isArray(iRes.value.data.data) ? iRes.value.data.data : [];
          setItems(raw.map(mapStoreInventoryRow));
          const meta = iRes.value.data.meta;
          if (meta && (meta.term || meta.academic_year)) setStoreMeta(meta);
        }
        if (mRes.status === 'fulfilled' && mRes.value.data?.success) {
          const raw = Array.isArray(mRes.value.data.data) ? mRes.value.data.data : [];
          setMovements(raw.map(mapStoreMovementRow));
          const invOk = iRes.status === 'fulfilled' && iRes.value.data?.success;
          if (!invOk) {
            const meta = mRes.value.data.meta;
            if (meta && (meta.term || meta.academic_year)) setStoreMeta(meta);
          }
        }
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // ── derived stats ──────────────────────────────────────────
  const stockIn  = useMemo(() => movements.filter(m => m.raw_type === 'stock_in'),  [movements]);
  const stockOut = useMemo(() => movements.filter(m => m.raw_type === 'stock_out'), [movements]);
  const returned = useMemo(() => movements.filter(m => m.raw_type === 'returned'), [movements]);
  const adjusted = useMemo(() => movements.filter(m => m.raw_type === 'adjusted'), [movements]);

  const supplierOptions = useMemo(() => {
    const map = new Map();
    movements.forEach((m) => {
      if (m.supplier_id && m.supplier_name) map.set(String(m.supplier_id), m.supplier_name);
    });
    return [{ id: 'All', name: 'All suppliers' }, ...Array.from(map.entries()).map(([id, name]) => ({ id, name }))];
  }, [movements]);

  const filterBySupplier = (list) => {
    if (supplierFilter === 'All') return list;
    return list.filter((m) => String(m.supplier_id || '') === String(supplierFilter));
  };
  const lowStock = useMemo(() =>
    items.filter(i => Number(i.reorder_level) > 0 && Number(i.current_qty) <= Number(i.reorder_level)),
    [items]);
  const outOfStock = useMemo(() => items.filter(i => Number(i.current_qty) === 0), [items]);

  const totalQty = useMemo(() => items.reduce((s, i) => s + (Number(i.current_qty) || 0), 0), [items]);

  const categoryData = useMemo(() => {
    const cats = {};
    items.forEach(i => {
      const c = i.category || 'Uncategorized';
      if (!cats[c]) cats[c] = 0;
      cats[c]++;
    });
    return Object.entries(cats)
      .map(([name, count], idx) => ({ name, count, pct: items.length ? Math.round((count/items.length)*100) : 0, color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.count - a.count).slice(0, 7);
  }, [items]);

  const monthlyData = useMemo(() => {
    const buckets = {};
    movements.forEach(m => {
      const d = new Date(m.movement_date || m.created_at);
      if (isNaN(d)) return;
      const key = d.toLocaleString('en', { month:'short', year:'2-digit' });
      if (!buckets[key]) buckets[key] = { m: d.toLocaleString('en',{month:'short'}), in: 0, out: 0, ts: d.getTime() };
      const qty = Math.abs(Number(m.quantity) || Math.abs(m.quantity_change) || 0);
      if (m.raw_type === 'stock_in' || m.raw_type === 'returned') buckets[key].in += qty;
      if (m.raw_type === 'stock_out') buckets[key].out += qty;
    });
    return Object.values(buckets).sort((a,b) => a.ts - b.ts).slice(-6);
  }, [movements]);

  const barMax = useMemo(() => Math.max(...monthlyData.flatMap(d => [d.in, d.out]), 1), [monthlyData]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => !q ||
      (i.item_name||'').toLowerCase().includes(q) ||
      (i.category||'').toLowerCase().includes(q) ||
      (i.sku||'').toLowerCase().includes(q) ||
      String(i.location||'').toLowerCase().includes(q) ||
      String(i.term||'').toLowerCase().includes(q) ||
      String(i.academic_year||'').toLowerCase().includes(q));
  }, [items, search]);

  const matchMovementSearch = (m, q) =>
    !q
    || (m.item_name || '').toLowerCase().includes(q)
    || (m.reason || '').toLowerCase().includes(q)
    || (m.supplier_name || '').toLowerCase().includes(q)
    || (m.type_label || '').toLowerCase().includes(q);

  const filteredIn  = useMemo(() => {
    const q = search.toLowerCase();
    return filterBySupplier(stockIn).filter((m) => matchMovementSearch(m, q));
  }, [stockIn, search, supplierFilter]);

  const filteredOut = useMemo(() => {
    const q = search.toLowerCase();
    return filterBySupplier(stockOut).filter((m) => matchMovementSearch(m, q));
  }, [stockOut, search, supplierFilter]);

  const filteredReturned = useMemo(() => {
    const q = search.toLowerCase();
    return filterBySupplier(returned).filter((m) => matchMovementSearch(m, q));
  }, [returned, search, supplierFilter]);

  const filteredAdjusted = useMemo(() => {
    const q = search.toLowerCase();
    return filterBySupplier(adjusted).filter((m) => matchMovementSearch(m, q));
  }, [adjusted, search, supplierFilter]);

  const filteredAllMovements = useMemo(() => {
    const q = search.toLowerCase();
    return filterBySupplier(movements).filter((m) => matchMovementSearch(m, q));
  }, [movements, search, supplierFilter]);

  const summaryCards = [
    { label:"Total Items",      value: fmtQty(items.length),   Icon: Package,       accent: ACCENT },
    { label:"Total Qty on Hand",value: fmtQty(totalQty),       Icon: CheckCircle2,  accent: "#059669" },
    { label:"Low Stock Alerts", value: fmtQty(lowStock.length),Icon: AlertTriangle, accent: "#f59e0b" },
    { label:"Out of Stock",     value: fmtQty(outOfStock.length),Icon: XCircle,     accent: "#dc2626" },
    { label:"Stock-In Events",  value: fmtQty(stockIn.length), Icon: ArrowDownCircle, accent: "#0891b2" },
    { label:"Stock-Out Events", value: fmtQty(stockOut.length),Icon: ArrowUpCircle, accent: "#7c3aed" },
    { label:"Returned",         value: fmtQty(returned.length), Icon: RefreshCw, accent: "#6366f1" },
    { label:"Adjusted",         value: fmtQty(adjusted.length), Icon: Wrench, accent: "#d97706" },
  ];

  const MovementTable = ({ rows, emptyLabel, qtyColumn = 'Qty', qtyColor = ACCENT }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
            {['Date', 'Item', 'Type', 'Supplier', 'Category', qtyColumn, 'Unit cost', 'Reference / note'].map((h) => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9.5, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} style={{ padding: '40px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>{emptyLabel}</td></tr>
          ) : rows.map((m, i) => (
            <tr key={m.id || i} style={{ borderBottom: '1px solid #f8fafc' }}>
              <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 11 }}>{fmtDate(m.movement_date || m.created_at)}</td>
              <td style={{ padding: '12px 14px', fontWeight: 700 }}>{m.item_name || `Item #${m.item_id}`}</td>
              <td style={{ padding: '12px 14px' }}><Badge label={m.type_label || '—'} color={ACCENT} /></td>
              <td style={{ padding: '12px 14px', color: '#64748b' }}>{m.supplier_name || '—'}</td>
              <td style={{ padding: '12px 14px' }}><Badge label={m.category || '—'} color={ACCENT} /></td>
              <td style={{ padding: '12px 14px', color: qtyColor, fontWeight: 800 }}>{fmtQty(Math.abs(m.quantity_change))}</td>
              <td style={{ padding: '12px 14px', color: '#64748b' }}>{m.unit_cost != null && m.unit_cost !== '' ? `${Number(m.unit_cost).toLocaleString()} RWF` : '—'}</td>
              <td style={{ padding: '12px 14px', color: '#64748b', maxWidth: 220 }}>{m.reason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SupplierFilterBar = ({ count }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: ACCENT }}>
        <Filter size={14} /> {count} record{count === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #dde3ef', borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 11.5, fontWeight: 600, outline: 'none' }}
        >
          {supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item, supplier…"
            style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #dde3ef', borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 11.5, fontWeight: 500, outline: 'none', width: 200 }} />
        </div>
      </div>
    </div>
  );

  const stockHeroSubtitle =
    storeMeta?.term || storeMeta?.academic_year
      ? `Real-time inventory tracking & movements · ${[storeMeta.term, storeMeta.academic_year].filter(Boolean).join(' · ')} (same data as School Store)`
      : 'Real-time inventory tracking & movements';

  return (
    <div style={{ fontFamily:"'Montserrat',sans-serif", color:"#0f172a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <ManagerOchreHeroShell
        outerClassName="animate-in fade-in duration-500 bg-[#f4f6fb] min-h-screen pb-14"
        eyebrow="Inventory management"
        title="Stock reports"
        subtitle={stockHeroSubtitle}
        HeroIcon={Package}
        headerRight={(
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/25 bg-white/10 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
        kpiTiles={summaryCards.map((c) => ({
          key: c.label,
          label: c.label,
          value: c.value,
          icon: c.Icon,
        }))}
        cardBody={(
          <div className="border-t border-black/5 bg-white sticky top-0 z-30">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-5 flex gap-0.5 overflow-x-auto scrollbar-none py-1">
              {NAV_TABS.map(({ id, label, Icon: I }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    tab === id
                      ? 'text-[#1E3A5F] border-[#1E3A5F]'
                      : 'text-slate-500 border-transparent hover:text-slate-700'
                  }`}
                >
                  <I size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        pageBody={(
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px 24px 52px" }}>

        {loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0", gap:12 }}>
            <Loader2 size={24} style={{ color:ACCENT, animation:"spin 1s linear infinite" }} />
            <span style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em" }}>Loading inventory data…</span>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {!loading && tab === "dashboard" && (
          <>
            {/* KPI strip lives in the page hero; charts below */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:24 }}>
              {/* Monthly bar chart */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:18 }}>
                  <BarChart2 size={14} /> Monthly Stock Activity
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>Last 6 Months</span>
                </div>
                {monthlyData.length === 0 ? (
                  <div style={{ height:128, display:"flex", alignItems:"center", justifyContent:"center", color:"#cbd5e1", fontSize:12, fontWeight:700 }}>No movement data yet</div>
                ) : (
                  <>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:128 }}>
                      {monthlyData.map((d, i) => (
                        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                          <div style={{ display:"flex", gap:3, alignItems:"flex-end", height:106 }}>
                            <div style={{ width:13, borderRadius:"4px 4px 0 0", background:ACCENT, height:`${(d.in/barMax)*106}px`, minHeight:4 }} />
                            <div style={{ width:13, borderRadius:"4px 4px 0 0", background:GOLD, height:`${(d.out/barMax)*106}px`, minHeight:4 }} />
                          </div>
                          <div style={{ fontSize:9, fontWeight:700, color:"#cbd5e1" }}>{d.m}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:16, marginTop:12 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:3, background:ACCENT, display:"inline-block" }} />In</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#64748b", display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:3, background:GOLD, display:"inline-block" }} />Out</span>
                    </div>
                  </>
                )}
              </div>

              {/* Category distribution */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:18 }}>
                  <Building2 size={14} /> Category Breakdown
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>All Items</span>
                </div>
                {categoryData.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:100, color:"#cbd5e1", fontSize:12, fontWeight:700 }}>No items found</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {categoryData.map((d, i) => (
                      <div key={i}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{d.name}</span>
                          <span style={{ fontSize:12, fontWeight:800, color:d.color }}>{d.count} items</span>
                        </div>
                        <div style={{ height:8, borderRadius:4, background:"#f1f5f9", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:4, background:d.color, width:`${d.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low stock alerts */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:18 }}>
                  <AlertTriangle size={14} color="#dc2626" /> Low Stock Alerts
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>{lowStock.length} Critical</span>
                </div>
                {lowStock.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:80, gap:8, color:"#059669", fontSize:12, fontWeight:700 }}>
                    <CheckCircle2 size={16} /> All stock levels OK
                  </div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                      <thead>
                        <tr style={{ background:"#f8fafc", borderBottom:"2px solid #f1f5f9" }}>
                          {["Item","Current","Min","Category"].map(h => (
                            <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontSize:9.5, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.slice(0, 8).map((r, i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                            <td style={{ padding:"11px 12px", fontWeight:700 }}>{r.item_name}</td>
                            <td style={{ padding:"11px 12px", color:"#dc2626", fontWeight:800 }}>{fmtQty(r.current_qty)}</td>
                            <td style={{ padding:"11px 12px", color:"#94a3b8" }}>{fmtQty(r.reorder_level)}</td>
                            <td style={{ padding:"11px 12px" }}><Badge label={r.category || '—'} color={ACCENT} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── STOCK IN ── */}
        {!loading && tab === "stockin" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:8 }}>
              <ArrowDownCircle size={14} /> Stock In Movements
            </div>
            <SupplierFilterBar count={filteredIn.length} />
            <MovementTable rows={filteredIn} emptyLabel="No stock-in movements found" qtyColumn="Qty in" qtyColor="#059669" />
          </div>
        )}

        {/* ── STOCK OUT ── */}
        {!loading && tab === "stockout" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:8 }}>
              <ArrowUpCircle size={14} /> Stock Out Movements
            </div>
            <SupplierFilterBar count={filteredOut.length} />
            <MovementTable rows={filteredOut} emptyLabel="No stock-out movements found" qtyColumn="Qty out" qtyColor="#dc2626" />
          </div>
        )}

        {/* ── RETURNED ── */}
        {!loading && tab === "returned" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:8 }}>
              <RefreshCw size={14} /> Returned to Stock
            </div>
            <SupplierFilterBar count={filteredReturned.length} />
            <MovementTable rows={filteredReturned} emptyLabel="No returned movements found" qtyColumn="Qty returned" qtyColor="#6366f1" />
          </div>
        )}

        {/* ── ADJUSTED ── */}
        {!loading && tab === "adjusted" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:8 }}>
              <Wrench size={14} /> Stock Adjustments
            </div>
            <SupplierFilterBar count={filteredAdjusted.length} />
            <MovementTable rows={filteredAdjusted} emptyLabel="No adjustment movements found" qtyColumn="New qty set" qtyColor="#d97706" />
          </div>
        )}

        {/* ── ALL MOVEMENTS ── */}
        {!loading && tab === "allmove" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:8 }}>
              <ArrowDownUp size={14} /> All Stock Movements
            </div>
            <SupplierFilterBar count={filteredAllMovements.length} />
            <MovementTable rows={filteredAllMovements} emptyLabel="No movements recorded yet" qtyColumn="Quantity" qtyColor={ACCENT} />
          </div>
        )}

        {/* ── LOW STOCK ── */}
        {!loading && tab === "lowstock" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:"#dc2626", marginBottom:20 }}>
              <AlertTriangle size={14} /> Low &amp; Out-of-Stock Items <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>({[...lowStock,...outOfStock.filter(o => !lowStock.find(l=>l.id===o.id))].length})</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
              {[...outOfStock, ...lowStock.filter(i => Number(i.current_qty) > 0)].map((item, i) => {
                const isOut = Number(item.current_qty) === 0;
                return (
                  <div key={i} style={{ background: isOut ? "#fff5f5" : "#fffbf0", border:`1.5px solid ${isOut?"#fecaca":"#fde68a"}`, borderRadius:12, padding:16 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:"#0f172a" }}>{item.item_name}</span>
                      <Badge label={isOut ? "Out of Stock" : "Low Stock"} color={isOut ? "#dc2626" : "#d97706"} />
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>{item.category || 'Uncategorized'} · {item.unit || 'unit'}</div>
                    <div style={{ display:"flex", gap:16, fontSize:12, fontWeight:700 }}>
                      <span style={{ color: isOut ? "#dc2626" : "#d97706" }}>Current: {fmtQty(item.current_qty)}</span>
                      <span style={{ color:"#94a3b8" }}>Min: {fmtQty(item.reorder_level)}</span>
                    </div>
                  </div>
                );
              })}
              {[...lowStock,...outOfStock].length === 0 && (
                <div style={{ gridColumn:"1/-1", padding:"40px 0", textAlign:"center", color:"#059669", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <CheckCircle2 size={20} /> All stock levels are healthy
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ALL ITEMS ── */}
        {!loading && tab === "inventory" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT }}>
                <Package size={14} /> Inventory Register <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>({filteredItems.length})</span>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ position:"relative" }}>
                  <Search size={12} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#cbd5e1" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                    style={{ paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8, border:"1.5px solid #dde3ef", borderRadius:8, fontFamily:"'Montserrat',sans-serif", fontSize:11.5, fontWeight:500, outline:"none", width:220 }} />
                </div>
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #f1f5f9" }}>
                    {["Item Name","SKU","Category","Term","Year","Unit","Current Qty","Reorder Level","Status"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:9.5, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding:"40px 14px", textAlign:"center", color:"#94a3b8", fontSize:12, fontWeight:600 }}>No items found</td></tr>
                  ) : filteredItems.map((item, i) => {
                    const isLow = Number(item.reorder_level) > 0 && Number(item.current_qty) <= Number(item.reorder_level);
                    const isOut = Number(item.current_qty) === 0;
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"12px 14px", fontWeight:700 }}>{item.item_name}</td>
                        <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:"#64748b" }}>{item.sku || '—'}</td>
                        <td style={{ padding:"12px 14px" }}><Badge label={item.category || '—'} color={ACCENT} /></td>
                        <td style={{ padding:"12px 14px", color:"#64748b", fontSize:11 }}>{item.term || '—'}</td>
                        <td style={{ padding:"12px 14px", color:"#64748b", fontSize:11 }}>{item.academic_year || '—'}</td>
                        <td style={{ padding:"12px 14px", color:"#64748b" }}>{item.unit || '—'}</td>
                        <td style={{ padding:"12px 14px", fontWeight:800, color: isOut ? "#dc2626" : isLow ? "#d97706" : "#059669" }}>{fmtQty(item.current_qty)}</td>
                        <td style={{ padding:"12px 14px", color:"#94a3b8" }}>{fmtQty(item.reorder_level)}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <Badge label={isOut ? "Out" : isLow ? "Low" : item.status === 'ACTIVE' ? "OK" : item.status}
                            color={isOut ? "#dc2626" : isLow ? "#d97706" : "#059669"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop:40, textAlign:"center", color:"#94a3b8", fontSize:11, fontWeight:600, letterSpacing:".3px" }}>
          Stock Reports · School Inventory Management · Babyeyi Platform
        </div>
      </div>
        )}
      />
    </div>
  );
}
