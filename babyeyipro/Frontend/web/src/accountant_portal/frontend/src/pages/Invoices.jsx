import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import api from '../services/api.js';
import PortalToast from '../components/PortalToast.jsx';
import AccountantOchreHero from '../components/AccountantOchreHero';
import { downloadInvoicesReportPdf } from '../utils/exportInvoicesReportPdf.js';
import {
  FileText,
  Plus,
  Printer,
  Send,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Loader2,
  X,
  Settings2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  User,
  Calendar,
  Banknote,
  Phone,
} from 'lucide-react';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

function formatCompactMoneyRWF(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

const STORAGE = {
  config: 'acct:invoices:config',
};

const INVOICES_API = 'public/babyeyi-pay/invoices';
const INVOICES_PAGE_SIZE = 12;
const INVOICES_FETCH_LIMIT = 400;

function parsePayloadJson(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

/** Map babyeyi_payment_intents row to UI draft/sent/overdue/paid (aligned with Babyeyi Lite invoice_status + dates). */
function deriveDisplayStatus(row) {
  const inv = String(row.invoice_status || 'NOT_PAID').toUpperCase();
  const st = String(row.status || '').toLowerCase();
  if (inv === 'PAID' || st === 'paid') return 'paid';
  const due = row.invoice_due_at ? new Date(row.invoice_due_at) : null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dueDay = due && !Number.isNaN(due.getTime())
    ? new Date(due.getFullYear(), due.getMonth(), due.getDate())
    : null;
  const overdue = inv === 'NOT_PAID' && dueDay && dueDay < startOfToday;
  if (overdue) return 'overdue';
  if (st === 'draft' && !row.invoice_sent_at) return 'draft';
  return 'sent';
}

function toYmd(d) {
  if (!d) return '';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

function mapApiRowToInvoice(row) {
  const payload = parsePayloadJson(row.payload_json);
  const ap = payload.accountant_portal_invoice || {};
  const items = Array.isArray(ap.items) && ap.items.length
    ? ap.items.map((it, idx) => ({
      id: String(it.id || `l${idx}`),
      name: it.name || 'ΓÇö',
      qty: Number(it.qty) || 0,
      unitPrice: Number(it.unitPrice ?? it.unit_price) || 0,
    }))
    : [{ id: 'fee', name: 'Fees & charges', qty: 1, unitPrice: Number(row.total_rwf) || 0 }];
  const taxRate = Number(ap.taxRate ?? ap.tax_rate ?? 0) || 0;
  const notes = ap.notes || '';
  const classFromPayload = ap.bill_to_class || '';
  const displayStatus = deriveDisplayStatus(row);
  const clsLabel = row.class_name || classFromPayload;
  const metaLines = [
    row.student_uid ? `UID: ${row.student_uid}` : null,
    clsLabel ? `Class: ${clsLabel}` : null,
  ].filter(Boolean);

  return {
    id: String(row.id),
    intentId: Number(row.id),
    invoiceNo: row.invoice_no || `INV-${row.id}`,
    issueDate: toYmd(row.created_at),
    dueDate: toYmd(row.invoice_due_at) || toYmd(row.created_at),
    status: displayStatus,
    billTo: {
      name: row.student_name || row.payer_name || 'ΓÇö',
      metaLines: metaLines.length ? metaLines : [row.payer_phone || row.payer_email || ''].filter(Boolean),
    },
    items,
    taxRate,
    notes: notes || row.payer_email || '',
    sentAt: row.invoice_sent_at || null,
    paidAt: row.invoice_paid_at || null,
  };
}

function getModalRoot() {
  if (typeof document === 'undefined') return null;
  return document.body;
}

const INVOICE_ACTION_MENU_W = 224;
const INVOICE_ACTION_MENU_H = 220;

function computeInvoiceActionMenuPosition(anchorRect) {
  let left = anchorRect.right - INVOICE_ACTION_MENU_W;
  let top = anchorRect.bottom + 6;
  if (left < 8) left = 8;
  if (left + INVOICE_ACTION_MENU_W > window.innerWidth - 8) {
    left = window.innerWidth - INVOICE_ACTION_MENU_W - 8;
  }
  if (top + INVOICE_ACTION_MENU_H > window.innerHeight - 8) {
    top = Math.max(8, anchorRect.top - INVOICE_ACTION_MENU_H - 6);
  }
  return { top, left };
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function computeTotals(items = [], taxRate = 0) {
  const subTotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const tax = Math.round(subTotal * (Number(taxRate) || 0));
  const total = subTotal + tax;
  return { subTotal, tax, total };
}

function statusChip(status) {
  if (status === 'paid') return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  if (status === 'sent') return { label: 'Sent', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  if (status === 'overdue') return { label: 'Overdue', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' };
  return { label: 'Draft', cls: 'bg-white text-[#000435] border-[#000435]', dot: 'bg-[#000435]' };
}

function openPrintWindow(doc) {
  doc.autoPrint();
  const blob = doc.output('blob');
  window.open(URL.createObjectURL(blob), '_blank');
}

function exportInvoicePdf({ invoice, config }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 44;
  const NAVY = [30, 58, 95];
  const YELLOW = [254, 191, 16];

  const labelValue = (label, value, y) => {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, y);
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([1, 2], 0);
    const labelW = doc.getTextWidth(label);
    const valW = doc.getTextWidth(String(value));
    doc.line(margin + labelW + 8, y - 2, W - margin - valW - 4, y - 2);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), W - margin, y, { align: 'right' });
  };

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 84, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(config.schoolName || 'School', margin, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(config.contactLine || 'Finance Office', margin, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', W - margin, 44, { align: 'right' });

  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(4);
  doc.line(margin, 96, W - margin, 96);

  let y = 126;
  labelValue('Invoice No.', invoice.invoiceNo, y); y += 16;
  labelValue('Issue date', invoice.issueDate, y); y += 16;
  labelValue('Due date', invoice.dueDate, y); y += 16;
  labelValue('Status', statusChip(invoice.status).label, y); y += 22;

  // Bill to
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.text('Bill To', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(invoice.billTo?.name || 'ΓÇö', margin, y); y += 14;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9.5);
  const lines = (invoice.billTo?.metaLines || []).filter(Boolean);
  lines.slice(0, 3).forEach((ln) => { doc.text(String(ln), margin, y); y += 12; });
  y += 10;

  // Items table
  const tableX = margin;
  const tableW = W - margin * 2;
  const cols = {
    item: tableX,
    qty: tableX + tableW * 0.58,
    unit: tableX + tableW * 0.70,
    amt: tableX + tableW,
  };

  doc.setFillColor(...YELLOW);
  doc.rect(tableX, y - 12, tableW, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.text('ITEM', cols.item + 8, y + 2);
  doc.text('QTY', cols.qty + 8, y + 2);
  doc.text('UNIT', cols.unit + 8, y + 2);
  doc.text('AMOUNT', cols.amt - 8, y + 2, { align: 'right' });
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  items.forEach((it, idx) => {
    if (y > H - 190) {
      doc.addPage();
      y = 64;
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y - 12, tableW, 20, 'F');
    }

    const name = String(it.name || 'ΓÇö');
    const qty = String(it.qty ?? 'ΓÇö');
    const unit = formatMoneyRWF(Number(it.unitPrice) || 0).replace('RWF', '').trim();
    const amount = formatMoneyRWF((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)).replace('RWF', '').trim();

    doc.text(name, cols.item + 8, y + 2, { maxWidth: (cols.qty - cols.item) - 12 });
    doc.text(qty, cols.qty + 8, y + 2);
    doc.text(unit, cols.unit + 8, y + 2);
    doc.text(amount, cols.amt - 8, y + 2, { align: 'right' });
    y += 20;
  });

  y += 10;
  const totals = computeTotals(items, invoice.taxRate);

  // Totals box
  const boxW = 240;
  const boxX = W - margin - boxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(boxX, y - 6, boxW, 92, 12, 12, 'FD');

  let ty = y + 16;
  const tLine = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10.5 : 9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, boxX + 14, ty);
    doc.setTextColor(15, 23, 42);
    doc.text(value, boxX + boxW - 14, ty, { align: 'right' });
    ty += 18;
  };

  tLine('Subtotal', formatMoneyRWF(totals.subTotal));
  tLine(`Tax (${Math.round((Number(invoice.taxRate) || 0) * 100)}%)`, formatMoneyRWF(totals.tax));
  doc.setDrawColor(226, 232, 240);
  doc.line(boxX + 14, ty - 8, boxX + boxW - 14, ty - 8);
  tLine('Total', formatMoneyRWF(totals.total), true);

  y = Math.max(y + 110, H - 170);

  // Payment instructions + notes
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(10.5);
  doc.text('Payment Instructions', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(`Bank account: ${config.bankAccount || 'ΓÇö'}`, margin, y); y += 12;
  doc.text(`Mobile money: ${config.momoNumber || 'ΓÇö'}`, margin, y); y += 14;

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  const terms = invoice.notes || config.defaultTerms || '';
  doc.text('Terms', margin, y);
  y += 12;
  doc.text(String(terms), margin, y, { maxWidth: W - margin * 2 });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(config.footerNote || '', margin, H - 40);

  openPrintWindow(doc);
}


function NewInvoiceModal({ open, onClose, onCreate, config }) {
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [cls, setCls] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [items, setItems] = useState([
    { id: 'i1', name: 'Tuition fee (Term)', qty: 1, unitPrice: 450000 },
    { id: 'i2', name: 'Transport', qty: 1, unitPrice: 50000 },
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState(config?.defaultTerms || 'Payment due within 7 days. Late fees may apply.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!open) return null;
  const root = getModalRoot();
  if (!root) return null;

  const totals = computeTotals(items, taxRate);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[#0A192F]/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-[0_32px_128px_-15px_rgba(30,58,95,0.35)] border border-black/10 flex flex-col overflow-hidden">
        <div
          className="relative z-10 px-5 py-3 shrink-0"
          style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-re-gold shadow-md shadow-re-gold/10">
                <Plus size={16} />
              </div>
              <div>
                <h1 className="text-[11px] font-medium text-white uppercase tracking-widest leading-none">New Invoice</h1>
                <p className="text-[7px] font-medium text-white/40 uppercase tracking-tight mt-1">Create a realistic invoice</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-re-gold group">
              <X size={14} className="group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-5 bg-re-bg/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80 flex items-center gap-1.5">
                <User size={12} className="text-amber-500/80" /> Student name
              </p>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80">Student UID</p>
              <input value={uid} onChange={(e) => setUid(e.target.value)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80">Class</p>
              <input value={cls} onChange={(e) => setCls(e.target.value)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80 flex items-center gap-1.5">
                <Calendar size={12} className="text-amber-500/80" /> Due date
              </p>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner" />
            </div>
            <div>
              <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80">Tax rate</p>
              <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner">
                <option value={0}>0%</option>
                <option value={0.05}>5%</option>
                <option value={0.1}>10%</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Line items</p>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { id: `i${prev.length + 1}`, name: '', qty: 1, unitPrice: 0 }])}
                className="h-8 px-3 rounded-xl flex items-center justify-center gap-2 bg-re-bg border border-black/5 text-[#000435] font-medium text-[9px] uppercase tracking-widest hover:bg-white transition-all"
              >
                <Plus size={14} className="text-amber-500" /> Add item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-re-bg/20 border-b border-black/5">
                    <th className="px-4 py-2 text-[7px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Item</th>
                    <th className="px-4 py-2 text-[7px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 w-24">Qty</th>
                    <th className="px-4 py-2 text-[7px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 w-36">Unit</th>
                    <th className="px-4 py-2 text-right text-[7px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 w-36">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-re-bg/30 transition-colors">
                      <td className="px-4 py-2 border-r border-black/5">
                        <input
                          value={it.name}
                          onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, name: e.target.value } : p)))}
                          className="w-full h-8 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner"
                        />
                      </td>
                      <td className="px-4 py-2 border-r border-black/5">
                        <input
                          type="number"
                          min="0"
                          value={it.qty}
                          onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, qty: Number(e.target.value) } : p)))}
                          className="w-full h-8 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner"
                        />
                      </td>
                      <td className="px-4 py-2 border-r border-black/5">
                        <input
                          type="number"
                          min="0"
                          value={it.unitPrice}
                          onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, unitPrice: Number(e.target.value) } : p)))}
                          className="w-full h-8 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <p className="text-[10px] font-medium text-[#000435]">
                          {formatMoneyRWF((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)).replace('RWF', '').trim()}
                          <span className="ml-1 text-[8px] font-medium text-[#000435]/60 uppercase tracking-widest">RWF</span>
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-black/5 flex items-center justify-end gap-6">
              <div className="text-right">
                <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-[0.22em] opacity-40">Subtotal</p>
                <p className="text-[12px] font-medium text-[#000435]">{formatCompactMoneyRWF(totals.subTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-[0.22em] opacity-40">Tax</p>
                <p className="text-[12px] font-medium text-[#000435]">{formatCompactMoneyRWF(totals.tax)}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-[0.22em] opacity-40">Total</p>
                <p className="text-[14px] font-medium text-emerald-600">{formatCompactMoneyRWF(totals.total)}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-medium text-[#000435] uppercase tracking-[0.2em] mb-1.5 opacity-80">Terms / Notes</p>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full h-9 rounded-lg bg-white px-3 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium tracking-tight shadow-inner" />
          </div>
          {!!errorMsg && (
            <p className="text-[10px] font-medium text-red-600">{errorMsg}</p>
          )}
        </div>

        <div className="bg-white border-t border-black/5 px-5 sm:px-6 py-2 flex items-center justify-end gap-2 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-black/5 text-re-navy font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              const trimmedName = String(name || '').trim();
              const cleanItems = (items || [])
                .map((it) => ({
                  ...it,
                  name: String(it.name || '').trim(),
                  qty: Number(it.qty) || 0,
                  unitPrice: Number(it.unitPrice) || 0,
                }))
                .filter((it) => it.name && it.qty > 0 && it.unitPrice >= 0);
              const validDue = /^\d{4}-\d{2}-\d{2}$/.test(String(dueDate || ''));
              const total = computeTotals(cleanItems, taxRate).total;
              if (!trimmedName) {
                setErrorMsg('Student name is required.');
                return;
              }
              if (!validDue) {
                setErrorMsg('Due date must be a valid YYYY-MM-DD date.');
                return;
              }
              if (!cleanItems.length || total <= 0) {
                setErrorMsg('Add at least one valid line item with a total greater than zero.');
                return;
              }
              setErrorMsg('');
              setSubmitting(true);
              try {
                await onCreate({
                  bill_to: { name: trimmedName || 'Student', uid, class: cls },
                  due_date: dueDate,
                  items: cleanItems,
                  tax_rate: taxRate,
                  notes,
                });
                onClose();
              } catch (err) {
                const msg = err?.response?.data?.message || err.message || 'Could not create invoice';
                setErrorMsg(msg);
              } finally {
                setSubmitting(false);
              }
            }}
            className="h-9 px-4 rounded-lg text-white font-medium text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
          >
            {submitting ? 'SavingΓÇª' : 'Create invoice'}
          </button>
        </div>
      </div>
    </div>,
    root
  );
}

