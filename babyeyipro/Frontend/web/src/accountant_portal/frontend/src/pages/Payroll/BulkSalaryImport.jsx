import { useState, useRef } from "react";
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle,
  XCircle, Eye, RefreshCw, ChevronRight, Trash2, Info, X,
  ArrowRight, FileCheck, Clock
} from "lucide-react";

const TEMPLATE_COLUMNS = ["Employee Number", "Full Name", "Basic Salary", "Transport", "Housing", "Communication", "Loan", "SACCO", "RSSB Number", "Bank", "Account Number"];

const MOCK_PREVIEW = [
  { row: 2, employeeNo: "EMP001", name: "Alice Mukamana", basic: 450000, transport: 30000, housing: 50000, communication: 20000, loan: 50000, sacco: 20000, rssb: "1-2345678-A", bank: "Bank of Kigali", account: "00012345678", errors: [] },
  { row: 3, employeeNo: "EMP002", name: "Jean Pierre Habimana", basic: 320000, transport: 30000, housing: 40000, communication: 0, loan: 0, sacco: 15000, rssb: "1-2345679-B", bank: "BPR", account: "10023456789", errors: [] },
  { row: 4, employeeNo: "EMP003", name: "Grace Uwimana", basic: 380000, transport: 35000, housing: 0, communication: 20000, loan: 30000, sacco: 10000, rssb: "1-2345680-C", bank: "I&M Bank", account: "20034567890", errors: [] },
  { row: 5, employeeNo: "EMP004", name: "Patrick Nkurunziza", basic: 200000, transport: 20000, housing: 0, communication: 0, loan: 0, sacco: 0, rssb: "", bank: "Equity Bank", account: "", errors: ["Missing RSSB number", "Missing bank account"] },
  { row: 6, employeeNo: "EMP005", name: "Marie Claire Ingabire", basic: -1, transport: 30000, housing: 50000, communication: 20000, loan: 60000, sacco: 20000, rssb: "1-2345682-E", bank: "Bank of Kigali", account: "00056789012", errors: ["Invalid basic salary (-1)"] },
  { row: 7, employeeNo: "", name: "Unknown Employee", basic: 250000, transport: 0, housing: 0, communication: 0, loan: 0, sacco: 0, rssb: "", bank: "", account: "", errors: ["Missing employee number", "Missing RSSB", "Missing bank"] },
];

const HISTORY = [
  { id: 1, file: "June_2025_Salaries.xlsx", uploadedBy: "Alice Cyiza", date: "2025-06-01", records: 214, errors: 0, status: "Imported" },
  { id: 2, file: "May_2025_Salaries.xlsx", uploadedBy: "Alice Cyiza", date: "2025-05-03", records: 211, errors: 2, status: "Imported" },
  { id: 3, file: "April_2025_Salaries.xlsx", uploadedBy: "Alice Cyiza", date: "2025-04-02", records: 210, errors: 5, status: "Partial" },
];

