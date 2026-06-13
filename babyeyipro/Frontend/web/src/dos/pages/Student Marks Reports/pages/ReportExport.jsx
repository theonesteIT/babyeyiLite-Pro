import { FileDown, FileSpreadsheet, Printer, Archive } from 'lucide-react';
import PageShell, { Panel } from '../components/PageShell';

const REPORT_TYPES = [
  { name: 'Board meeting summary', format: 'PDF', icon: FileDown },
  { name: 'Class performance export', format: 'Excel', icon: FileSpreadsheet },
  { name: 'At-risk student list', format: 'PDF', icon: FileDown },
  { name: 'Teacher performance report', format: 'PDF', icon: FileDown },
  { name: 'Term comparison', format: 'Excel', icon: FileSpreadsheet },
  { name: 'Historical archive', format: 'Archive', icon: Archive },
];

export default function ReportExport() {
  return (
    <PageShell
      title="Report Export & Audit"
      subtitle="Generate PDF/Excel reports, print summaries, and maintain historical archives."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.name}
            type="button"
            className="marks-panel rounded-2xl p-5 text-left hover:shadow-lg hover:border-amber-200 transition-all group"
          >
            <r.icon size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-black text-[#000435] mt-3">{r.name}</p>
            <p className="text-xs text-slate-400 mt-1">{r.format} · Mock export ready</p>
          </button>
        ))}
      </div>

      <Panel title="Recent exports">
        <div className="space-y-2 text-sm">
          {['Term 2 School Summary — 2026-03-01.pdf', 'S3 Class Report — 2026-02-28.xlsx', 'At-Risk List — 2026-02-25.pdf'].map((f) => (
            <div key={f} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-medium text-[#000435]">{f}</span>
              <div className="flex gap-2">
                <button type="button" className="p-2 rounded-lg hover:bg-white text-slate-500" aria-label="Download"><FileDown size={16} /></button>
                <button type="button" className="p-2 rounded-lg hover:bg-white text-slate-500" aria-label="Print"><Printer size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
