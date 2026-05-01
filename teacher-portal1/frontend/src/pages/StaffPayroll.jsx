import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, PrinterIcon } from 'lucide-react';
import api from '../services/api';
import { jsPDF } from 'jspdf';

const fmt = (v) => `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0)} RWF`;
const fmtN = (v) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const buildPayslipHtml = (record, staff) => {
  const basic = Number(record?.basic || 0);
  const allowances = Number(record?.allowances || 0);
  const deductions = Number(record?.deductions ?? record?.tax ?? 0);
  const rssb = Number(record?.rssb || 0);
  const advance = Number(record?.advance || 0);
  const net = Number(record?.net || 0);
  const paid = Number(record?.paid || 0);
  const gross = basic + allowances;
  const totalDeductions = rssb + deductions + advance;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip - ${esc(staff?.staffCode)} - ${esc(record?.month)} ${esc(record?.year)}</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 700px; margin: 24px auto; color: #111; }
    h1 { text-align: center; letter-spacing: 2px; margin: 0 0 6px; font-size: 22px; }
    .sub { text-align: center; color: #666; margin-bottom: 16px; font-size: 12px; }
    .line { border-top: 1px dashed #999; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; }
    .bold { font-weight: 700; }
    .total { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 15px; }
    .section { margin-top: 12px; font-size: 12px; color: #555; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
    .footer { margin-top: 24px; text-align: center; color: #777; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Official Payslip</h1>
  <div class="sub">Babyeyi School System - Teacher Portal</div>
  <div class="row"><span>Staff Name:</span><strong>${esc(staff?.fullName || '-')}</strong></div>
  <div class="row"><span>Staff Code:</span><span>${esc(staff?.staffCode || '-')}</span></div>
  <div class="row"><span>Department:</span><span>${esc(staff?.department || '-')}</span></div>
  <div class="row"><span>Role:</span><span>${esc(staff?.role || '-')}</span></div>
  <div class="row"><span>Pay Period:</span><strong>${esc(record?.month || '-')} ${esc(record?.year || '')} ${esc(record?.term || '')}</strong></div>
  <div class="row"><span>Status:</span><span>${esc(record?.status || '-')}</span></div>
  <div class="line"></div>
  <div class="section">Earnings</div>
  <div class="row"><span>Basic Salary</span><span>${fmtN(basic)} RWF</span></div>
  <div class="row"><span>Allowances</span><span>+ ${fmtN(allowances)} RWF</span></div>
  <div class="row bold"><span>Gross Pay</span><span>${fmtN(gross)} RWF</span></div>
  <div class="line"></div>
  <div class="section">Deductions</div>
  <div class="row"><span>RSSB / Pension</span><span>- ${fmtN(rssb)} RWF</span></div>
  <div class="row"><span>Income Tax / Deductions</span><span>- ${fmtN(deductions)} RWF</span></div>
  <div class="row"><span>Advance Deduction</span><span>- ${fmtN(advance)} RWF</span></div>
  <div class="row bold"><span>Total Deductions</span><span>- ${fmtN(totalDeductions)} RWF</span></div>
  <div class="line"></div>
  <div class="row total"><span>NET SALARY</span><span>${fmtN(net)} RWF</span></div>
  <div class="row total"><span>AMOUNT PAID</span><span>${fmtN(paid)} RWF</span></div>
  <div class="footer">Computer-generated payslip. No signature required.</div>
</body>
</html>`;
};

const loadLogoPngDataUrl = async () => {
  try {
    const loadImageFromSrc = async (src) => {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(image, 0, 0, 256, 256);
      return canvas.toDataURL('image/png');
    };
    try {
      return await loadImageFromSrc('/1BABYEYI LOGO FINAL.png');
    } catch {
      const svgText = await fetch('/favicon.svg').then((r) => r.text());
      const encoded = window.btoa(unescape(encodeURIComponent(svgText)));
      return await loadImageFromSrc(`data:image/svg+xml;base64,${encoded}`);
    }
  } catch {
    return null;
  }
};

const toAssetUrl = (rawPath) => {
  const p = String(rawPath || '').trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`;
};

const loadRemoteImagePngDataUrl = async (src) => {
  if (!src) return null;
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(image, 0, 0, 256, 256);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

const generatePayslipPdf = async (record, staff, school) => {
  const basic = Number(record?.basic || 0);
  const allowances = Number(record?.allowances || 0);
  const deductions = Number(record?.deductions ?? record?.tax ?? 0);
  const rssb = Number(record?.rssb || 0);
  const advance = Number(record?.advance || 0);
  const net = Number(record?.net || 0);
  const paid = Number(record?.paid || 0);
  const gross = basic + allowances;
  const totalDeductions = rssb + deductions + advance;
  const logo = await loadLogoPngDataUrl();
  const schoolLogo = await loadRemoteImagePngDataUrl(toAssetUrl(school?.logoUrl));
  const schoolStamp = await loadRemoteImagePngDataUrl(toAssetUrl(school?.stampUrl));
  const schoolSignature = await loadRemoteImagePngDataUrl(toAssetUrl(school?.signatureUrl));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;
  const brandLogoW = 34;
  const brandLogoH = 20;
  const schoolLogoSize = 20;
  const titleStartX = margin + 4 + brandLogoW + 4;

  doc.setFillColor(0, 4, 53);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'F');
  if (logo) {
    doc.addImage(logo, 'PNG', margin + 4, y + 4, brandLogoW, brandLogoH);
  }
  if (schoolLogo) {
    doc.addImage(schoolLogo, 'PNG', pageWidth - margin - 4 - schoolLogoSize, y + 4, schoolLogoSize, schoolLogoSize);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Official Payslip', titleStartX, y + 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Babyeyi School System', titleStartX, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(191, 219, 254);
  doc.text(school?.schoolName || 'Registered School', pageWidth - margin - 28, y + 17, { align: 'right' });
  doc.setTextColor(245, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${record?.month || '-'} ${record?.year || ''} ${record?.term || ''}`, titleStartX, y + 23);
  y += 36;

  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Staff Details', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name: ${staff?.fullName || '-'}`, margin + 3, y + 12);
  doc.text(`Staff Code: ${staff?.staffCode || '-'}`, margin + 3, y + 17);
  doc.text(`Department: ${staff?.department || '-'}`, margin + 3, y + 22);
  doc.text(`Role: ${staff?.role || '-'}`, margin + 3, y + 27);
  doc.text(`Status: ${record?.status || '-'}`, pageWidth / 2 + 15, y + 12);
  doc.text(`Paid Date: ${record?.paidDate ? String(record.paidDate).slice(0, 10) : '-'}`, pageWidth / 2 + 15, y + 17);
  doc.text(`Payroll ID: ${record?.payrollId || `PAY-${record?.id || ''}`}`, pageWidth / 2 + 15, y + 22);
  y += 36;

  const drawRow = (label, value, options = {}) => {
    const h = options.highlight ? 8 : 7;
    if (options.highlight) {
      doc.setFillColor(...options.fill);
      doc.rect(margin, y, pageWidth - margin * 2, h, 'F');
    }
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.big ? 11 : 10);
    doc.setTextColor(...(options.color || [30, 41, 59]));
    doc.text(label, margin + 3, y + 5);
    doc.text(value, pageWidth - margin - 3, y + 5, { align: 'right' });
    y += h;
  };

  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 2, 2, 'S');
  drawRow('Earnings', '', { bold: true, color: [0, 4, 53] });
  drawRow('Basic Salary', `${fmtN(basic)} RWF`);
  drawRow('Allowances', `+ ${fmtN(allowances)} RWF`, { color: [4, 120, 87] });
  drawRow('Gross Pay', `${fmtN(gross)} RWF`, { bold: true, highlight: true, fill: [236, 253, 245], color: [4, 120, 87] });
  y += 3;

  doc.roundedRect(margin, y, pageWidth - margin * 2, 58, 2, 2, 'S');
  drawRow('Deductions', '', { bold: true, color: [127, 29, 29] });
  drawRow('RSSB / Pension', `- ${fmtN(rssb)} RWF`, { color: [185, 28, 28] });
  drawRow('Income Tax / Deductions', `- ${fmtN(deductions)} RWF`, { color: [185, 28, 28] });
  drawRow('Advance Deduction', `- ${fmtN(advance)} RWF`, { color: [194, 65, 12] });
  drawRow('Total Deductions', `- ${fmtN(totalDeductions)} RWF`, { bold: true, highlight: true, fill: [254, 242, 242], color: [153, 27, 27] });
  y += 4;

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('NET SALARY', margin + 4, y + 8);
  doc.text(`${fmtN(net)} RWF`, pageWidth - margin - 4, y + 8, { align: 'right' });
  doc.setTextColor(245, 191, 36);
  doc.text('AMOUNT PAID', margin + 4, y + 16);
  doc.text(`${fmtN(paid)} RWF`, pageWidth - margin - 4, y + 16, { align: 'right' });
  y += 26;

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Submitted by: ${record?.submittedBy || '-'}`, margin, y);
  doc.text(`Approved by: ${record?.approvedBy || '-'}`, margin, y + 5);
  const authW = 62;
  const authH = 42;
  const authX = pageWidth - margin - authW;
  const authY = y + 2;
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORIZED', authX + authW / 2, authY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('School Stamp & Signature', authX + authW / 2, authY + 9, { align: 'center' });

  const stampX = authX + 4;
  const stampY = authY + 11;
  if (schoolStamp) {
    const canUseOpacity = typeof doc.setGState === 'function' && typeof doc.GState === 'function';
    if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 0.32 }));
    doc.addImage(schoolStamp, 'PNG', stampX, stampY, 24, 24);
    if (canUseOpacity) doc.setGState(new doc.GState({ opacity: 1 }));
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.circle(stampX + 12, stampY + 12, 10, 'S');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('STAMP', stampX + 12, stampY + 13, { align: 'center' });
  }

  const sigX = authX + 30;
  const sigY = authY + 20;
  if (schoolSignature) {
    doc.addImage(schoolSignature, 'PNG', sigX, sigY, authW - 34, 8);
  }
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature', sigX + (authW - 34) / 2, sigY + 12.5, { align: 'center' });

  doc.text('Computer-generated official payslip. No signature required.', pageWidth / 2, 286, { align: 'center' });

  const fileCode = staff?.staffCode || 'STAFF';
  doc.save(`official-payslip-${fileCode}-${record?.month || 'month'}-${record?.year || 'year'}.pdf`);
};

export default function StaffPayroll() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/teacher-portal/staff/payroll/my');
        if (!active) return;
        setData(res.data?.data || null);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || e?.message || 'Failed to load payroll');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const history = data?.history || [];
  const paidTotal = useMemo(() => history.filter((h) => h.status === 'Paid').reduce((s, h) => s + Number(h.paid || 0), 0), [history]);
  const staff = data?.staff || {};
  const school = data?.school || {};
  const selectedIsPaid = String(selectedPayroll?.status || '').toLowerCase() === 'paid';

  const handlePrintPayslip = () => {
    if (!selectedPayroll) return;
    const html = buildPayslipHtml(selectedPayroll, staff);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handleDownloadPayslip = () => {
    if (!selectedPayroll) return;
    generatePayslipPdf(selectedPayroll, staff, school);
  };

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><Loader2 className="animate-spin text-[#000435]" /></div>;
  if (error) return <div className="p-6"><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div></div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 space-y-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="rounded-2xl bg-[#000435] text-white p-5">
        <p className="text-[10px] uppercase tracking-widest text-amber-400 font-black">My Payroll</p>
        <h1 className="text-xl font-black mt-1">{data?.staff?.fullName || 'Staff'}</h1>
        <p className="text-xs text-slate-300">{data?.staff?.staffCode} | {data?.staff?.role} | {data?.staff?.department}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase text-slate-400 font-black">Current Net</p><p className="text-lg font-black text-[#000435]">{fmt(data?.currentSalary?.net)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase text-slate-400 font-black">Basic</p><p className="text-lg font-black text-[#000435]">{fmt(data?.currentSalary?.basic)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase text-slate-400 font-black">Allowances</p><p className="text-lg font-black text-emerald-700">{fmt(data?.currentSalary?.allowances)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] uppercase text-slate-400 font-black">Paid Total</p><p className="text-lg font-black text-blue-700">{fmt(paidTotal)}</p></div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-black text-[#000435]">Payroll History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Net</th>
                <th className="px-4 py-3 text-left">Paid</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payroll records yet.</td></tr> : history.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3"><p className="font-bold text-[#000435]">{row.month} {row.year}</p><p className="text-[10px] text-slate-400">{row.term}</p></td>
                  <td className="px-4 py-3 font-semibold">{fmt(row.net)}</td>
                  <td className="px-4 py-3 font-black text-blue-700">{fmt(row.paid)}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedPayroll(row)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-black text-[#000435] hover:bg-slate-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPayroll ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Payroll Details</p>
                <h3 className="text-lg font-black text-[#000435] mt-1">
                  {selectedPayroll.month} {selectedPayroll.year} {selectedPayroll.term ? `· ${selectedPayroll.term}` : ''}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPayslip}
                  disabled={!selectedIsPaid}
                  className={`h-8 px-3 rounded-lg text-xs font-black inline-flex items-center gap-1.5 ${selectedIsPaid ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'border border-slate-100 text-slate-300 cursor-not-allowed'}`}
                  title={selectedIsPaid ? 'Download payslip' : 'Payslip available only for paid payroll'}
                >
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={handlePrintPayslip}
                  disabled={!selectedIsPaid}
                  className={`h-8 px-3 rounded-lg text-xs font-black inline-flex items-center gap-1.5 ${selectedIsPaid ? 'bg-[#000435] text-white hover:bg-[#00065a]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  title={selectedIsPaid ? 'Print payslip' : 'Payslip available only for paid payroll'}
                >
                  <PrinterIcon size={12} /> Print
                </button>
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Basic Salary</div>
                  <div className="p-3 text-right font-black text-[#000435]">{fmt(selectedPayroll.basic)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Allowances</div>
                  <div className="p-3 text-right font-black text-[#000435]">+ {fmt(selectedPayroll.allowances)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Deductions</div>
                  <div className="p-3 text-right font-black text-[#000435]">- {fmt(selectedPayroll.deductions ?? selectedPayroll.tax)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Net Salary</div>
                  <div className="p-3 text-right font-black text-[#000435]">{fmt(selectedPayroll.net)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Advance Deduction</div>
                  <div className="p-3 text-right font-black text-[#000435]">- {fmt(selectedPayroll.advance)}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-slate-100">
                  <div className="p-3 text-slate-600">Final Payable</div>
                  <div className="p-3 text-right font-black text-[#000435]">{fmt(selectedPayroll.finalPayable)}</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="p-3 text-slate-600">Amount Requested</div>
                  <div className="p-3 text-right font-black text-[#000435]">{fmt(selectedPayroll.amountRequested)}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p><span className="font-black text-slate-500">Payroll ID:</span> {selectedPayroll.payrollId || `PAY-${selectedPayroll.id}`}</p>
                <p><span className="font-black text-slate-500">Status:</span> {selectedPayroll.status}</p>
                <p><span className="font-black text-slate-500">Paid Amount:</span> {fmt(selectedPayroll.paid)}</p>
                <p><span className="font-black text-slate-500">Paid Date:</span> {selectedPayroll.paidDate ? String(selectedPayroll.paidDate).slice(0, 10) : '-'}</p>
                <p><span className="font-black text-slate-500">Submitted By:</span> {selectedPayroll.submittedBy || '-'}</p>
                <p><span className="font-black text-slate-500">Approved By:</span> {selectedPayroll.approvedBy || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