const STEPS = ["Upload File", "Validate Data", "Preview", "Import"];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
              ${i < current ? "bg-green-500 text-white" : i === current ? "bg-amber-400 text-[#000435]" : "bg-slate-100 text-slate-400"}`}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:block ${i === current ? "text-[#000435]" : "text-slate-400"}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 w-6 ${i < current ? "bg-green-500" : "bg-slate-100"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function BulkSalaryImport() {
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [tab, setTab] = useState("all");
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setStep(1);
    setTimeout(() => { setPreview(MOCK_PREVIEW); setStep(2); }, 1200);
  };

  const validRows = preview.filter(r => r.errors.length === 0);
  const errorRows = preview.filter(r => r.errors.length > 0);
  const visibleRows = tab === "all" ? preview : tab === "valid" ? validRows : errorRows;

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => { setImporting(false); setImported(true); setStep(3); }, 2000);
  };

  const reset = () => { setStep(0); setFile(null); setPreview([]); setImported(false); };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 lg:px-8 py-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[#000435] font-black text-xl">Bulk Salary Import</h1>
          <p className="text-slate-400 text-xs">Upload Excel to set salaries for multiple employees</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <Download size={15} /> Download Template
          </button>
          {step > 0 && (
            <button onClick={reset} className="flex items-center gap-2 text-slate-400 text-sm px-3 py-2.5 rounded-xl hover:bg-slate-100">
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">

        {/* Step bar */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <StepBar current={step} />
        </div>

        {/* Template columns info */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <Info size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Template Columns Required</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map(c => (
                <span key={c} className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Step 0 — Upload */}
        {step === 0 && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all
              ${dragging ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/30"}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-amber-400" : "bg-[#000435]"}`}>
              <Upload size={28} className="text-white" />
            </div>
            <div className="text-center">
              <p className="font-black text-[#000435] text-lg">Drop your Excel file here</p>
              <p className="text-slate-400 text-sm mt-1">or click to browse · .xlsx, .xls, .csv supported</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Step 1 — Processing */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
              <FileSpreadsheet size={28} className="text-amber-600 animate-pulse" />
            </div>
            <p className="font-black text-[#000435]">Validating {file?.name}…</p>
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Rows", value: preview.length, color: "text-[#000435]" },
                { label: "Valid", value: validRows.length, color: "text-green-600" },
                { label: "Errors", value: errorRows.length, color: "text-red-500" },
                { label: "File", value: file?.name?.slice(0, 16) + "…", color: "text-amber-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <p className={`text-xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[["all", "All Rows"], ["valid", "Valid"], ["errors", "Errors"]].map(([v, l]) => (
                <button key={v} onClick={() => setTab(v)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all
                    ${tab === v ? "bg-[#000435] text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-[#000435]"}`}>
                  {l} {v === "errors" && errorRows.length > 0 && <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{errorRows.length}</span>}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Row", "Emp No", "Name", "Basic", "Transport", "Housing", "RSSB No", "Bank", "Status"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map(r => (
                      <tr key={r.row} className={`border-b border-slate-50 ${r.errors.length > 0 ? "bg-red-50/40" : "hover:bg-amber-50/20"}`}>
                        <td className="px-3 py-2.5 text-slate-400">{r.row}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#000435]">{r.employeeNo || <span className="text-red-400 italic">Missing</span>}</td>
                        <td className="px-3 py-2.5 font-semibold text-[#000435]">{r.name}</td>
                        <td className={`px-3 py-2.5 font-semibold ${r.basic < 0 ? "text-red-500" : "text-[#000435]"}`}>
                          {r.basic < 0 ? "Invalid" : `RWF ${r.basic.toLocaleString()}`}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{r.transport ? `RWF ${r.transport.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2.5 text-slate-500">{r.housing ? `RWF ${r.housing.toLocaleString()}` : "—"}</td>
                        <td className="px-3 py-2.5">{r.rssb || <span className="text-amber-500 font-semibold">Missing</span>}</td>
                        <td className="px-3 py-2.5 text-slate-500">{r.bank || <span className="text-amber-500 font-semibold">Missing</span>}</td>
                        <td className="px-3 py-2.5">
                          {r.errors.length === 0
                            ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle size={12} /> Valid</span>
                            : (
                              <div>
                                {r.errors.map((e, i) => (
                                  <span key={i} className="flex items-center gap-1 text-red-500 font-semibold"><XCircle size={11} /> {e}</span>
                                ))}
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button onClick={reset} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Cancel
              </button>
              {errorRows.length > 0 && (
                <button className="px-5 py-2.5 border border-amber-300 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50">
                  Import Valid Only ({validRows.length})
                </button>
              )}
              <button onClick={handleImport} disabled={importing || validRows.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm rounded-xl transition-colors disabled:opacity-50">
                {importing ? <><RefreshCw size={14} className="animate-spin" /> Importing…</> : <>Import All ({preview.length}) <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-4 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <FileCheck size={30} className="text-green-600" />
            </div>
            <p className="font-black text-[#000435] text-xl">Import Successful</p>
            <p className="text-slate-400 text-sm">{validRows.length} employee salaries have been imported and are ready for payroll.</p>
            <div className="flex gap-3">
              <button onClick={reset} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Import Another
              </button>
              <button className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-[#000435] font-bold text-sm rounded-xl">
                Go to Payroll Run
              </button>
            </div>
          </div>
        )}

        {/* Import History */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <p className="font-black text-[#000435] text-sm">Import History</p>
            <Clock size={14} className="text-slate-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["File", "Uploaded By", "Date", "Records", "Errors", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HISTORY.map(h => (
                  <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <FileSpreadsheet size={14} className="text-green-600" />
                      <span className="text-sm font-semibold text-[#000435]">{h.file}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{h.uploadedBy}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{h.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#000435]">{h.records}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${h.errors === 0 ? "text-green-600" : "text-amber-600"}`}>{h.errors === 0 ? "None" : h.errors}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${h.status === "Imported" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}