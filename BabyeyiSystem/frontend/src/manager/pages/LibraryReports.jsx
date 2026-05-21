import { useState, useEffect, useMemo } from "react";
import {
  BookOpen, BookMarked, BookX, Clock, Users, AlertCircle,
  BarChart2, ArrowUpDown, Timer, Archive, TrendingUp,
  CheckCircle2, RefreshCw, Search, Star, Award, Loader2, Globe2,
} from "lucide-react";
import api from '../services/api';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';

const ACCENT = "#1E3A5F";
const GOLD   = "#FEBF10";
const CAT_COLORS = ["#1E3A5F","#d97706","#059669","#dc2626","#7c3aed","#0891b2","#db2777","#0f172a"];

const NAV_TABS = [
  { id: "dashboard",  label: "Dashboard",       Icon: BarChart2   },
  { id: "borrowing",  label: "Borrowings",       Icon: ArrowUpDown },
  { id: "overdue",    label: "Overdue",           Icon: Timer       },
  { id: "inventory",  label: "Book Inventory",    Icon: Archive     },
  { id: "top",        label: "Most Borrowed",     Icon: Star        },
];

function fmtDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en", { day:"2-digit", month:"short", year:"numeric" });
}
function fmtNum(n) { return Number(n || 0).toLocaleString(); }

const Badge = ({ label, color = "#059669" }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"3px 9px", borderRadius:20, fontSize:10, fontWeight:700, background:`${color}15`, color }}>
    {label}
  </span>
);

