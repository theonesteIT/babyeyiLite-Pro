import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Printer,
  Receipt,
  Users,
  AlertCircle,
  Building2,
  GraduationCap,
  Wallet,
  FileBarChart,
  Sparkles,
  Loader2,
  Download,
} from 'lucide-react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import {
  fetchRepresentativeReports,
  fetchRepresentativeExpenses,
  fetchRepresentativeRequisitions,
  fetchRepresentativeFinancialAnalytics,
  fetchRepresentativeFeesManagement,
  fetchRepresentativeStaffPayroll,
} from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ICON_MAP = {
  'fee-collection': Receipt,
  payroll: Users,
  'pending-fees': AlertCircle,
  'school-financial': Building2,
  'student-payment': GraduationCap,
  'salary-payment': Wallet,
};

const fmtRWF = (n) => {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1_000_000_000) return `RWF ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `RWF ${(v / 1_000).toFixed(1)}K`;
  return `RWF ${v.toLocaleString()}`;
};
const fmtFull = (n) => (n != null ? Number(n).toLocaleString() : '—');
const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function buildPdfHeader(doc, title, subtitle) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(0, 4, 53);
  doc.rect(0, 0, W, 38, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 38, W, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle || `Generated ${today()}`, 14, 28);
  doc.text(`Babyeyi Pro · Representative Portal`, W - 14, 28, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  return 46;
}

function addPageFooters(doc) {
  const pages = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, W / 2, H - 8, { align: 'center' });
    doc.text(`Babyeyi Pro`, 14, H - 8);
    doc.text(today(), W - 14, H - 8, { align: 'right' });
  }
}

export default function Reports() {
  const { activeSchool, activeSchoolId } = useRepresentativeData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const toastTimer = useRef(null);

  const schoolParam = activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRepresentativeReports(schoolParam);
      if (!res?.success) { setError(res?.message || 'Failed to load'); return; }
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [schoolParam]);

  useEffect(() => { load(); }, [load]);

  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const exportNetworkSummaryPdf = async () => {
    setExportingId('summary-pdf');
    try {
      const summary = data?.network_summary || {};
      const reports = data?.reports || [];
      const schools = data?.schools || [];
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const scopeLabel = activeSchool ? activeSchool.school_name : `${summary.total_schools || 0} school(s)`;
      let y = buildPdfHeader(doc, 'Network Financial Summary', `${scopeLabel} · ${today()}`);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Metrics', 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Schools', String(summary.total_schools || 0)],
          ['Total Revenue', `RWF ${fmtFull(summary.total_revenue_rwf)}`],
          ['Total Expenses', `RWF ${fmtFull(summary.total_expenses_rwf)}`],
          ['Total Payroll', `RWF ${fmtFull(summary.total_payroll_rwf)}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;

      if (schools.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Schools', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['#', 'School Name', 'Code']],
          body: schools.map((s, i) => [String(i + 1), s.name, s.school_code || '—']),
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      if (reports.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Report Inventory', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Report', 'Records', 'Total (RWF)']],
          body: reports.map((r) => [r.title, String(r.record_count ?? '—'), r.total_rwf != null ? fmtFull(r.total_rwf) : '—']),
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
      }

      addPageFooters(doc);
      doc.save(`Network_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('Network Summary PDF downloaded.');
    } catch (e) {
      notify('Failed to generate PDF — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  const exportReportPdf = async (reportDef) => {
    const id = reportDef.id;
    setExportingId(id);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const scopeLabel = activeSchool ? activeSchool.school_name : 'All Schools';
      let y = buildPdfHeader(doc, reportDef.title, `${scopeLabel} · ${today()}`);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(reportDef.description, W - 28);
      doc.text(descLines, 14, y);
      y += descLines.length * 5 + 4;

      if (id === 'fee-collection' || id === 'pending-fees' || id === 'student-payment') {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Records', String(reportDef.record_count ?? 0)],
            ['Total (RWF)', reportDef.total_rwf != null ? fmtFull(reportDef.total_rwf) : '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 8;

        let feesData = null;
        try {
          const feesRes = await fetchRepresentativeFeesManagement(schoolParam);
          if (feesRes?.success) feesData = feesRes.data;
        } catch (_) {}

        if (feesData) {
          const sum = feesData.summary || {};
          autoTable(doc, {
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Total Expected (RWF)', fmtFull(sum.total_expected_rwf)],
              ['Total Paid (RWF)', fmtFull(sum.total_paid_rwf)],
              ['Total Remaining (RWF)', fmtFull(sum.total_remaining_rwf)],
              ['Collection Rate', `${sum.collection_pct || 0}%`],
              ['Fully Paid', String(sum.paid_invoice_count || 0)],
              ['Partial Payments', String(sum.partial_invoice_count || 0)],
              ['Unpaid', String(sum.unpaid_invoice_count || 0)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11], textColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
            tableWidth: 140,
          });
          y = doc.lastAutoTable.finalY + 8;

          if ((feesData.invoices || []).length > 0) {
            const invoices = feesData.invoices;
            const byClass = new Map();
            for (const inv of invoices) {
              const cls = inv.class || '—';
              if (!byClass.has(cls)) byClass.set(cls, { expected: 0, paid: 0, remaining: 0, count: 0 });
              const c = byClass.get(cls);
              c.expected += Number(inv.expected || 0);
              c.paid += Number(inv.paid || 0);
              c.remaining += Number(inv.remaining || 0);
              c.count += 1;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Fee Collection by Class', 14, y);
            y += 5;
            autoTable(doc, {
              startY: y,
              head: [['Class', 'Students', 'Expected (RWF)', 'Paid (RWF)', 'Remaining (RWF)', '% Collected']],
              body: [...byClass.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cls, c]) => [
                cls, String(c.count), fmtFull(c.expected), fmtFull(c.paid), fmtFull(c.remaining),
                c.expected > 0 ? `${Math.round((c.paid / c.expected) * 100)}%` : '—',
              ]),
              theme: 'striped',
              headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
              bodyStyles: { fontSize: 8 },
              margin: { left: 14, right: 14 },
            });
          }
        }
      }

      if (id === 'payroll' || id === 'salary-payment') {
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Payroll Records', String(reportDef.record_count ?? 0)],
            ['Total Payroll (RWF)', reportDef.total_rwf != null ? fmtFull(reportDef.total_rwf) : '—'],
          ],
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 8;

        let payrollData = null;
        try {
          const payRes = await fetchRepresentativeStaffPayroll(schoolParam);
          if (payRes?.success) payrollData = payRes.data;
        } catch (_) {}

        if (payrollData) {
          const paySum = payrollData.summary || {};
          autoTable(doc, {
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Total Gross Pay (RWF)', fmtFull(paySum.total_gross)],
              ['Total Net Pay (RWF)', fmtFull(paySum.total_net)],
              ['Total Deductions (RWF)', fmtFull(paySum.total_deductions)],
              ['Staff Count', String(paySum.staff_count || 0)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
            tableWidth: 140,
          });
          y = doc.lastAutoTable.finalY + 8;

          if ((payrollData.records || []).length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Payroll Details', 14, y);
            y += 5;
            autoTable(doc, {
              startY: y,
              head: [['#', 'Staff', 'School', 'Month', 'Gross (RWF)', 'Net (RWF)', 'Status']],
              body: payrollData.records.slice(0, 200).map((p, i) => [
                String(i + 1), p.staff_name || '—', p.school || '—', p.month || '—',
                fmtFull(p.gross), fmtFull(p.net), (p.status || '').toUpperCase(),
              ]),
              theme: 'striped',
              headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
              bodyStyles: { fontSize: 7 },
              margin: { left: 14, right: 14 },
              styles: { overflow: 'linebreak', cellPadding: 1.5 },
            });
          }
        }
      }

      if (id === 'school-financial') {
        let expData = [];
        try {
          const analytics = await fetchRepresentativeFinancialAnalytics(schoolParam);
          if (analytics?.success && analytics.data?.schools?.length) {
            expData = analytics.data.schools;
          }
        } catch (_) {}
        if (expData.length > 0) {
          y = (doc.lastAutoTable?.finalY || y) + 10;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('School Financial Breakdown', 14, y);
          y += 6;
          autoTable(doc, {
            startY: y,
            head: [['School', 'Fees Collected (RWF)', 'Fees Expected (RWF)', 'Collection %']],
            body: expData.map((s) => [
              s.name,
              fmtFull(s.fees_collected),
              fmtFull(s.fees_expected),
              s.fees_expected > 0 ? `${Math.round((s.fees_collected / s.fees_expected) * 100)}%` : '—',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
          });
        }

        let feesData = null;
        try {
          const feesRes = await fetchRepresentativeFeesManagement(schoolParam);
          if (feesRes?.success) feesData = feesRes.data;
        } catch (_) {}
        if (feesData) {
          y = (doc.lastAutoTable?.finalY || y) + 8;
          const sum = feesData.summary || {};
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Fee Collection Overview', 14, y);
          y += 5;
          autoTable(doc, {
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Total Expected (RWF)', fmtFull(sum.total_expected_rwf)],
              ['Total Paid (RWF)', fmtFull(sum.total_paid_rwf)],
              ['Remaining (RWF)', fmtFull(sum.total_remaining_rwf)],
              ['Collection Rate', `${sum.collection_pct || 0}%`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11], textColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
            tableWidth: 140,
          });
        }

        let expensesData = [];
        try {
          const expRes = await fetchRepresentativeExpenses(schoolParam);
          if (expRes?.success) expensesData = expRes.data || [];
        } catch (_) {}
        if (expensesData.length > 0) {
          y = (doc.lastAutoTable?.finalY || y) + 8;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Expense Summary', 14, y);
          y += 5;
          const totalExp = expensesData.reduce((s, r) => s + Number(r.amount || 0), 0);
          autoTable(doc, {
            startY: y,
            head: [['Metric', 'Value']],
            body: [
              ['Total Expenses', String(expensesData.length)],
              ['Total Amount (RWF)', fmtFull(totalExp)],
              ['Approved', String(expensesData.filter((r) => r.status === 'approved').length)],
              ['Pending', String(expensesData.filter((r) => r.status === 'pending').length)],
            ],
            theme: 'grid',
            headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: 14, right: 14 },
            tableWidth: 140,
          });
        }
      }

      addPageFooters(doc);
      const safeName = reportDef.title.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify(`"${reportDef.title}" PDF downloaded.`);
    } catch (e) {
      notify('Failed to generate report — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  const exportExpensesPdf = async () => {
    setExportingId('expenses-pdf');
    try {
      const res = await fetchRepresentativeExpenses(schoolParam);
      const rows = res?.success ? res.data || [] : [];
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const scopeLabel = activeSchool ? activeSchool.school_name : 'All Schools';
      let y = buildPdfHeader(doc, 'Expenses Report', `${scopeLabel} · ${today()} · ${rows.length} record(s)`);

      const totalAmt = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      const approved = rows.filter((r) => r.status === 'approved').length;
      const pending = rows.filter((r) => r.status === 'pending').length;
      const rejected = rows.filter((r) => r.status === 'rejected').length;
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Expenses', String(rows.length)],
          ['Total Amount (RWF)', fmtFull(totalAmt)],
          ['Approved', String(approved)],
          ['Pending', String(pending)],
          ['Rejected', String(rejected)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 10, right: 10 },
        tableWidth: 120,
      });
      y = doc.lastAutoTable.finalY + 8;

      const byCat = {};
      for (const r of rows) {
        const cat = r.category || 'Other';
        if (!byCat[cat]) byCat[cat] = { count: 0, total: 0 };
        byCat[cat].count += 1;
        byCat[cat].total += Number(r.amount || 0);
      }
      if (Object.keys(byCat).length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('By Category', 10, y);
        y += 5;
        autoTable(doc, {
          startY: y,
          head: [['Category', 'Count', 'Total (RWF)']],
          body: Object.entries(byCat).sort((a, b) => b[1].total - a[1].total).map(([cat, v]) => [cat, String(v.count), fmtFull(v.total)]),
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 10, right: 10 },
          tableWidth: 160,
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('All Expenses', 10, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Ref', 'School', 'Category', 'Title', 'Vendor', 'Amount (RWF)', 'Status', 'Date']],
        body: rows.map((r) => [
          r.id, r.school, r.category, r.title || '—', r.vendor || '—',
          fmtFull(r.amount), (r.status || '').toUpperCase(),
          r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
        styles: { overflow: 'linebreak', cellPadding: 2 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            const val = String(data.cell.raw || '').toUpperCase();
            if (val === 'APPROVED') data.cell.styles.textColor = [16, 185, 129];
            else if (val === 'PENDING') data.cell.styles.textColor = [245, 158, 11];
            else if (val === 'REJECTED') data.cell.styles.textColor = [244, 63, 94];
          }
        },
      });
      addPageFooters(doc);
      doc.save(`Expenses_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('Expenses PDF downloaded.');
    } catch (e) {
      notify('Failed — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  const exportRequisitionsPdf = async () => {
    setExportingId('requisitions-pdf');
    try {
      const res = await fetchRepresentativeRequisitions(schoolParam);
      const rows = res?.success ? res.data || [] : [];
      const summary = res?.summary || {};
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const scopeLabel = activeSchool ? activeSchool.school_name : 'All Schools';
      let y = buildPdfHeader(doc, 'Requisitions Report', `${scopeLabel} · ${today()} · ${rows.length} record(s)`);

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Count']],
        body: [
          ['Total Requisitions', String(summary.total || rows.length)],
          ['Pending', String(summary.pending || 0)],
          ['Approved', String(summary.approved || 0)],
          ['Rejected', String(summary.rejected || 0)],
          ['Issued', String(summary.issued || 0)],
          ['Forwarded', String(summary.forwarded || 0)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 10, right: 10 },
        tableWidth: 120,
      });
      y = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('All Requisitions', 10, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['ID', 'School', 'Items', 'Dept', 'Requester', 'Amount (RWF)', 'Status', 'Submitted']],
        body: rows.map((r) => [
          r.id, r.school, r.items || r.item_name || '—', r.dept, r.requester,
          r.amount > 0 ? fmtFull(r.amount) : '—', (r.status || '').toUpperCase(),
          r.submitted ? new Date(r.submitted).toLocaleDateString('en-GB') : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 10, right: 10 },
        styles: { overflow: 'linebreak', cellPadding: 2 },
      });
      addPageFooters(doc);
      doc.save(`Requisitions_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('Requisitions PDF downloaded.');
    } catch (e) {
      notify('Failed — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  const exportSchoolFeesPdf = async () => {
    setExportingId('fees-pdf');
    try {
      const res = await fetchRepresentativeFeesManagement(schoolParam);
      if (!res?.success) { notify('No fees data available.'); return; }
      const d = res.data;
      const sum = d.summary || {};
      const invoices = d.invoices || [];
      const schools = d.schools || [];
      const classNames = d.class_names || [];
      const filters = d.filters || {};

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const scopeLabel = activeSchool ? activeSchool.school_name : 'All Schools';
      const termLabel = filters.term ? `Term ${filters.term}` : '';
      const yearLabel = filters.academic_year || '';
      let y = buildPdfHeader(doc, 'School Fees Report', `${scopeLabel} · ${[yearLabel, termLabel].filter(Boolean).join(' · ')} · ${today()}`);

      // ── Summary KPIs ──
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Fee Collection Summary', 10, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Expected (RWF)', fmtFull(sum.total_expected_rwf)],
          ['Total Paid (RWF)', fmtFull(sum.total_paid_rwf)],
          ['Total Remaining (RWF)', fmtFull(sum.total_remaining_rwf)],
          ['Collection Rate', `${sum.collection_pct || 0}%`],
          ['Fully Paid Students', String(sum.paid_invoice_count || 0)],
          ['Partial Payment Students', String(sum.partial_invoice_count || 0)],
          ['Unpaid Students', String(sum.unpaid_invoice_count || 0)],
          ['Today\'s Collections (RWF)', fmtFull(sum.today_paid_rwf)],
          ['This Week (RWF)', fmtFull(sum.week_paid_rwf)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 10, right: 10 },
        tableWidth: 140,
      });
      y = doc.lastAutoTable.finalY + 8;

      // ── Per-school summary ──
      if (schools.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Per-School Breakdown', 10, y);
        y += 5;
        autoTable(doc, {
          startY: y,
          head: [['School', 'Expected (RWF)', 'Collected (RWF)', 'Collection %']],
          body: schools.map((s) => [
            s.name,
            fmtFull(s.fees_expected),
            fmtFull(s.fees_collected),
            s.fees_expected > 0 ? `${Math.round((s.fees_collected / s.fees_expected) * 100)}%` : '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 10, right: 10 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // ── Per-class breakdown ──
      if (classNames.length > 0 && invoices.length > 0) {
        const byClass = new Map();
        for (const inv of invoices) {
          const cls = inv.class || '—';
          if (!byClass.has(cls)) byClass.set(cls, { expected: 0, paid: 0, remaining: 0, count: 0, fullPaid: 0, partial: 0, unpaid: 0 });
          const c = byClass.get(cls);
          c.expected += Number(inv.expected || 0);
          c.paid += Number(inv.paid || 0);
          c.remaining += Number(inv.remaining || 0);
          c.count += 1;
          if (inv.status === 'paid') c.fullPaid += 1;
          else if (inv.status === 'partial') c.partial += 1;
          else c.unpaid += 1;
        }

        const needsNewPage = y > doc.internal.pageSize.getHeight() - 60;
        if (needsNewPage) { doc.addPage('landscape'); y = buildPdfHeader(doc, 'School Fees Report — Class Breakdown', `${scopeLabel} · ${today()}`); }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Per-Class Breakdown', 10, y);
        y += 5;
        autoTable(doc, {
          startY: y,
          head: [['Class', 'Students', 'Expected (RWF)', 'Paid (RWF)', 'Remaining (RWF)', 'Collection %', 'Fully Paid', 'Partial', 'Unpaid']],
          body: [...byClass.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([cls, c]) => [
              cls, String(c.count), fmtFull(c.expected), fmtFull(c.paid), fmtFull(c.remaining),
              c.expected > 0 ? `${Math.round((c.paid / c.expected) * 100)}%` : '—',
              String(c.fullPaid), String(c.partial), String(c.unpaid),
            ]),
          foot: [[
            'TOTAL', String(invoices.length), fmtFull(sum.total_expected_rwf), fmtFull(sum.total_paid_rwf), fmtFull(sum.total_remaining_rwf),
            `${sum.collection_pct || 0}%`, String(sum.paid_invoice_count || 0), String(sum.partial_invoice_count || 0), String(sum.unpaid_invoice_count || 0),
          ]],
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
          footStyles: { fillColor: [245, 158, 11], textColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          margin: { left: 10, right: 10 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // ── Detailed student list ──
      if (invoices.length > 0) {
        doc.addPage('landscape');
        y = buildPdfHeader(doc, 'School Fees — Student Details', `${scopeLabel} · ${invoices.length} student(s) · ${today()}`);

        autoTable(doc, {
          startY: y,
          head: [['#', 'Student Name', 'School', 'Class', 'Expected (RWF)', 'Paid (RWF)', 'Remaining (RWF)', 'Status', 'Last Payment']],
          body: invoices.map((inv, i) => [
            String(i + 1),
            inv.name || '—',
            inv.school || '—',
            inv.class || '—',
            fmtFull(inv.expected),
            fmtFull(inv.paid),
            fmtFull(inv.remaining),
            (inv.status || '—').toUpperCase(),
            inv.lastPayment || '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [0, 4, 53], fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7 },
          margin: { left: 8, right: 8 },
          styles: { overflow: 'linebreak', cellPadding: 1.5 },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 7) {
              const val = String(data.cell.raw || '').toUpperCase();
              if (val === 'PAID') data.cell.styles.textColor = [16, 185, 129];
              else if (val === 'PARTIAL') data.cell.styles.textColor = [245, 158, 11];
              else if (val === 'UNPAID') data.cell.styles.textColor = [244, 63, 94];
            }
          },
        });
      }

      addPageFooters(doc);
      doc.save(`School_Fees_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify('School Fees PDF downloaded.');
    } catch (e) {
      notify('Failed to generate fees report — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  const handleBulkExport = async (kind) => {
    if (kind === 'Print') {
      window.print();
      return;
    }
    setExportingId(`bulk-${kind}`);
    try {
      const summary = data?.network_summary || {};
      const reports = data?.reports || [];
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const scopeLabel = activeSchool ? activeSchool.school_name : `${summary.total_schools || 0} school(s)`;
      let y = buildPdfHeader(doc, `${kind} Export — Financial Pack`, `${scopeLabel} · ${today()}`);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Network Summary', 14, y);
      y += 6;
      const netSurplus = (summary.total_revenue_rwf || 0) - (summary.total_expenses_rwf || 0) - (summary.total_payroll_rwf || 0);
      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Value']],
        body: [
          ['Total Schools', String(summary.total_schools || 0)],
          ['Revenue', `RWF ${fmtFull(summary.total_revenue_rwf)}`],
          ['Expenses', `RWF ${fmtFull(summary.total_expenses_rwf)}`],
          ['Payroll', `RWF ${fmtFull(summary.total_payroll_rwf)}`],
          ['Net Surplus', `RWF ${fmtFull(netSurplus)}`],
          ['Profit Margin', summary.total_revenue_rwf > 0 ? `${Math.round((netSurplus / summary.total_revenue_rwf) * 100)}%` : '—'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 8;

      let feesData = null;
      try {
        const feesRes = await fetchRepresentativeFeesManagement(schoolParam);
        if (feesRes?.success) feesData = feesRes.data;
      } catch (_) {}

      if (feesData) {
        const feeSum = feesData.summary || {};
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('School Fees Overview', 14, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [['Metric', 'Value']],
          body: [
            ['Total Expected (RWF)', fmtFull(feeSum.total_expected_rwf)],
            ['Total Paid (RWF)', fmtFull(feeSum.total_paid_rwf)],
            ['Total Remaining (RWF)', fmtFull(feeSum.total_remaining_rwf)],
            ['Collection Rate', `${feeSum.collection_pct || 0}%`],
            ['Fully Paid Students', String(feeSum.paid_invoice_count || 0)],
            ['Partial', String(feeSum.partial_invoice_count || 0)],
            ['Unpaid', String(feeSum.unpaid_invoice_count || 0)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 4, 53], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 8;

        if ((feesData.invoices || []).length > 0) {
          const byClass = new Map();
          for (const inv of feesData.invoices) {
            const cls = inv.class || '—';
            if (!byClass.has(cls)) byClass.set(cls, { expected: 0, paid: 0, remaining: 0, count: 0 });
            const c = byClass.get(cls);
            c.expected += Number(inv.expected || 0);
            c.paid += Number(inv.paid || 0);
            c.remaining += Number(inv.remaining || 0);
            c.count += 1;
          }
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Fees by Class', 14, y);
          y += 5;
          autoTable(doc, {
            startY: y,
            head: [['Class', 'Students', 'Expected (RWF)', 'Paid (RWF)', 'Remaining (RWF)', '% Collected']],
            body: [...byClass.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cls, c]) => [
              cls, String(c.count), fmtFull(c.expected), fmtFull(c.paid), fmtFull(c.remaining),
              c.expected > 0 ? `${Math.round((c.paid / c.expected) * 100)}%` : '—',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
          });
          y = doc.lastAutoTable.finalY + 8;
        }
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Available Reports', 14, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Report', 'Records', 'Total (RWF)', 'Description']],
        body: reports.map((r) => [r.title, String(r.record_count ?? '—'), r.total_rwf != null ? fmtFull(r.total_rwf) : '—', r.description]),
        theme: 'striped',
        headStyles: { fillColor: [0, 4, 53], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        columnStyles: { 3: { cellWidth: 70 } },
      });

      addPageFooters(doc);
      doc.save(`Financial_Pack_${kind}_${new Date().toISOString().slice(0, 10)}.pdf`);
      notify(`${kind} financial pack downloaded.`);
    } catch (e) {
      notify('Export failed — ' + (e.message || ''));
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#000435]" /></div>;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase tracking-widest">Retry</button>
      </div>
    );
  }

  const reports = data?.reports || [];
  const summary = data?.network_summary || {};

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-24">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #000435 0%, #000320 60%, #00021a 100%)' }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-14 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-0.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">Finance · Compliance</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                Reports &amp; Export Center
              </h1>
              <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
                {activeSchool
                  ? `Reports for ${activeSchool.school_name}.`
                  : `Audit-ready exports across ${summary.total_schools || 0} school(s). Revenue: ${fmtRWF(summary.total_revenue_rwf)}.`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button onClick={exportNetworkSummaryPdf} disabled={!!exportingId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-[11px] font-bold text-white ring-1 ring-white/10 hover:bg-white/20 transition-all disabled:opacity-50 active:scale-[0.98]">
                {exportingId === 'summary-pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Summary PDF
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold text-white/80 ring-1 ring-white/10">
                <Sparkles size={14} className="text-amber-400" aria-hidden /> ISO-aligned
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-6">
        {toast && (
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-900 shadow-sm">{toast}</div>
        )}

        {/* Bulk Export Dock */}
        <section className="rounded-2xl bg-white border border-black/10 shadow-[0_8px_40px_-16px_rgba(0,4,53,0.18)] overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#000435]/8 text-[#000435]">
                <FileBarChart size={22} strokeWidth={1.75} aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Export financial pack</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Download a complete PDF financial pack with all metrics and report inventory.</p>
              </div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right">{summary.total_schools || 0} school(s) · {fmtRWF(summary.total_revenue_rwf)} revenue</p>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { kind: 'PDF', icon: FileText, accent: 'rose', desc: 'Full PDF financial pack' },
              { kind: 'Excel', icon: FileSpreadsheet, accent: 'emerald', desc: 'PDF summary (Excel coming soon)' },
              { kind: 'CSV', icon: FileDown, accent: 'sky', desc: 'PDF summary (CSV coming soon)' },
              { kind: 'Print', icon: Printer, accent: 'amber', desc: 'Print current page' },
            ].map(({ kind, icon: Icon, accent, desc }) => (
              <button key={kind} type="button" onClick={() => handleBulkExport(kind)} disabled={!!exportingId}
                className={`group flex flex-col items-start gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-4 text-left transition-all hover:border-${accent}-300/80 hover:shadow-md active:scale-[0.99] disabled:opacity-50 ${kind === 'Print' ? 'col-span-2 lg:col-span-1' : ''}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${accent}-500/10 text-${accent}-600 ring-1 ring-${accent}-500/15`}>
                  {exportingId === `bulk-${kind}` ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} strokeWidth={1.75} />}
                </span>
                <span className="text-[13px] font-black text-slate-900">{kind}</span>
                <span className="text-[10px] font-semibold text-slate-500 leading-snug">{desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Quick export row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button onClick={exportSchoolFeesPdf} disabled={!!exportingId}
            className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all active:scale-[0.99] disabled:opacity-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-400/20 shrink-0">
              {exportingId === 'fees-pdf' ? <Loader2 size={20} className="animate-spin" /> : <GraduationCap size={20} strokeWidth={1.75} />}
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black text-slate-900">School Fees Report (PDF)</p>
              <p className="text-[10px] text-slate-500">Total paid & remaining, per-class breakdown, student details</p>
            </div>
          </button>
          <button onClick={exportExpensesPdf} disabled={!!exportingId}
            className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99] disabled:opacity-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 ring-1 ring-amber-400/20 shrink-0">
              {exportingId === 'expenses-pdf' ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} strokeWidth={1.75} />}
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black text-slate-900">Export All Expenses (PDF)</p>
              <p className="text-[10px] text-slate-500">Download full expense table with status and amounts</p>
            </div>
          </button>
          <button onClick={exportRequisitionsPdf} disabled={!!exportingId}
            className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:scale-[0.99] disabled:opacity-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-400/20 shrink-0">
              {exportingId === 'requisitions-pdf' ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} strokeWidth={1.75} />}
            </div>
            <div className="text-left">
              <p className="text-[13px] font-black text-slate-900">Export All Requisitions (PDF)</p>
              <p className="text-[10px] text-slate-500">Download full requisitions table with departments and status</p>
            </div>
          </button>
        </div>

        {/* Report Catalog */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Standard reports</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{reports.length} report(s) · tap to download PDF</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {reports.map((r) => {
              const IconComp = ICON_MAP[r.id] || Receipt;
              const isExporting = exportingId === r.id;
              return (
                <article key={r.id}
                  className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_-12px_rgba(0,4,53,0.12)] transition-all hover:border-slate-300 hover:shadow-lg">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-inner ring-1 ring-black/5"
                      style={{ background: `linear-gradient(135deg, ${r.accent}, ${r.accent}cc)` }}>
                      <IconComp size={22} strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-black text-slate-900 leading-snug">{r.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{r.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {r.record_count != null ? `${r.record_count.toLocaleString()} records` : '—'}
                    </span>
                    <button type="button" onClick={() => exportReportPdf(r)} disabled={!!exportingId}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#000435] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-sm ring-1 ring-white/10 hover:bg-[#00052a] active:scale-[0.98] transition-all w-full sm:w-auto disabled:opacity-50">
                      {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {isExporting ? 'Generating…' : 'Download PDF'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="rounded-2xl border border-dashed border-slate-300/80 bg-white/60 px-4 py-4 text-center text-[11px] font-semibold text-slate-500">
          All exports are branded with Babyeyi Pro headers · Full audit trail retained per your network policy.
        </footer>
      </div>
    </div>
  );
}
