import { useState } from "react";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, Menu, X,
  BookOpen, LayoutDashboard, FileText, Layers, BarChart2, Bell,
  Calendar, ChevronRight, ArrowUpRight, Plus, Download, Search,
  Filter, Eye, Edit2, Trash2, Receipt, CreditCard, History
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: FileText, label: "Action Plans" },
  { icon: Layers, label: "Activities" },
  { icon: DollarSign, label: "Budget" },
  { icon: TrendingUp, label: "Tracking" },
  { icon: BarChart2, label: "Reports" },
  { icon: Bell, label: "Notifications" },
  { icon: Calendar, label: "Calendar" },
];

const EXPENSE_DATA = [
  {
    id: 1, activity: "School Feeding Program", plan: "Full Year Welfare Plan", dept: "Welfare",
    planned: 20000000, used: 5000000, progress: 25,
    history: [
      { date: "Jan 15, 2025", amount: 2000000, description: "Week 1-2 ingredients", receipt: "RCP-001", by: "Marie Claire" },
      { date: "Jan 31, 2025", amount: 1800000, description: "Week 3-4 ingredients", receipt: "RCP-002", by: "Marie Claire" },
      { date: "Feb 14, 2025", amount: 1200000, description: "Feb Week 1-2 ingredients", receipt: "RCP-003", by: "Marie Claire" },
    ]
  },
  {
    id: 2, activity: "Classroom Renovation Block B", plan: "Term 1 Infrastructure", dept: "Administration",
    planned: 12000000, used: 8400000, progress: 70,
    history: [
      { date: "Jan 8, 2025", amount: 3000000, description: "Paint & materials purchase", receipt: "RCP-010", by: "John Mugisha" },
      { date: "Jan 20, 2025", amount: 2500000, description: "Carpenter labor - wk 2", receipt: "RCP-011", by: "John Mugisha" },
      { date: "Feb 1, 2025", amount: 2900000, description: "Flooring installation", receipt: "RCP-012", by: "John Mugisha" },
    ]
  },
  {
    id: 3, activity: "Laboratory Equipment Purchase", plan: "Term 1 Science Plan", dept: "Science",
    planned: 15000000, used: 14800000, progress: 100,
    history: [
      { date: "Jan 10, 2025", amount: 8000000, description: "Microscopes & slides set", receipt: "RCP-020", by: "Eric Nkurunziza" },
      { date: "Jan 18, 2025", amount: 4200000, description: "Chemistry equipment", receipt: "RCP-021", by: "Eric Nkurunziza" },
      { date: "Jan 25, 2025", amount: 2600000, description: "Safety equipment & lab coats", receipt: "RCP-022", by: "Eric Nkurunziza" },
    ]
  },
  {
    id: 4, activity: "Football Pitch Renovation", plan: "Sports Program", dept: "Sports",
    planned: 8000000, used: 2400000, progress: 30,
    history: [
      { date: "Feb 5, 2025", amount: 1500000, description: "Grass seeds & fertilizer", receipt: "RCP-030", by: "Paul Habimana" },
      { date: "Feb 18, 2025", amount: 900000, description: "Goal post installation", receipt: "RCP-031", by: "Paul Habimana" },
    ]
  },
  {
    id: 5, activity: "Health Screening Campaign", plan: "Health Plan Term 1", dept: "Health",
    planned: 2000000, used: 1200000, progress: 60,
    history: [
      { date: "Feb 12, 2025", amount: 800000, description: "Medical supplies & gloves", receipt: "RCP-040", by: "James Nzeyimana" },
      { date: "Feb 13, 2025", amount: 400000, description: "Rapid test kits", receipt: "RCP-041", by: "James Nzeyimana" },
    ]
  },
];

