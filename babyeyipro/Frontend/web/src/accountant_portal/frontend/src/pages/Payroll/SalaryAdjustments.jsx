import { useState } from "react";
import {
  Plus, Search, Filter, TrendingUp, TrendingDown, ArrowRight,
  CheckCircle, Clock, AlertCircle, X, ChevronDown, User,
  Calendar, FileText, Send, Eye, MoreVertical, Minus
} from "lucide-react";

const ADJUSTMENTS_INIT = [
  { id: 1, employee: "Alice Mukamana", photo: "AM", dept: "Secondary", type: "Annual Increment", currentSalary: 420000, newSalary: 450000, effectiveDate: "2025-01-01", reason: "Annual performance review", status: "Approved", requestedBy: "HR Manager", approvedBy: "Head Teacher", date: "2024-12-20" },
  { id: 2, employee: "Jean Pierre Habimana", photo: "JH", dept: "Primary", type: "Promotion", currentSalary: 280000, newSalary: 320000, effectiveDate: "2025-02-01", reason: "Promoted to Senior Class Teacher", status: "Approved", requestedBy: "HR Manager", approvedBy: "Head Teacher", date: "2025-01-15" },
  { id: 3, employee: "Grace Uwimana", photo: "GU", dept: "Admin", type: "Special Adjustment", currentSalary: 360000, newSalary: 380000, effectiveDate: "2025-03-01", reason: "Market rate adjustment", status: "Pending HR", requestedBy: "Accountant", approvedBy: "", date: "2025-02-28" },
  { id: 4, employee: "Patrick Nkurunziza", photo: "PN", dept: "Support", type: "Annual Increment", currentSalary: 190000, newSalary: 200000, effectiveDate: "2025-04-01", reason: "Annual increment cycle", status: "Pending Accountant", requestedBy: "HR Manager", approvedBy: "", date: "2025-03-20" },
  { id: 5, employee: "Marie Claire Ingabire", photo: "MI", dept: "Secondary", type: "Correction", currentSalary: 410000, newSalary: 420000, effectiveDate: "2025-01-01", reason: "Payroll correction from December", status: "Rejected", requestedBy: "Accountant", approvedBy: "Head Teacher", date: "2025-01-05" },
];

const TYPE_OPTIONS = ["Annual Increment", "Promotion", "Special Adjustment", "Correction", "Demotion"];
const STATUS_STYLE = {
  "Approved": "bg-green-100 text-green-700",
  "Pending HR": "bg-amber-100 text-amber-700",
  "Pending Accountant": "bg-blue-100 text-blue-700",
  "Rejected": "bg-red-100 text-red-600",
};
const TYPE_STYLE = {
  "Annual Increment": "bg-blue-50 text-blue-700",
  "Promotion": "bg-green-50 text-green-700",
  "Special Adjustment": "bg-purple-50 text-purple-700",
  "Correction": "bg-amber-50 text-amber-700",
  "Demotion": "bg-red-50 text-red-600",
};

const STAFF = [
  { id: 1, name: "Alice Mukamana", photo: "AM", dept: "Secondary", salary: 450000 },
  { id: 2, name: "Jean Pierre Habimana", photo: "JH", dept: "Primary", salary: 320000 },
  { id: 3, name: "Grace Uwimana", photo: "GU", dept: "Admin", salary: 380000 },
  { id: 4, name: "Patrick Nkurunziza", photo: "PN", dept: "Support", salary: 200000 },
  { id: 5, name: "Marie Claire Ingabire", photo: "MI", dept: "Secondary", salary: 420000 },
];

const EMPTY_FORM = { employeeId: "", type: "Annual Increment", newSalary: "", effectiveDate: "", reason: "" };