function InvoiceRowActionsButton({ row, openRowMenu, setOpenRowMenu, isRowBusy }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (openRowMenu?.id === row.id) {
          setOpenRowMenu(null);
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setOpenRowMenu({ id: row.id, ...computeInvoiceActionMenuPosition(rect) });
      }}
      disabled={isRowBusy}
      className="h-9 sm:h-7 px-4 sm:px-3 rounded-xl inline-flex items-center justify-center gap-1.5 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#000435] transition-all w-full sm:w-auto sm:ml-auto"
      aria-expanded={openRowMenu?.id === row.id}
      aria-haspopup="menu"
    >
      <ChevronDown
        size={14}
        className={`opacity-50 transition-transform ${openRowMenu?.id === row.id ? 'rotate-180' : ''}`}
      />
      Actions
    </button>
  );
}

function InvoiceMobileCard({ row, openRowMenu, setOpenRowMenu, isRowBusy }) {
  const chip = statusChip(row.status);
  return (
    <article className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl border border-black/5 bg-re-bg flex items-center justify-center shrink-0 text-[#000435]">
          <FileText size={18} className="opacity-70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#000435] truncate">{row.invoiceNo}</p>
          <p className="text-[10px] font-medium text-[#000435]/55 mt-0.5 truncate">{row.billTo?.name || '—'}</p>
          <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest opacity-50 mt-1 truncate">
            {(row.billTo?.metaLines || []).join(' · ') || '—'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-medium uppercase tracking-widest shrink-0 ${chip.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
          {chip.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-black/5">
        <div>
          <p className="text-[7px] font-medium uppercase tracking-widest text-[#000435]/40">Issued</p>
          <p className="text-[10px] font-medium text-[#000435] mt-0.5">{row.issueDate || '—'}</p>
        </div>
        <div>
          <p className="text-[7px] font-medium uppercase tracking-widest text-[#000435]/40">Due</p>
          <p className="text-[10px] font-medium text-[#000435] mt-0.5">{row.dueDate || '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[7px] font-medium uppercase tracking-widest text-[#000435]/40">Amount</p>
          <p className="text-lg font-semibold text-[#000435] mt-0.5 tabular-nums">
            {formatMoneyRWF(row.totals.total).replace('RWF', '').trim()}
            <span className="text-[9px] font-medium text-[#000435]/50 uppercase tracking-widest ml-1">RWF</span>
          </p>
        </div>
      </div>
      <div className="mt-4">
        <InvoiceRowActionsButton
          row={row}
          openRowMenu={openRowMenu}
          setOpenRowMenu={setOpenRowMenu}
          isRowBusy={isRowBusy}
        />
      </div>
    </article>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFilterField, setDateFilterField] = useState('issued');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  /** { id, top, left } — menu rendered in portal to avoid table overflow clipping */
  const [openRowMenu, setOpenRowMenu] = useState(null);

  const [config, setConfig] = useState(() => loadJSON(STORAGE.config, {
    schoolName: 'Babyeyi School',
    contactLine: 'Finance Office',
    bankAccount: 'ACC-__________',
    momoNumber: '07__ ___ ___',
    defaultTerms: 'Payment due within 7 days. Late fees may apply.',
    footerNote: 'Thank you for supporting the school.',
  }));

  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoadingKey, setActionLoadingKey] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = { limit: INVOICES_FETCH_LIMIT, page: 1 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (dateFilterField === 'issued') {
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
      }
      if (statusFilter === 'paid') params.invoice_status = 'PAID';
      else if (statusFilter === 'sent' || statusFilter === 'overdue' || statusFilter === 'draft') {
        params.invoice_status = 'NOT_PAID';
      }

      const { data } = await api.get(INVOICES_API, { params });
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to load invoices');
      }
      const list = Array.isArray(data.data) ? data.data : [];
      setRows(list.map(mapApiRowToInvoice));
    } catch (e) {
      setLoadError(e?.response?.data?.message || e.message || 'Failed to load invoices');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo, dateFilterField, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, dateFrom, dateTo, dateFilterField]);

  useEffect(() => {
    if (!openRowMenu) return undefined;
    const close = () => setOpenRowMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openRowMenu]);

  useEffect(() => {
    saveJSON(STORAGE.config, config);
  }, [config]);

  const derived = useMemo(() => {
    const withTotals = rows.map((r) => {
      const totals = computeTotals(r.items, r.taxRate);
      return { ...r, totals };
    });

    let filtered = withTotals.filter((r) => {
      const statusOk =
        statusFilter === 'All' || String(r.status).toLowerCase() === String(statusFilter).toLowerCase();
      return statusOk;
    });

    if (dateFilterField === 'due') {
      if (dateFrom) {
        filtered = filtered.filter((r) => r.dueDate && r.dueDate >= dateFrom);
      }
      if (dateTo) {
        filtered = filtered.filter((r) => r.dueDate && r.dueDate <= dateTo);
      }
    }

    const sum = (pred) => filtered.filter(pred).reduce((s, r) => s + (Number(r.totals?.total) || 0), 0);
    const totalPages = Math.max(1, Math.ceil(filtered.length / INVOICES_PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * INVOICES_PAGE_SIZE;
    const paginated = filtered.slice(start, start + INVOICES_PAGE_SIZE);

    return {
      filtered,
      paginated,
      totalPages,
      safePage,
      stats: {
        totalOutstanding: sum((r) => r.status !== 'paid'),
        overdue: sum((r) => r.status === 'overdue'),
        paid: sum((r) => r.status === 'paid'),
        count: filtered.length,
      },
    };
  }, [rows, searchTerm, statusFilter, dateFrom, dateTo, dateFilterField, page]);

  useEffect(() => {
    if (page > derived.totalPages) setPage(derived.totalPages);
  }, [page, derived.totalPages]);

  const setStatus = async (id, status) => {
    const intentId = Number(id);
    if (!intentId) return;
    const action = status === 'paid' ? 'mark_paid' : 'mark_sent';
    setActionLoadingKey(`${intentId}:status:${status}`);
    try {
      await api.patch(`${INVOICES_API}/${intentId}`, { action });
      await loadInvoices();
      setToast({ type: 'success', message: `Invoice marked as ${status}.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Update failed' });
    } finally {
      setActionLoadingKey('');
    }
  };

  const tryOpenServerInvoicePdf = async (intentId) => {
    try {
      const res = await api.get(`${INVOICES_API}/${intentId}/print.pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch {
      return false;
    }
  };

  const handleCreateInvoice = async (body) => {
    const { data } = await api.post(INVOICES_API, body);
    if (!data?.success) {
      throw new Error(data?.message || 'Create failed');
    }
    await loadInvoices();
    setToast({ type: 'success', message: 'Invoice created successfully.' });
  };

  const handleQuickEdit = async (row) => {
    const due = window.prompt('Due date (YYYY-MM-DD):', row.dueDate || '');
    if (due == null) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due).trim())) {
      setToast({ type: 'error', message: 'Please enter a valid due date format (YYYY-MM-DD).' });
      return;
    }
    const notes = window.prompt('Invoice notes:', row.notes || '') ?? '';
    if (String(notes).length > 500) {
      setToast({ type: 'error', message: 'Notes must be 500 characters or less.' });
      return;
    }
    setActionLoadingKey(`${row.intentId}:edit`);
    try {
      await api.patch(`${INVOICES_API}/${row.intentId}`, {
        due_date: String(due).trim(),
        notes,
        bill_to: {
          name: row.billTo?.name || '',
          uid: String((row.billTo?.metaLines || []).find((x) => String(x).startsWith('UID: ')) || '').replace('UID: ', ''),
          class: String((row.billTo?.metaLines || []).find((x) => String(x).startsWith('Class: ')) || '').replace('Class: ', ''),
        },
        items: row.items || [],
        tax_rate: row.taxRate || 0,
      });
      await loadInvoices();
      setToast({ type: 'success', message: `Invoice ${row.invoiceNo} updated.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Update failed' });
    } finally {
      setActionLoadingKey('');
    }
  };

  const handleDeleteInvoice = async (row) => {
    const ok = window.confirm(`Delete invoice ${row.invoiceNo}?`);
    if (!ok) return;
    setOpenRowMenu(null);
    setActionLoadingKey(`${row.intentId}:delete`);
    try {
      await api.delete(`${INVOICES_API}/${row.intentId}`);
      await loadInvoices();
      setToast({ type: 'success', message: `Invoice ${row.invoiceNo} deleted.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Delete failed' });
    } finally {
      setActionLoadingKey('');
    }
  };

  const activeMenuRow = openRowMenu
    ? derived.filtered.find((r) => r.id === openRowMenu.id)
    : null;

  const clearDateFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const dateFilterActive = Boolean(dateFrom || dateTo);

  const buildDateFilterLabel = () => {
    if (!dateFrom && !dateTo) return '';
    const field = dateFilterField === 'due' ? 'Due date' : 'Issued date';
    if (dateFrom && dateTo) return `${field}: ${dateFrom} to ${dateTo}`;
    if (dateFrom) return `${field}: from ${dateFrom}`;
    return `${field}: until ${dateTo}`;
  };

  const exportFilteredPdf = async () => {
    if (!derived.filtered.length) {
      setToast({ type: 'error', message: 'No invoices to export for the current filters.' });
      return;
    }
    setExportingPdf(true);
    try {
      await new Promise((r) => window.requestAnimationFrame(r));
      downloadInvoicesReportPdf({
        schoolName: config.schoolName || 'School',
        statusFilterLabel: statusFilter === 'All' ? 'All statuses' : statusFilter,
        dateFilterLabel: buildDateFilterLabel(),
        searchNote: debouncedSearch ? `Search: "${debouncedSearch}"` : '',
        stats: derived.stats,
        invoices: derived.filtered,
      });
      setToast({ type: 'success', message: `Exported ${derived.filtered.length} invoice(s) to PDF.` });
    } catch (e) {
      setToast({ type: 'error', message: e?.message || 'PDF export failed.' });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <>
      <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {/* Hero — ochre band */}
        <AccountantOchreHero
          eyebrow="Billing"
          titleLine="Invoice"
          titleAccent="Management"
          subtitle="Create, send, and track invoices"
          icon={FileText}
        />

        {/* Card */}
        <div className="acct-shell-standard pb-20">
          <div className="acct-panel-sheet overflow-hidden flex flex-col min-h-[540px]">
            {/* Stats + actions */}
            <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
              <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
                {[
                  { label: 'Outstanding', value: formatCompactMoneyRWF(derived.stats.totalOutstanding), icon: <AlertTriangle size={14} className="text-red-500" /> },
                  { label: 'Overdue', value: formatCompactMoneyRWF(derived.stats.overdue), icon: <AlertTriangle size={14} className="text-amber-500" /> },
                  { label: 'Paid', value: formatCompactMoneyRWF(derived.stats.paid), icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
                  { label: 'Invoices', value: String(derived.stats.count), icon: <FileText size={14} className="text-blue-500" /> },
                ].map((stat, i) => (
                  <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                    <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                    <span className="text-sm sm:text-2xl font-medium text-re-text tracking-tighter group-hover:text-[#000435] transition-colors">
                      {stat.value}
                    </span>
                    <p className="text-[6px] sm:text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                <button
                  type="button"
                  onClick={exportFilteredPdf}
                  disabled={exportingPdf || !derived.filtered.length}
                  className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
                >
                  {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{exportingPdf ? 'Generating…' : 'Export PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewOpen(true)}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-[#000435] rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg/40 active:scale-95 transition-all"
                >
                  <Plus size={14} className="text-re-gold" />
                  <span>New invoice</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 sm:px-6 py-4 border-b border-black/5 bg-white/50 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group min-w-0">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#000435] group-focus-within:text-[#000435] transition-colors" />
                  <input
                    type="text"
                    placeholder="Search invoice or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-11 sm:h-10 bg-white rounded-xl pl-10 pr-4 outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[11px] sm:text-[10px] font-medium shadow-sm placeholder:text-[#000435]/40"
                  />
                </div>

                <div className="relative w-full sm:w-44 group">
                  <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#000435] pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-11 sm:h-10 bg-white rounded-xl pl-9 pr-8 outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium uppercase tracking-widest cursor-pointer appearance-none shadow-sm"
                  >
                    <option value="All">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="overdue">Overdue</option>
                    <option value="paid">Paid</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#000435] pointer-events-none" />
                </div>

                <div className="flex gap-2 sm:shrink-0">
                  <button
                    type="button"
                    onClick={exportFilteredPdf}
                    disabled={exportingPdf || !derived.filtered.length}
                    className="h-11 sm:h-10 flex-1 sm:flex-none sm:min-w-[100px] flex items-center justify-center gap-1.5 text-white rounded-xl font-medium text-[8px] uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
                  >
                    {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    <span className="sm:hidden">{exportingPdf ? '…' : 'PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadInvoices()}
                    className="h-11 sm:h-10 flex-1 sm:flex-none sm:w-10 flex items-center justify-center bg-white border border-black/5 rounded-xl hover:bg-re-bg/30 transition-all shadow-sm"
                    disabled={loading}
                    aria-label="Refresh invoices"
                  >
                    <RefreshCw size={14} className={`text-[#000435] ${loading ? 'animate-spin' : 'opacity-60'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOpen(true)}
                    className="lg:hidden h-11 flex-1 flex items-center justify-center gap-2 bg-white border border-black/5 text-[#000435] rounded-xl font-medium text-[9px] uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all"
                  >
                    <Plus size={14} className="text-re-gold" />
                    New
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar size={14} className="text-[#000435]/50 shrink-0" />
                  <span className="text-[8px] font-medium uppercase tracking-widest text-[#000435]/50">Filter by date</span>
                  <div className="flex rounded-xl border border-black/5 overflow-hidden ml-auto sm:ml-2">
                    {[
                      { id: 'issued', label: 'Issued' },
                      { id: 'due', label: 'Due' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDateFilterField(opt.id)}
                        className={`px-3 py-1.5 text-[8px] font-medium uppercase tracking-widest transition-colors ${
                          dateFilterField === opt.id
                            ? 'bg-[#000435] text-white'
                            : 'bg-white text-[#000435]/60 hover:bg-re-bg/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3">
                  <label className="block">
                    <span className="text-[7px] font-medium uppercase tracking-widest text-[#000435]/45 mb-1 block">From</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-11 sm:h-10 rounded-xl border border-black/5 px-3 text-[11px] font-medium text-[#000435] bg-re-bg/20 focus:border-[#000435]/20 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[7px] font-medium uppercase tracking-widest text-[#000435]/45 mb-1 block">To</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={dateFrom || undefined}
                      className="w-full h-11 sm:h-10 rounded-xl border border-black/5 px-3 text-[11px] font-medium text-[#000435] bg-re-bg/20 focus:border-[#000435]/20 outline-none"
                    />
                  </label>
                  {dateFilterActive && (
                    <button
                      type="button"
                      onClick={clearDateFilters}
                      className="h-11 sm:h-10 sm:self-end px-4 rounded-xl border border-black/5 text-[9px] font-medium uppercase tracking-widest text-[#000435]/70 hover:bg-re-bg/40 flex items-center justify-center gap-1.5"
                    >
                      <X size={14} />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadError && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-[10px] font-medium text-amber-900">
                {loadError}
              </div>
            )}
            {/* Mobile cards */}
            <div className="md:hidden bg-white flex-1 min-h-[280px] px-4 py-4 space-y-3">
              {loading && !derived.paginated.length && (
                <p className="text-center text-[10px] font-medium text-[#000435]/50 uppercase tracking-widest py-12">Loading invoices…</p>
              )}
              {!loading && !derived.filtered.length && (
                <p className="text-center text-[10px] font-medium text-[#000435]/50 uppercase tracking-widest py-12 px-4">
                  No invoices match your filters. Create one or adjust the date range.
                </p>
              )}
              {derived.paginated.map((r) => {
                const isRowBusy = actionLoadingKey.startsWith(`${r.intentId}:`);
                return (
                  <InvoiceMobileCard
                    key={r.id}
                    row={r}
                    openRowMenu={openRowMenu}
                    setOpenRowMenu={setOpenRowMenu}
                    isRowBusy={isRowBusy}
                  />
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto bg-white flex-1 min-h-[420px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-re-bg/20 border-b border-black/5">
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[7px] sm:text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Invoice</th>
                    <th className="hidden md:table-cell px-6 py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Customer</th>
                    <th className="hidden lg:table-cell px-6 py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Dates</th>
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Total</th>
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Status</th>
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-medium text-re-text-muted uppercase tracking-[0.2em] opacity-40">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {!derived.paginated.length && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-[10px] font-medium text-[#000435] uppercase tracking-widest">
                        {loading ? 'Loading invoices…' : 'No invoices match your filters.'}
                      </td>
                    </tr>
                  )}
                  {derived.paginated.map((r) => {
                    const chip = statusChip(r.status);
                    const isRowBusy = actionLoadingKey.startsWith(`${r.intentId}:`);
                    return (
                      <tr key={r.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group">
                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-black/5 bg-white flex items-center justify-center shadow-inner shrink-0 text-[#000435]">
                              <FileText size={16} className="opacity-75" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-[#000435] tracking-tight truncate">{r.invoiceNo}</p>
                              <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50 truncate">
                                Due {r.dueDate}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl border border-black/5 bg-white flex items-center justify-center shadow-sm">
                              <User size={13} className="text-amber-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-[#000435] truncate">{r.billTo?.name || 'ΓÇö'}</p>
                              <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest opacity-40 truncate">{(r.billTo?.metaLines || []).join(' ┬╖ ')}</p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden lg:table-cell px-6 py-3 border-r border-black/5">
                          <p className="text-[10px] font-medium text-[#000435] uppercase tracking-widest leading-none whitespace-nowrap">{r.issueDate}</p>
                          <p className="text-[8px] font-medium text-re-text-muted uppercase tracking-widest opacity-40 mt-1 leading-none whitespace-nowrap">Due {r.dueDate}</p>
                        </td>

                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                          <p className="text-[12px] font-medium text-[#000435]">
                            {formatMoneyRWF(r.totals.total).replace('RWF', '').trim()}
                            <span className="ml-1 text-[9px] font-medium text-[#000435]/60 uppercase tracking-widest">RWF</span>
                          </p>
                        </td>

                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                          <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[9px] font-medium uppercase tracking-widest ${chip.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
                            {chip.label}
                          </span>
                        </td>

                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                          <InvoiceRowActionsButton
                            row={r}
                            openRowMenu={openRowMenu}
                            setOpenRowMenu={setOpenRowMenu}
                            isRowBusy={isRowBusy}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 px-4 sm:px-8 py-4 bg-white/50 border-t border-black/5 items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-[8px] font-medium text-[#000435] uppercase tracking-widest opacity-60">Invoice Registry</p>
                </div>
                <p className="text-[8px] font-medium text-[#000435] uppercase tracking-[0.2em] opacity-40">
                  {derived.stats.count} records · {statusFilter}
                  {dateFilterActive ? ` · ${dateFilterField} date` : ''}
                </p>
              </div>

              {derived.filtered.length > 0 && (
                <div className="flex items-center justify-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={derived.safePage <= 1}
                    className="h-9 w-9 rounded-xl border border-black/10 flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-white transition-colors shadow-sm"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-[9px] font-medium uppercase tracking-widest text-[#000435]/70 tabular-nums min-w-[120px] text-center">
                    Page {derived.safePage} of {derived.totalPages}
                    <span className="text-[#000435]/35 mx-1">·</span>
                    {derived.filtered.length === 0
                      ? '0'
                      : `${(derived.safePage - 1) * INVOICES_PAGE_SIZE + 1}–${Math.min(derived.safePage * INVOICES_PAGE_SIZE, derived.filtered.length)}`}
                    {' '}
                    of {derived.filtered.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(derived.totalPages, p + 1))}
                    disabled={derived.safePage >= derived.totalPages}
                    className="h-9 w-9 rounded-xl border border-black/10 flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-white transition-colors shadow-sm"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-2 text-[8px] font-medium uppercase tracking-widest text-[#000435] opacity-60">
                <Building2 size={12} className="text-amber-500/70" />
                {config.schoolName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {openRowMenu && activeMenuRow && getModalRoot()
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[200] cursor-default bg-transparent border-0 p-0"
                aria-label="Close actions menu"
                onClick={() => setOpenRowMenu(null)}
              />
              <div
                role="menu"
                className="fixed z-[210] w-56 rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden"
                style={{ top: openRowMenu.top, left: openRowMenu.left }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    const row = activeMenuRow;
                    setOpenRowMenu(null);
                    if (row.intentId) {
                      const ok = await tryOpenServerInvoicePdf(row.intentId);
                      if (!ok) exportInvoicePdf({ invoice: row, config });
                    } else {
                      exportInvoicePdf({ invoice: row, config });
                    }
                  }}
                  disabled={actionLoadingKey.startsWith(`${activeMenuRow.intentId}:`)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all"
                >
                  <Printer size={14} className="text-[#000435]" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">View / Print</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpenRowMenu(null);
                    handleQuickEdit(activeMenuRow);
                  }}
                  disabled={actionLoadingKey.startsWith(`${activeMenuRow.intentId}:`)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                >
                  <Settings2 size={14} className="text-[#000435]" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Edit invoice</span>
                </button>
                {activeMenuRow.status !== 'paid' ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenRowMenu(null);
                        setStatus(activeMenuRow.id, 'sent');
                      }}
                      disabled={actionLoadingKey.startsWith(`${activeMenuRow.intentId}:`)}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-re-bg/30 transition-all border-t border-black/5"
                    >
                      <Send size={14} className="text-amber-600" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-[#000435]">Mark as sent</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpenRowMenu(null);
                        setStatus(activeMenuRow.id, 'paid');
                      }}
                      disabled={actionLoadingKey.startsWith(`${activeMenuRow.intentId}:`)}
                      className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-emerald-50 transition-all border-t border-black/5"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-700">Mark as paid</span>
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleDeleteInvoice(activeMenuRow)}
                  disabled={actionLoadingKey.startsWith(`${activeMenuRow.intentId}:`)}
                  className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-red-50 transition-all border-t border-black/5"
                >
                  <AlertTriangle size={14} className="text-red-600" />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-red-600">Delete invoice</span>
                </button>
              </div>
            </>,
            getModalRoot()
          )
        : null}

      <NewInvoiceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        config={config}
        onCreate={handleCreateInvoice}
      />
      <PortalToast toast={toast} />
    </>
  );
}
