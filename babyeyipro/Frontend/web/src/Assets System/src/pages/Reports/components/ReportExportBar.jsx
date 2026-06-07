import { Download, FileSpreadsheet, FileText, Printer, Share2 } from 'lucide-react';
import { NAVY, GOLD } from '../reportConfig';
import { exportReportCsv, exportReportExcel, exportReportPdf, printReportTable } from '../utils/reportExport';

export default function ReportExportBar({ title, subtitle, columns, rows, tableId = 'report-table', disabled }) {
  const slug = String(title || 'report').toLowerCase().replace(/\s+/g, '-');

  const handleExcel = () => exportReportExcel({ title, columns, rows, filename: slug });
  const handlePdf = () => exportReportPdf({ title, subtitle, columns, rows, filename: slug });
  const handleCsv = () => exportReportCsv({ columns, rows, filename: slug });
  const handlePrint = () => printReportTable(tableId);
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch { /* ignore */ }
  };

  const btn = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={disabled} onClick={handleExcel} className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button type="button" disabled={disabled} onClick={handlePdf} className={`${btn} border-red-200 bg-red-50 text-red-800 hover:bg-red-100`}>
        <FileText size={14} /> PDF
      </button>
      <button type="button" disabled={disabled} onClick={handleCsv} className={`${btn} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
        <Download size={14} /> CSV
      </button>
      <button type="button" disabled={disabled} onClick={handleShare} className={`${btn} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`}>
        <Share2 size={14} /> Share
      </button>
      <button type="button" disabled={disabled} onClick={handlePrint} className={`${btn} text-[#000435] hover:opacity-90`} style={{ background: GOLD, borderColor: GOLD }}>
        <Printer size={14} /> Print
      </button>
    </div>
  );
}