function fmt(n) { return n >= 1000000 ? (n/1000000).toFixed(1) + "M" : n.toLocaleString(); }
function pct(used, total) { return total ? Math.round((used/total)*100) : 0; }

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#000435] z-30 flex flex-col transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:z-auto`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center"><BookOpen size={18} className="text-white" /></div>
          <div><p className="text-white font-bold text-sm font-['Montserrat']">SchoolPlan</p><p className="text-white/40 text-xs">Management System</p></div>
          <button onClick={onClose} className="ml-auto md:hidden text-white/60"><X size={18} /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
            <button key={label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-['Montserrat'] font-medium transition-all
              ${active ? "bg-amber-500 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">JM</div>
            <div><p className="text-white text-xs font-semibold font-['Montserrat']">John Mugisha</p><p className="text-white/40 text-xs">Accountant</p></div>
          </div>
        </div>
      </aside>
    </>
  );
}

function AddExpenseModal({ activity, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#000435] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold font-['Montserrat'] text-base">Add Expense</h2>
            <p className="text-white/50 text-xs mt-0.5">{activity}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-['Montserrat'] uppercase tracking-wide">Expense Description</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 font-['Montserrat']" placeholder="e.g. Food supplies for week 3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-['Montserrat'] uppercase tracking-wide">Amount (RWF)</label>
              <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 font-['Montserrat']" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-['Montserrat'] uppercase tracking-wide">Date</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 font-['Montserrat']" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-['Montserrat'] uppercase tracking-wide">Receipt Number</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 font-['Montserrat']" placeholder="e.g. RCP-045" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-['Montserrat'] uppercase tracking-wide">Recorded By</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 font-['Montserrat'] bg-white">
              <option>John Mugisha</option><option>Alice Uwimana</option><option>Marie Claire Ingabire</option>
            </select>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-between">
          <button onClick={onClose} className="text-gray-500 text-sm font-['Montserrat']">Cancel</button>
          <button className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold font-['Montserrat'] transition-colors flex items-center gap-2">
            <Receipt size={15} /> Record Expense
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseTrackingPerActivity() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = EXPENSE_DATA.filter(e =>
    e.activity.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase())
  );

  const totalPlanned = EXPENSE_DATA.reduce((s, e) => s + e.planned, 0);
  const totalUsed = EXPENSE_DATA.reduce((s, e) => s + e.used, 0);
  const totalTx = EXPENSE_DATA.reduce((s, e) => s + e.history.length, 0);

  return (
    <div className="flex h-screen bg-gray-50 font-['Montserrat'] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500"><Menu size={22} /></button>
          <div>
            <h1 className="text-lg font-bold text-[#000435]">Expense Tracking</h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Dashboard</span><ChevronRight size={12} /><span className="text-amber-500 font-medium">Expense Tracking</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="relative text-gray-500 p-2"><Bell size={20} /><span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" /></button>
            <button className="flex items-center gap-2 border border-gray-200 hover:border-amber-400 text-gray-600 px-3 py-2 rounded-xl text-sm font-semibold">
              <Download size={15} /><span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Total Planned", value: fmt(totalPlanned), sub: "RWF", icon: CreditCard, color: "from-[#000435] to-[#001080]" },
              { label: "Total Spent", value: fmt(totalUsed), sub: "RWF", icon: DollarSign, color: "from-amber-500 to-amber-600" },
              { label: "Remaining", value: fmt(totalPlanned - totalUsed), sub: "RWF", icon: TrendingUp, color: "from-emerald-500 to-emerald-600" },
              { label: "Transactions", value: totalTx, sub: "recorded", icon: Receipt, color: "from-purple-500 to-purple-600" },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}><Icon size={18} className="text-white" /></div>
                  <ArrowUpRight size={14} className="text-gray-300" />
                </div>
                <p className="text-xl font-bold text-[#000435]">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                <p className="text-xs text-amber-600 font-medium mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                placeholder="Search activities..." />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-amber-400">
              <Filter size={15} /> Filter
            </button>
          </div>

          {/* Activity Expense Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-[#000435]">Activity Expense Summary</p>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {["Activity", "Department", "Planned Budget", "Amount Used", "Remaining", "Progress", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(exp => {
                    const p = pct(exp.used, exp.planned);
                    const remaining = exp.planned - exp.used;
                    const isOver = p >= 90;
                    return (
                      <>
                        <tr key={exp.id} className="hover:bg-amber-50/30 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#000435] text-sm">{exp.activity}</p>
                            <p className="text-xs text-gray-400">{exp.plan}</p>
                          </td>
                          <td className="px-4 py-4"><span className="text-xs font-medium bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg">{exp.dept}</span></td>
                          <td className="px-4 py-4 text-sm font-semibold text-[#000435]">{fmt(exp.planned)}</td>
                          <td className="px-4 py-4"><span className={`text-sm font-bold ${isOver ? "text-red-500" : "text-amber-500"}`}>{fmt(exp.used)}</span></td>
                          <td className="px-4 py-4 text-sm font-semibold text-emerald-600">{fmt(remaining)}</td>
                          <td className="px-4 py-4 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${p >= 90 ? "bg-red-400" : p >= 70 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${p}%` }} />
                              </div>
                              <span className={`text-xs font-bold w-8 text-right ${p >= 90 ? "text-red-500" : "text-gray-600"}`}>{p}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setShowAddExpense(exp.activity)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600">
                                <Plus size={12} /> Expense
                              </button>
                              <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><History size={14} /></button>
                            </div>
                          </td>
                        </tr>
                        {expandedId === exp.id && (
                          <tr key={`hist-${exp.id}`}>
                            <td colSpan={7} className="bg-amber-50/30 px-4 md:px-8 py-3">
                              <div className="flex items-center gap-2 mb-3">
                                <History size={14} className="text-amber-600" />
                                <p className="text-xs font-bold text-[#000435] uppercase tracking-wide">Expense History</p>
                              </div>
                              <div className="space-y-2">
                                {exp.history.map((h, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Receipt size={14} className="text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-[#000435]">{h.description}</p>
                                      <p className="text-xs text-gray-400">{h.date} · By {h.by} · #{h.receipt}</p>
                                    </div>
                                    <p className="text-sm font-bold text-amber-600 flex-shrink-0">{fmt(h.amount)} RWF</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(exp => {
                const p = pct(exp.used, exp.planned);
                return (
                  <div key={exp.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-[#000435] text-sm">{exp.activity}</p>
                        <p className="text-xs text-gray-400">{exp.dept}</p>
                      </div>
                      <button onClick={() => setShowAddExpense(exp.activity)} className="flex items-center gap-1 px-2 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold">
                        <Plus size={11} /> Add
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center mb-3">
                      <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Planned</p><p className="font-bold text-[#000435]">{fmt(exp.planned)}</p></div>
                      <div className="bg-amber-50 rounded-lg p-2"><p className="text-gray-400">Used</p><p className="font-bold text-amber-600">{fmt(exp.used)}</p></div>
                      <div className="bg-emerald-50 rounded-lg p-2"><p className="text-gray-400">Left</p><p className="font-bold text-emerald-600">{fmt(exp.planned - exp.used)}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p >= 90 ? "bg-red-400" : "bg-amber-400"}`} style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{p}%</span>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      className="mt-2 w-full text-xs text-amber-600 font-semibold py-1.5 border border-amber-200 rounded-lg hover:bg-amber-50">
                      {expandedId === exp.id ? "Hide" : "View"} History ({exp.history.length})
                    </button>
                    {expandedId === exp.id && (
                      <div className="mt-3 space-y-2">
                        {exp.history.map((h, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-semibold text-[#000435]">{h.description}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{h.date} · #{h.receipt}</p>
                              </div>
                              <p className="text-sm font-bold text-amber-600">{fmt(h.amount)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
      {showAddExpense && <AddExpenseModal activity={showAddExpense} onClose={() => setShowAddExpense(null)} />}
    </div>
  );
}