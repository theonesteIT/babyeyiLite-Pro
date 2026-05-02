import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, PrinterIcon, X, TrendingUp, Wallet, CreditCard, PiggyBank, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { jsPDF } from 'jspdf';

const fmt = (v) => `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0)} RWF`;
const fmtN = (v) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const statusConfig = {
  paid: { label: 'Paid', icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  pending: { label: 'Pending', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  default: { label: 'Processing', icon: AlertCircle, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const getStatus = (s) => statusConfig[String(s || '').toLowerCase()] || statusConfig.default;

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
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; max-width: 680px; margin: 32px auto; color: #0f172a; background: #f8fafc; padding: 0 16px; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: #000435; padding: 28px 28px 24px; }
    .header h1 { color: white; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    .header .sub { color: rgba(255,255,255,0.55); font-size: 12px; margin-top: 4px; }
    .period-badge { display: inline-block; background: #f5bf24; color: #000435; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; margin-top: 12px; letter-spacing: 0.5px; }
    .body { padding: 24px 28px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 24px; }
    .info-row { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
    .info-value { font-size: 13px; color: #0f172a; font-weight: 600; margin-top: 2px; }
    .divider { border: none; border-top: 1px dashed #e2e8f0; margin: 20px 0; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 12px; }
    .green { color: #059669; }
    .red { color: #dc2626; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; }
    .row:nth-child(odd) { background: #f8fafc; }
    .row.total { background: #000435; color: white; font-size: 14px; font-weight: 800; border-radius: 10px; margin-top: 8px; padding: 12px 16px; }
    .row.paid { background: #f5bf24; color: #000435; font-size: 13px; font-weight: 800; border-radius: 10px; margin-top: 6px; padding: 10px 16px; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; padding: 20px 28px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Official Payslip</h1>
      <div class="sub">Babyeyi School System · Teacher Portal</div>
      <div class="period-badge">${esc(record?.month || '-')} ${esc(record?.year || '')} ${esc(record?.term || '')}</div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${esc(staff?.fullName || '-')}</span></div>
        <div class="info-row"><span class="info-label">Staff ID</span><span class="info-value">${esc(staff?.staffCode || '-')}</span></div>
        <div class="info-row"><span class="info-label">Department</span><span class="info-value">${esc(staff?.department || '-')}</span></div>
        <div class="info-row"><span class="info-label">Job Role</span><span class="info-value">${esc(staff?.role || '-')}</span></div>
        <div class="info-row"><span class="info-label">Payment Status</span><span class="info-value">${esc(record?.status || '-')}</span></div>
      </div>
      <hr class="divider" />
      <div class="section-title green">What You Earned</div>
      <div class="row"><span>Base Salary</span><span>${fmtN(basic)} RWF</span></div>
      <div class="row"><span>Allowances</span><span class="green">+ ${fmtN(allowances)} RWF</span></div>
      <div class="row" style="font-weight:700;"><span>Gross Pay</span><span>${fmtN(basic + allowances)} RWF</span></div>
      <hr class="divider" />
      <div class="section-title red">Deductions</div>
      <div class="row"><span>RSSB / Pension</span><span class="red">- ${fmtN(rssb)} RWF</span></div>
      <div class="row"><span>Income Tax</span><span class="red">- ${fmtN(deductions)} RWF</span></div>
      <div class="row"><span>Salary Advance</span><span class="red">- ${fmtN(advance)} RWF</span></div>
      <div class="row" style="font-weight:700;"><span>Total Deductions</span><span class="red">- ${fmtN(rssb + deductions + advance)} RWF</span></div>
      <div class="row total"><span>Your Net Salary</span><span>${fmtN(net)} RWF</span></div>
      <div class="row paid"><span>Amount Deposited</span><span>${fmtN(paid)} RWF</span></div>
    </div>
    <div class="footer">Computer-generated payslip · No signature required · Babyeyi School System</div>
  </div>
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
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, 256, 256);
      ctx.drawImage(image, 0, 0, 256, 256);
      return canvas.toDataURL('image/png');
    };
    try { return await loadImageFromSrc('/1BABYEYI LOGO FINAL.png'); }
    catch {
      const svgText = await fetch('/favicon.svg').then((r) => r.text());
      const encoded = window.btoa(unescape(encodeURIComponent(svgText)));
      return await loadImageFromSrc(`data:image/svg+xml;base64,${encoded}`);
    }
  } catch { return null; }
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
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(image, 0, 0, 256, 256);
    return canvas.toDataURL('image/png');
  } catch { return null; }
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

  doc.setFillColor(0, 4, 53);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 28, 2, 2, 'F');
 
  if (schoolLogo) doc.addImage(schoolLogo, 'PNG', pageWidth - margin - 24, y + 4, 20, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Official Payslip', margin + 42, y + 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Babyeyi School System', margin + 42, y + 17);
  doc.setTextColor(245, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.text(`${record?.month || '-'} ${record?.year || ''} ${record?.term || ''}`, margin + 42, y + 23);
  y += 36;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 2, 2, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Employee Details', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Name: ${staff?.fullName || '-'}`, margin + 3, y + 12);
  doc.text(`Staff ID: ${staff?.staffCode || '-'}`, margin + 3, y + 17);
  doc.text(`Department: ${staff?.department || '-'}`, margin + 3, y + 22);
  doc.text(`Role: ${staff?.role || '-'}`, margin + 3, y + 27);
  doc.text(`Status: ${record?.status || '-'}`, pageWidth / 2 + 15, y + 12);
  doc.text(`Paid On: ${record?.paidDate ? String(record.paidDate).slice(0, 10) : '-'}`, pageWidth / 2 + 15, y + 17);
  doc.text(`Reference: ${record?.payrollId || `PAY-${record?.id || ''}`}`, pageWidth / 2 + 15, y + 22);
  y += 36;

  const drawRow = (label, value, options = {}) => {
    const h = options.highlight ? 8 : 7;
    if (options.highlight) { doc.setFillColor(...options.fill); doc.rect(margin, y, pageWidth - margin * 2, h, 'F'); }
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.big ? 11 : 10);
    doc.setTextColor(...(options.color || [30, 41, 59]));
    doc.text(label, margin + 3, y + 5);
    doc.text(value, pageWidth - margin - 3, y + 5, { align: 'right' });
    y += h;
  };

  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 50, 2, 2, 'S');
  drawRow('What You Earned', '', { bold: true, color: [4, 120, 87] });
  drawRow('Base Salary', `${fmtN(basic)} RWF`);
  drawRow('Allowances', `+ ${fmtN(allowances)} RWF`, { color: [4, 120, 87] });
  drawRow('Gross Pay', `${fmtN(gross)} RWF`, { bold: true, highlight: true, fill: [236, 253, 245], color: [4, 120, 87] });
  y += 3;

  doc.roundedRect(margin, y, pageWidth - margin * 2, 58, 2, 2, 'S');
  drawRow('Deductions', '', { bold: true, color: [127, 29, 29] });
  drawRow('RSSB / Pension', `- ${fmtN(rssb)} RWF`, { color: [185, 28, 28] });
  drawRow('Income Tax', `- ${fmtN(deductions)} RWF`, { color: [185, 28, 28] });
  drawRow('Salary Advance', `- ${fmtN(advance)} RWF`, { color: [194, 65, 12] });
  drawRow('Total Deductions', `- ${fmtN(totalDeductions)} RWF`, { bold: true, highlight: true, fill: [254, 242, 242], color: [153, 27, 27] });
  y += 4;

  doc.setFillColor(0, 4, 53);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Your Net Salary', margin + 4, y + 8);
  doc.text(`${fmtN(net)} RWF`, pageWidth - margin - 4, y + 8, { align: 'right' });
  doc.setTextColor(245, 191, 36);
  doc.text('Amount Deposited', margin + 4, y + 16);
  doc.text(`${fmtN(paid)} RWF`, pageWidth - margin - 4, y + 16, { align: 'right' });
  y += 26;

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Submitted by: ${record?.submittedBy || '-'}`, margin, y);
  doc.text(`Approved by: ${record?.approvedBy || '-'}`, margin, y + 5);
  doc.text('Computer-generated official payslip. No signature required.', pageWidth / 2, 286, { align: 'center' });

  const fileCode = staff?.staffCode || 'STAFF';
  doc.save(`payslip-${fileCode}-${record?.month || 'month'}-${record?.year || 'year'}.pdf`);
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="relative bg-white rounded-2xl border border-slate-100 p-4 overflow-hidden group hover:shadow-md transition-all duration-200">
    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2 opacity-5 ${accent}`} />
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${accent} bg-opacity-10`}>
      <Icon size={16} className={accent.replace('bg-', 'text-')} />
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-lg font-black text-[#000435] leading-none">{value}</p>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = getStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Line Item ────────────────────────────────────────────────────────────────
const LineItem = ({ label, value, valueClass = 'text-[#000435]', bold, separator }) => (
  <>
    {separator && <div className="border-t border-dashed border-slate-100 my-1" />}
    <div className={`flex items-center justify-between py-2.5 px-1 ${bold ? 'font-black' : ''}`}>
      <span className={`text-sm ${bold ? 'text-[#000435]' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm font-black ${valueClass}`}>{value}</span>
    </div>
  </>
);

// ─── Main Component ───────────────────────────────────────────────────────────
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
        if (active) setError(e?.response?.data?.message || e?.message || 'Unable to load your payroll details');
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
    w.document.open(); w.document.write(html); w.document.close();
    w.focus(); w.print();
  };

  const handleDownloadPayslip = () => {
    if (!selectedPayroll) return;
    generatePayslipPdf(selectedPayroll, staff, school);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#000435] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-amber-400" />
      </div>
      <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading your payroll…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
        <p className="font-black text-red-700 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs font-black text-red-500 underline">Try again</button>
      </div>
    </div>
  );

  const initials = (staff?.fullName || 'S')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', sans-serif" }}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-[#000435] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #f5bf24 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-amber-400 opacity-5 translate-x-1/3 translate-y-1/3" />
        <div className="relative px-4 sm:px-6 pt-8 pb-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-[#000435] text-lg font-black flex-shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-0.5">My Payroll</p>
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">{staff?.fullName || 'Staff Member'}</h1>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {staff?.staffCode && <span className="text-amber-400/70">{staff.staffCode}</span>}
                {staff?.staffCode && staff?.role && <span className="mx-1.5 text-slate-600">·</span>}
                {staff?.role && <span>{staff.role}</span>}
                {staff?.department && <><span className="mx-1.5 text-slate-600">·</span><span>{staff.department}</span></>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-5">

        {/* ── Stats Grid ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={Wallet} label="Net Salary" value={fmt(data?.currentSalary?.net)} accent="bg-[#000435]" />
          
          <StatCard icon={TrendingUp} label="Allowances" value={fmt(data?.currentSalary?.allowances)} accent="bg-emerald-500" />
          <StatCard icon={PiggyBank} label="Total Received" value={fmt(paidTotal)} accent="bg-amber-500" />
        </div>

        {/* ── Payroll History ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="font-black text-[#000435] text-base">Payment History</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">All your past salary disbursements</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
              {history.length} record{history.length !== 1 ? 's' : ''}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                <Wallet size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-black text-slate-300">No payments recorded yet</p>
              <p className="text-xs text-slate-300 mt-1">Your payroll history will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Pay Period</th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Net Salary</th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Amount Paid</th>
                      <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-black text-[#000435] text-sm">{row.month} {row.year}</p>
                          {row.term && <p className="text-[10px] text-slate-400 mt-0.5">{row.term}</p>}
                        </td>
                        <td className="px-5 py-3.5 font-black text-slate-700">{fmt(row.net)}</td>
                        <td className="px-5 py-3.5 font-black text-[#000435]">{fmt(row.paid)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedPayroll(row)}
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-[#000435] text-white text-[11px] font-black hover:bg-[#000c6e] transition-colors"
                          >
                            View Details <ChevronRight size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-50">
                {history.map((row) => (
                  <div key={row.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-[#000435] text-sm">{row.month} {row.year}</p>
                        <StatusBadge status={row.status} />
                      </div>
                      <p className="text-xs text-slate-400">{row.term || 'Salary'}</p>
                      <p className="text-base font-black text-[#000435] mt-1">{fmt(row.net)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPayroll(row)}
                      className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#000435] text-white flex items-center justify-center hover:bg-[#000c6e] transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Payroll Detail Modal ─────────────────────────────────────────────── */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#000435]/60 backdrop-blur-sm" onClick={() => setSelectedPayroll(null)} />

          {/* Sheet */}
          <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

            {/* Modal Header */}
            <div className="bg-[#000435] px-5 py-4 flex items-start justify-between flex-shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Payslip Details</p>
                <h3 className="text-lg font-black text-white leading-tight">
                  {selectedPayroll.month} {selectedPayroll.year}
                  {selectedPayroll.term && <span className="text-amber-400/70 text-sm font-bold ml-2">· {selectedPayroll.term}</span>}
                </h3>
                <StatusBadge status={selectedPayroll.status} />
              </div>
              <button
                onClick={() => setSelectedPayroll(null)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors flex-shrink-0 ml-3 mt-0.5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <div className="p-5 space-y-4">

                {/* Earnings Section */}
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">What You Earned</p>
                  </div>
                  <div className="px-4 divide-y divide-slate-50">
                    <LineItem label="Base Salary" value={fmt(selectedPayroll.basic)} />
                    <LineItem label="Allowances" value={`+ ${fmt(selectedPayroll.allowances)}`} valueClass="text-emerald-600" />
                    <LineItem label="Gross Pay" value={fmt((Number(selectedPayroll.basic) || 0) + (Number(selectedPayroll.allowances) || 0))} bold valueClass="text-emerald-700" />
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Deductions</p>
                  </div>
                  <div className="px-4 divide-y divide-slate-50">
                    <LineItem label="RSSB / Pension" value={`- ${fmt(selectedPayroll.rssb)}`} valueClass="text-red-500" />
                    <LineItem label="Income Tax" value={`- ${fmt(selectedPayroll.deductions ?? selectedPayroll.tax)}`} valueClass="text-red-500" />
                    <LineItem label="Salary Advance" value={`- ${fmt(selectedPayroll.advance)}`} valueClass="text-orange-500" />
                    <LineItem label="Total Deductions" value={`- ${fmt((Number(selectedPayroll.rssb) || 0) + (Number(selectedPayroll.deductions ?? selectedPayroll.tax) || 0) + (Number(selectedPayroll.advance) || 0))}`} bold valueClass="text-red-700" />
                  </div>
                </div>

                {/* Net Summary */}
                <div className="rounded-2xl bg-[#000435] overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
                    <span className="text-sm font-black text-white">Your Net Salary</span>
                    <span className="text-base font-black text-white">{fmt(selectedPayroll.net)}</span>
                  </div>
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <span className="text-sm font-black text-amber-400">Amount Deposited</span>
                    <span className="text-base font-black text-amber-400">{fmt(selectedPayroll.paid)}</span>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="rounded-2xl border border-slate-100 p-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Reference No.', value: selectedPayroll.payrollId || `PAY-${selectedPayroll.id}` },
                    { label: 'Final Payable', value: fmt(selectedPayroll.finalPayable) },
                    { label: 'Paid On', value: selectedPayroll.paidDate ? String(selectedPayroll.paidDate).slice(0, 10) : '—' },
                    { label: 'Amount Requested', value: fmt(selectedPayroll.amountRequested) },
                    { label: 'Submitted By', value: selectedPayroll.submittedBy || '—' },
                    { label: 'Approved By', value: selectedPayroll.approvedBy || '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="text-xs font-black text-[#000435] mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {!selectedIsPaid && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
                    <Clock size={16} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-black">Your payslip will be available once payment is confirmed.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex gap-3 p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button
                onClick={handleDownloadPayslip}
                disabled={!selectedIsPaid}
                className={`flex-1 h-11 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all ${
                  selectedIsPaid
                    ? 'border-2 border-[#000435] text-[#000435] hover:bg-[#000435] hover:text-white'
                    : 'border border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                }`}
              >
                <Download size={13} /> Download PDF
              </button>
              <button
                onClick={handlePrintPayslip}
                disabled={!selectedIsPaid}
                className={`flex-1 h-11 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all ${
                  selectedIsPaid
                    ? 'bg-[#000435] text-white hover:bg-[#000c6e]'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                <PrinterIcon size={13} /> Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}