export default function LibraryReports() {
  const [tab, setTab]             = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [books, setBooks]         = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [overdue, setOverdue]     = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [dashRes, borrowRes, overdueRes, invRes, booksRes] = await Promise.allSettled([
          api.get('/library/dashboard'),
          api.get('/borrowings', { params: { status: 'all' } }),
          api.get('/library/reports/overdue'),
          api.get('/library/reports/book-inventory'),
          api.get('/books'),
        ]);
        if (cancelled) return;
        if (dashRes.status === 'fulfilled' && dashRes.value.data?.success)
          setDashboard(dashRes.value.data.data);
        if (borrowRes.status === 'fulfilled' && borrowRes.value.data?.success)
          setBorrowings(borrowRes.value.data.data || []);
        if (overdueRes.status === 'fulfilled' && overdueRes.value.data?.success)
          setOverdue(overdueRes.value.data.data || []);
        if (invRes.status === 'fulfilled' && invRes.value.data?.success)
          setInventory(invRes.value.data.data || []);
        if (booksRes.status === 'fulfilled' && booksRes.value.data?.success)
          setBooks(booksRes.value.data.data || []);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // ── derived stats ──────────────────────────────────────────
  const summaryCards = useMemo(() => {
    const d = dashboard;
    return [
      { label:"Total Titles",     value: fmtNum(d?.total_titles     ?? books.length),          Icon: BookOpen,    accent: ACCENT },
      { label:"Total Copies",     value: fmtNum(d?.total_copies     ?? 0),                     Icon: Archive,     accent: "#0891b2" },
      { label:"Available",        value: fmtNum(d?.available_copies ?? 0),                     Icon: CheckCircle2,accent: "#059669" },
      { label:"Currently Out",    value: fmtNum(d?.borrowed_copies  ?? 0),                     Icon: BookMarked,  accent: "#d97706" },
      { label:"Active Loans",     value: fmtNum(d?.active_loans     ?? 0),                     Icon: TrendingUp,  accent: "#7c3aed" },
      { label:"Overdue Books",    value: fmtNum(d?.overdue_loans    ?? overdue.length),         Icon: Timer,       accent: "#dc2626" },
    ];
  }, [dashboard, books, overdue]);

  const topBorrowed = useMemo(() => dashboard?.top_borrowed || [], [dashboard]);

  const categoryData = useMemo(() => {
    const cats = {};
    books.forEach(b => {
      const c = b.category || 'Uncategorized';
      if (!cats[c]) cats[c] = { name:c, total:0, available:0 };
      cats[c].total += Number(b.quantity || 0);
      cats[c].available += Number(b.available_quantity || 0);
    });
    const entries = Object.values(cats).sort((a,b) => b.total - a.total).slice(0,7);
    const maxTotal = Math.max(...entries.map(c => c.total), 1);
    return entries.map((c, i) => ({ ...c, pct: Math.round((c.total/maxTotal)*100), color: CAT_COLORS[i % CAT_COLORS.length] }));
  }, [books]);

  const filteredBorrowings = useMemo(() => {
    const q = search.toLowerCase();
    return borrowings.filter(b => !q || (b.borrower_name||'').toLowerCase().includes(q) || (b.book_title||'').toLowerCase().includes(q));
  }, [borrowings, search]);

  const filteredOverdue = useMemo(() => {
    const q = search.toLowerCase();
    return overdue.filter(b => !q || (b.borrower_name||'').toLowerCase().includes(q) || (b.book_title||'').toLowerCase().includes(q));
  }, [overdue, search]);

  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter(b => !q || (b.title||'').toLowerCase().includes(q) || (b.author||'').toLowerCase().includes(q) || (b.category||'').toLowerCase().includes(q));
  }, [inventory, search]);

  const SearchBar = ({ placeholder = "Search…" }) => (
    <div style={{ position:"relative" }}>
      <Search size={12} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#cbd5e1" }} />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder}
        style={{ paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8, border:"1.5px solid #dde3ef", borderRadius:8, fontFamily:"'Montserrat',sans-serif", fontSize:11.5, fontWeight:500, outline:"none", width:220 }} />
    </div>
  );

  return (
    <div style={{ fontFamily:"'Montserrat',sans-serif", color:"#0f172a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <ManagerOchreHeroShell
        outerClassName="animate-in fade-in duration-500 bg-[#f4f6fb] min-h-screen pb-14"
        eyebrow="Library management"
        title="Library reports"
        subtitle="Books, borrowings & overdue tracking"
        HeroIcon={BookOpen}
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
            <span style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".1em" }}>Loading library data…</span>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {!loading && tab === "dashboard" && (
          <>
            {/* Summary cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12, marginBottom:24 }}>
              {summaryCards.map(({ label, value, Icon: I, accent }, i) => (
                <div key={i} style={{ background:"#fff", borderRadius:14, padding:"18px 16px", border:"1.5px solid #e8edf5", cursor:"pointer", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
                    <I size={19} color={accent} />
                  </div>
                  <div style={{ fontSize:"clamp(18px,2.5vw,22px)", fontWeight:900, color:ACCENT, letterSpacing:"-.5px" }}>{value}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", marginTop:2, textTransform:"uppercase", letterSpacing:".5px" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:16, marginBottom:24 }}>
              {/* Category distribution */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:18 }}>
                  <Archive size={14} /> Book Categories
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>By Copies</span>
                </div>
                {categoryData.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:100, color:"#cbd5e1", fontSize:12, fontWeight:700 }}>No books found</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                    {categoryData.map((c, i) => (
                      <div key={i}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{c.name}</span>
                          <span style={{ fontSize:12, fontWeight:800, color:c.color }}>{fmtNum(c.total)} copies</span>
                        </div>
                        <div style={{ height:8, borderRadius:4, background:"#f1f5f9", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:4, background:c.color, width:`${c.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top borrowed */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:18 }}>
                  <Star size={14} color="#d97706" /> Most Borrowed
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>All Time</span>
                </div>
                {topBorrowed.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:100, color:"#cbd5e1", fontSize:12, fontWeight:700 }}>No borrowing data</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {topBorrowed.slice(0, 8).map((b, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:"#f8fafc", borderRadius:10 }}>
                        <span style={{ width:22, height:22, borderRadius:7, background:`${CAT_COLORS[i % CAT_COLORS.length]}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:CAT_COLORS[i % CAT_COLORS.length], flexShrink:0 }}>{i+1}</span>
                        <span style={{ flex:1, fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.title}</span>
                        <span style={{ fontSize:11, fontWeight:800, color:"#059669", flexShrink:0 }}>{fmtNum(b.borrow_count)}×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Overdue preview */}
              <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:"#dc2626", marginBottom:18 }}>
                  <Timer size={14} /> Overdue Books
                  <span style={{ fontSize:9.5, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:.5, marginLeft:"auto" }}>{overdue.length} Total</span>
                </div>
                {overdue.length === 0 ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:80, gap:8, color:"#059669", fontSize:12, fontWeight:700 }}>
                    <CheckCircle2 size={16} /> No overdue books
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {overdue.slice(0,6).map((b, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", background:"#fff5f5", borderRadius:10, border:"1px solid #fecaca" }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.borrower_name || b.borrower_detail}</div>
                          <div style={{ fontSize:10, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.book_title}</div>
                        </div>
                        <span style={{ fontSize:10, fontWeight:800, color:"#dc2626", flexShrink:0, marginLeft:8 }}>+{b.days_past_due || 0}d</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── BORROWINGS ── */}
        {!loading && tab === "borrowing" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT }}>
                <ArrowUpDown size={14} /> Borrowing Records <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>({filteredBorrowings.length})</span>
              </div>
              <SearchBar placeholder="Search student or book…" />
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #f1f5f9" }}>
                    {["Borrower","Book","Borrow Date","Due Date","Status","Days Overdue"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:9.5, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBorrowings.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding:"40px 14px", textAlign:"center", color:"#94a3b8", fontSize:12, fontWeight:600 }}>No borrowing records found</td></tr>
                  ) : filteredBorrowings.map((b, i) => {
                    const isOverdue = b.overdue;
                    const isReturned = b.status === 'returned';
                    const statusColor = isReturned ? "#059669" : isOverdue ? "#dc2626" : "#d97706";
                    const statusLabel = isReturned ? "Returned" : isOverdue ? "Overdue" : "Active";
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"12px 14px", fontWeight:700 }}>{b.borrower_name || b.borrower_detail}</td>
                        <td style={{ padding:"12px 14px", color:"#64748b", fontSize:12 }}>{b.book_title}</td>
                        <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:11 }}>{fmtDate(b.borrow_date)}</td>
                        <td style={{ padding:"12px 14px", color:"#94a3b8", fontSize:11 }}>{fmtDate(b.due_date || b.return_date)}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <Badge label={statusLabel} color={statusColor} />
                        </td>
                        <td style={{ padding:"12px 14px", color: b.days_overdue > 0 ? "#dc2626" : "#94a3b8", fontWeight: b.days_overdue > 0 ? 800 : 400 }}>
                          {b.days_overdue > 0 ? `+${b.days_overdue}d` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── OVERDUE ── */}
        {!loading && tab === "overdue" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:"#dc2626" }}>
                <Timer size={14} /> Overdue Books <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>({filteredOverdue.length})</span>
              </div>
              <SearchBar placeholder="Search borrower or book…" />
            </div>
            {filteredOverdue.length === 0 ? (
              <div style={{ padding:"50px 0", textAlign:"center", color:"#059669", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <CheckCircle2 size={20} /> No overdue books — great job!
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                {filteredOverdue.map((b, i) => (
                  <div key={i} style={{ background:"#fff5f5", border:"1.5px solid #fecaca", borderRadius:12, padding:16 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:800, color:"#0f172a", marginBottom:3 }}>{b.borrower_name || b.borrower_detail}</div>
                        <div style={{ fontSize:11, color:"#64748b" }}>{b.book_title}</div>
                      </div>
                      <span style={{ background:"#dc262618", color:"#dc2626", padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:800, flexShrink:0 }}>+{b.days_past_due || 0}d</span>
                    </div>
                    <div style={{ display:"flex", gap:12, fontSize:11, fontWeight:600, color:"#94a3b8" }}>
                      <span>Due: {fmtDate(b.return_date || b.due_date)}</span>
                      {b.book_isbn && <span>ISBN: {b.book_isbn}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {!loading && tab === "inventory" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT }}>
                <Archive size={14} /> Book Inventory <span style={{ fontSize:11, fontWeight:600, color:"#94a3b8" }}>({filteredInventory.length})</span>
              </div>
              <SearchBar placeholder="Search title, author, category…" />
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #f1f5f9" }}>
                    {["Title","Category","Total","In Library","On Loan","Availability"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:9.5, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding:"40px 14px", textAlign:"center", color:"#94a3b8", fontSize:12, fontWeight:600 }}>No books found</td></tr>
                  ) : filteredInventory.map((b, i) => {
                    const avail = Number(b.in_library || b.total_remain_in_stock || 0);
                    const total = Number(b.total_copies || 0);
                    const pct = total > 0 ? Math.round((avail/total)*100) : 0;
                    const color = pct < 20 ? "#dc2626" : pct < 50 ? "#d97706" : "#059669";
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f8fafc" }}>
                        <td style={{ padding:"12px 14px", fontWeight:700, maxWidth:220 }}>{b.title}</td>
                        <td style={{ padding:"12px 14px" }}><Badge label={b.category || '—'} color={ACCENT} /></td>
                        <td style={{ padding:"12px 14px", fontWeight:800, color:ACCENT }}>{fmtNum(total)}</td>
                        <td style={{ padding:"12px 14px", color:"#059669", fontWeight:700 }}>{fmtNum(avail)}</td>
                        <td style={{ padding:"12px 14px", color:"#d97706", fontWeight:700 }}>{fmtNum(b.on_loan_qty || b.copies_out || 0)}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ flex:1, height:6, borderRadius:3, background:"#f1f5f9", overflow:"hidden", minWidth:60 }}>
                              <div style={{ height:"100%", borderRadius:3, background:color, width:`${pct}%` }} />
                            </div>
                            <span style={{ fontSize:11, fontWeight:800, color, flexShrink:0 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MOST BORROWED ── */}
        {!loading && tab === "top" && (
          <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1.5px solid #e8edf5", boxShadow:"0 1px 4px rgba(0,4,53,.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:800, color:ACCENT, marginBottom:20 }}>
              <Star size={14} color="#d97706" /> Most Borrowed Books
            </div>
            {topBorrowed.length === 0 ? (
              <div style={{ padding:"50px 0", textAlign:"center", color:"#94a3b8", fontSize:12, fontWeight:700 }}>No borrowing data available yet</div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                {topBorrowed.map((b, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:14, background:"#f8fafc", borderRadius:12, padding:14, border:"1.5px solid #e8edf5", cursor:"pointer" }}>
                    <div style={{ width:48, height:60, borderRadius:8, background:`${CAT_COLORS[i % CAT_COLORS.length]}15`, border:`1.5px solid ${CAT_COLORS[i % CAT_COLORS.length]}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <BookOpen size={20} color={CAT_COLORS[i % CAT_COLORS.length]} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, lineHeight:1.35, marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{b.title}</div>
                      <div style={{ fontSize:11, color:"#059669", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                        <RefreshCw size={10} />{fmtNum(b.borrow_count)} borrows
                      </div>
                    </div>
                    <span style={{ fontSize:18, fontWeight:900, color:`${CAT_COLORS[i % CAT_COLORS.length]}60`, flexShrink:0 }}>#{i+1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop:40, textAlign:"center", color:"#94a3b8", fontSize:11, fontWeight:600, letterSpacing:".3px" }}>
          Library Reports · School Library Management · Babyeyi Platform
        </div>
      </div>
        )}
      />
    </div>
  );
}