function Modal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const emp = STAFF.find(s => s.id === Number(form.employeeId));
  const diff = emp && form.newSalary ? Number(form.newSalary) - emp.salary : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-black text-[#000435] text-base">New Salary Adjustment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Employee */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Employee</label>
            <select value={form.employeeId} onChange={e => set("employeeId", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">Select employee…</option>
              {STAFF.map(s => <option key={s.id} value={s.id}>{s.name} — {s.dept}</option>)}
            </select>
          </div>
          {/* Adjustment Type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Adjustment Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t} onClick={() => set("type", t)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all border
                    ${form.type === t ? "bg-[#000435] text-white border-[#000435]" : "bg-white text-slate-500 border-slate-200 hover:border-[#000435]"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Current / New Salary */}
          {emp && (
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Current</label>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500">
                  RWF {emp.salary.toLocaleString()}
                </div>
              </div>
              <div className="flex justify-center pb-2">
                <ArrowRight size={18} className="text-amber-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">New Salary</label>
                <input type="number" value={form.newSalary} onChange={e => set("newSalary", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Enter amount" />
              </div>
            </div>
          )}
          {/* Diff indicator */}
          {diff !== 0 && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${diff > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {diff > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              {diff > 0 ? "+" : ""}RWF {diff.toLocaleString()} ({((diff / (emp?.salary || 1)) * 100).toFixed(1)}%)
            </div>
          )}
          {/* Effective Date */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Effective Date</label>
            <input type="date" value={form.effectiveDate} onChange={e => set("effectiveDate", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          {/* Reason */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Reason / Notes</label>
            <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Explain the reason for this adjustment…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
          <button onClick={() => onSave(form)} className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-400 text-[#000435] hover:bg-amber-500">
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalaryAdjustments() {
  const [adjustments, setAdjustments] = useState(ADJUSTMENTS_INIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = adjustments.filter(a => {
    const matchSearch = a.employee.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = (form) => {
    const emp = STAFF.find(s => s.id === Number(form.employeeId));
    if (!emp) return;
    const newAdj = {
      id: Date.now(), employee: emp.name, photo: emp.photo, dept: emp.dept,
      type: form.type, currentSalary: emp.salary, newSalary: Number(form.newSalary),
      effectiveDate: form.effectiveDate, reason: form.reason, status: "Pending HR",
      requestedBy: "Accountant", approvedBy: "", date: new Date().toISOString().split("T")[0],
    };
    setAdjustments(a => [newAdj, ...a]);
    setShowModal(false);
  };

  const stats = [
    { label: "Total Adjustments", value: adjustments.length },
    { label: "Approved", value: adjustments.filter(a => a.status === "Approved").length },
    { label: "Pending", value: adjustments.filter(a => a.status.startsWith("Pending")).length },
    { label: "Rejected", value: adjustments.filter(a => a.status === "Rejected").length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[#000435] font-black text-xl">Salary Adjustments</h1>
          <p className="text-slate-400 text-xs">Manage promotions, increments & corrections</p>
        </div>
        <button onClick={() => setShowModal(true)} className="ml-auto flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> New Adjustment
        </button>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <p className="text-2xl font-black text-[#000435]">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Workflow banner */}
        <div className="bg-[#000435] rounded-2xl p-4 flex flex-wrap items-center gap-2">
          {["HR Review", "Accountant Review", "Head Teacher Approval", "Applied"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-[#000435] text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                <span className="text-white/70 text-xs font-semibold">{step}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={12} className="text-white/30" />}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "Approved", "Pending HR", "Pending Accountant", "Rejected"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all
                  ${statusFilter === s ? "bg-[#000435] text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-[#000435]"}`}>
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Employee", "Type", "Current", "New Salary", "Difference", "Effective", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const diff = a.newSalary - a.currentSalary;
                  const pct = ((diff / a.currentSalary) * 100).toFixed(1);
                  return (
                    <tr key={a.id} className="border-b border-slate-50 hover:bg-amber-50/30 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#000435] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{a.photo}</div>
                          <div>
                            <p className="text-sm font-bold text-[#000435]">{a.employee}</p>
                            <p className="text-xs text-slate-400">{a.dept}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLE[a.type] || "bg-slate-100 text-slate-500"}`}>{a.type}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">RWF {a.currentSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-[#000435]">RWF {a.newSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {diff >= 0 ? "+" : ""}RWF {diff.toLocaleString()}
                          <span className="text-xs ml-1 opacity-60">({pct}%)</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{a.effectiveDate}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => setSelected(a)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-all">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && <Modal onClose={() => setShowModal(false)} onSave={handleSave} />}

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-[#000435] text-base">Adjustment Detail</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[#000435] rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#000435] font-black text-sm flex items-center justify-center">{selected.photo}</div>
              <div>
                <p className="text-white font-bold">{selected.employee}</p>
                <p className="text-white/50 text-xs">{selected.dept}</p>
              </div>
            </div>
            {[
              { label: "Type", value: selected.type },
              { label: "Current Salary", value: `RWF ${selected.currentSalary.toLocaleString()}` },
              { label: "New Salary", value: `RWF ${selected.newSalary.toLocaleString()}` },
              { label: "Difference", value: `+RWF ${(selected.newSalary - selected.currentSalary).toLocaleString()}` },
              { label: "Effective Date", value: selected.effectiveDate },
              { label: "Requested By", value: selected.requestedBy },
              { label: "Approved By", value: selected.approvedBy || "Pending" },
              { label: "Date", value: selected.date },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold text-[#000435]">{value}</span>
              </div>
            ))}
            <div>
              <p className="text-xs text-slate-400 mb-1">Reason</p>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3">{selected.reason}</p>
            </div>
            <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${STATUS_STYLE[selected.status]}`}>{selected.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}