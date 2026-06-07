import { amountInWordsRWF, fmtNum } from './amountInWords';
import { API_BASE } from './procurementApi';

const NAVY = [0, 4, 53];
const AMBER = [245, 158, 11];
const WHITE = [255, 255, 255];
const MUTED = [107, 114, 128];
const SLATE = [17, 24, 39];

const API_ORIGIN = String(API_BASE || '').replace(/\/api\/?$/, '') || '';

async function getJsPDF() {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
}

function resolveLogoUrl(logoUrl) {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith('data:')) return logoUrl;
  const path = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
  return `${API_ORIGIN}${path}`;
}

async function loadImageDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function drawBrandedHeader(doc, school, title, docNumber, docDate, W, margin) {
  const logoData = await loadImageDataUrl(resolveLogoUrl(school?.logo_url));
  const headerH = logoData ? 48 : 42;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, headerH, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, headerH, W, 2.5, 'F');

  let textX = margin;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, 6, 22, 22);
      textX = margin + 26;
    } catch {
      try {
        doc.addImage(logoData, 'JPEG', margin, 6, 22, 22);
        textX = margin + 26;
      } catch { /* skip logo */ }
    }
  }

  const schoolName = String(school?.name || school?.school_name || 'School').toUpperCase();
  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName, textX, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const addr = String(school?.address || school?.full_address || '').trim();
  if (addr) doc.text(addr, textX, 20);
  const contacts = [
    school?.phone ? `Tel: ${school.phone}` : null,
    school?.email ? `Email: ${school.email}` : null,
    school?.website ? school.website : null,
  ].filter(Boolean).join('  |  ');
  if (contacts) doc.text(contacts, textX, 26);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, W - margin, 14, { align: 'right' });
  doc.setFontSize(9);
  doc.text(docNumber, W - margin, 22, { align: 'right' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${fmtDate(docDate || new Date()) || '—'}`, W - margin, 30, { align: 'right' });

  return headerH + 8;
}

function sectionTitle(doc, text, y, margin) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(String(text).toUpperCase(), margin, y);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 2, margin + 48, y + 2);
  return y + 9;
}

function labelRow(doc, label, value, y, margin, W) {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(String(label), margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE);
  const val = String(value ?? '—');
  const lines = doc.splitTextToSize(val, W - margin * 2 - 55);
  doc.text(lines, W - margin, y, { align: 'right' });
  return y + Math.max(6, lines.length * 4.5);
}

function drawItemsTable(doc, headers, rows, startY, margin, contentW) {
  const colWeights = headers.map((h, i) => {
    if (i === 0) return 0.06;
    if (h.toLowerCase().includes('item') || h.toLowerCase().includes('description')) return 0.34;
    if (i === headers.length - 1) return 0.16;
    return (1 - 0.56) / Math.max(1, headers.length - 3);
  });
  const colWidths = colWeights.map((w) => w * contentW);

  let y = startY;
  doc.setFillColor(...AMBER);
  doc.rect(margin, y, contentW, 9, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  let x = margin + 2;
  headers.forEach((h, i) => {
    doc.text(String(h), x, y + 6);
    x += colWidths[i];
  });
  y += 9;

  rows.forEach((row, ri) => {
    doc.setFillColor(...(ri % 2 === 0 ? WHITE : [247, 248, 252]));
    doc.rect(margin, y, contentW, 8.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    x = margin + 2;
    row.forEach((cell, ci) => {
      const text = String(cell ?? '');
      const maxW = colWidths[ci] - 4;
      const clipped = doc.getTextWidth(text) > maxW && text.length > 4
        ? `${text.slice(0, Math.max(4, Math.floor(text.length * maxW / doc.getTextWidth(text))))}…`
        : text;
      doc.text(clipped, x, y + 5.8);
      x += colWidths[ci];
    });
    y += 8.5;
  });
  return y + 5;
}

/** Name / Signature / Date lines — same layout as other portal request PDFs. */
function drawSignatureBlock(doc, blocks, startY, margin, W) {
  const gap = 8;
  const blockW = (W - margin * 2 - gap * (blocks.length - 1)) / blocks.length;
  let y = startY;
  blocks.forEach((block, i) => {
    const x = margin + i * (blockW + gap);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(block.title, x, y + 4);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.4);
    doc.line(x, y + 8, x + blockW, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    const nameLine = block.name ? String(block.name) : '___________________';
    doc.text(`Name: ${nameLine}`, x, y + 16);
    doc.text('Signature: _______________', x, y + 22);
    const dateLine = block.date ? fmtDate(block.date) : '____________________';
    doc.text(`Date: ${dateLine}`, x, y + 28);
  });
  return y + 38;
}

function drawFooter(doc, school, docType, docNumber, W, H) {
  doc.setFillColor(...NAVY);
  doc.rect(0, H - 11, W, 11, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(6.5);
  const name = school?.name || school?.school_name || 'School';
  doc.text(`${name} · ${docType} · ${docNumber}`, W / 2, H - 4.5, { align: 'center' });
}

function outputPdf(doc, filename, autoPrint) {
  if (autoPrint) {
    doc.autoPrint();
    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  } else {
    doc.save(filename);
  }
}

export async function exportPurchaseRequestPdf({ request, school, autoPrint = false }) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 14;
  const contentW = W - margin * 2;

  let y = await drawBrandedHeader(
    doc, school, 'PURCHASE REQUEST', request.request_number || request.id, request.request_date, W, margin
  );

  y = sectionTitle(doc, 'Request Information', y, margin);
  y = labelRow(doc, 'Request Date', fmtDate(request.request_date) || '—', y, margin, W);
  y = labelRow(doc, 'Department', request.department, y, margin, W);
  y = labelRow(doc, 'Purpose', request.purpose, y, margin, W);
  y = labelRow(doc, 'Priority', request.priority, y, margin, W);
  y = labelRow(doc, 'Requested By', request.requested_by, y, margin, W);
  y += 4;

  y = sectionTitle(doc, 'Requested Items', y, margin);
  const itemRows = (request.items || []).map((it, i) => [
    i + 1,
    it.item_name || it.item,
    fmtNum(it.quantity),
    it.unit || 'pcs',
    it.notes || '—',
  ]);
  y = drawItemsTable(doc, ['#', 'Item', 'Qty', 'Unit', 'Notes'], itemRows, y, margin, contentW);

  y = sectionTitle(doc, 'Approval', y + 4, margin);
  drawSignatureBlock(doc, [
    { title: 'Requested By', name: request.requested_by, date: request.submitted_at || request.request_date },
    { title: 'Reviewed By (Accountant)', name: request.reviewed_by || request.reviewer, date: request.reviewed_at },
    { title: 'Approved By (Manager)', name: request.approved_by || request.approver, date: request.approved_at },
  ], y, margin, W);

  drawFooter(doc, school, 'Purchase Request', request.request_number || 'draft', W, H);
  outputPdf(doc, `purchase-request-${request.request_number || 'draft'}.pdf`, autoPrint);
}

export async function exportRequisitionPdf({ requisition, school, autoPrint = false }) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 14;
  const contentW = W - margin * 2;

  let y = await drawBrandedHeader(
    doc, school, 'REQUISITION ORDER', requisition.requisition_number || requisition.id,
    requisition.requisition_date, W, margin
  );

  y = sectionTitle(doc, 'Requisition Information', y, margin);
  y = labelRow(doc, 'Requisition No', requisition.requisition_number, y, margin, W);
  y = labelRow(doc, 'Date', fmtDate(requisition.requisition_date) || '—', y, margin, W);
  y = labelRow(doc, 'Request No', requisition.request_number || requisition.request?.request_number, y, margin, W);
  y = labelRow(doc, 'Purpose', requisition.purpose, y, margin, W);
  y = labelRow(doc, 'Requested By', requisition.requested_by || requisition.request?.requested_by, y, margin, W);
  y += 4;

  y = sectionTitle(doc, 'Line Items', y, margin);
  const itemRows = (requisition.items || []).map((it, i) => [
    i + 1,
    it.item_name,
    fmtNum(it.quantity),
    `${fmtNum(it.unit_price)} RWF`,
    `${fmtNum(it.total)} RWF`,
  ]);
  y = drawItemsTable(doc, ['#', 'Item', 'Qty', 'Unit Price', 'Total'], itemRows, y, margin, contentW);

  y = sectionTitle(doc, 'Financial Summary', y + 4, margin);
  y = labelRow(doc, 'Subtotal', `${fmtNum(requisition.subtotal)} RWF`, y, margin, W);
  y = labelRow(doc, 'Grand Total', `${fmtNum(requisition.grand_total)} RWF`, y, margin, W);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  const words = requisition.amount_in_words || amountInWordsRWF(requisition.grand_total);
  const wordLines = doc.splitTextToSize(`Amount in Words: ${words}`, contentW);
  doc.text(wordLines, margin, y + 4);
  y += wordLines.length * 4 + 8;

  if (requisition.remarks) {
    y = labelRow(doc, 'Remarks', requisition.remarks, y, margin, W);
  }

  y = sectionTitle(doc, 'Approval', y + 4, margin);
  drawSignatureBlock(doc, [
    { title: 'Requested By', name: requisition.requested_by || requisition.request?.requested_by, date: requisition.created_at },
    { title: 'Reviewed By (Accountant)', name: requisition.reviewed_by, date: requisition.reviewed_at },
    { title: 'Approved By (Manager)', name: requisition.approved_by, date: requisition.approved_at },
  ], y, margin, W);

  drawFooter(doc, school, 'Requisition', requisition.requisition_number, W, H);
  outputPdf(doc, `requisition-${requisition.requisition_number}.pdf`, autoPrint);
}

export async function exportPurchaseOrderPdf({ order, school, autoPrint = false }) {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 14;
  const contentW = W - margin * 2;

  let y = await drawBrandedHeader(
    doc, school, 'PURCHASE ORDER', order.po_number || order.id, order.po_date, W, margin
  );

  const boxH = 38;
  const halfW = (contentW - 8) / 2;
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(margin, y, halfW, boxH, 2, 2, 'F');
  doc.roundedRect(margin + halfW + 8, y, halfW, boxH, 2, 2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AMBER);
  doc.text('SUPPLIER', margin + 4, y + 6);
  doc.text('BILL TO (SCHOOL)', margin + halfW + 12, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(8);
  const supplierLines = [
    order.supplier_name,
    order.supplier_title,
    order.supplier_tin ? `TIN: ${order.supplier_tin}` : null,
    order.supplier_phone ? `Tel: ${order.supplier_phone}` : null,
    order.supplier_email,
    order.supplier_address,
  ].filter(Boolean);
  const customerLines = [
    school?.name || school?.school_name,
    school?.address || school?.full_address,
    school?.phone ? `Tel: ${school.phone}` : null,
    school?.email ? `Email: ${school.email}` : null,
  ].filter(Boolean);

  let sy = y + 12;
  supplierLines.forEach((line) => {
    doc.text(String(line), margin + 4, sy);
    sy += 4.5;
  });
  let cy = y + 12;
  customerLines.forEach((line) => {
    doc.text(String(line), margin + halfW + 12, cy);
    cy += 4.5;
  });
  y += boxH + 8;

  if (order.purpose || order.requisition_number) {
    y = sectionTitle(doc, 'Order Details', y, margin);
    if (order.requisition_number) y = labelRow(doc, 'Requisition Ref', order.requisition_number, y, margin, W);
    if (order.purpose) y = labelRow(doc, 'Purpose', order.purpose, y, margin, W);
    y += 2;
  }

  y = sectionTitle(doc, 'Purchase Order Items', y, margin);
  const itemRows = (order.items || []).map((it, i) => [
    i + 1,
    it.item_name,
    fmtNum(it.quantity),
    `${fmtNum(it.unit_price)} RWF`,
    `${fmtNum(it.amount)} RWF`,
  ]);
  y = drawItemsTable(doc, ['#', 'Item', 'Qty', 'Unit Price', 'Amount'], itemRows, y, margin, contentW);

  y = sectionTitle(doc, 'Financial Summary', y + 4, margin);
  y = labelRow(doc, 'Subtotal', `${fmtNum(order.subtotal)} RWF`, y, margin, W);
  const taxLabel = order.tax_enabled
    ? `Tax (${fmtNum(order.tax_percent || 18)}%)`
    : 'Tax';
  const discountLabel = Number(order.discount_percent) > 0
    ? `Discount (${fmtNum(order.discount_percent)}%)`
    : 'Discount';
  y = labelRow(doc, taxLabel, `${fmtNum(order.tax)} RWF`, y, margin, W);
  y = labelRow(doc, discountLabel, `${fmtNum(order.discount)} RWF`, y, margin, W);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Grand Total', margin, y);
  doc.text(`${fmtNum(order.grand_total)} RWF`, W - margin, y, { align: 'right' });
  y += 8;
  const words = order.amount_in_words || amountInWordsRWF(order.grand_total);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...MUTED);
  const wordLines = doc.splitTextToSize(`Amount in Words: ${words}`, contentW);
  doc.text(wordLines, margin, y);
  y += wordLines.length * 4 + 10;

  y = sectionTitle(doc, 'Authorization', y, margin);
  drawSignatureBlock(doc, [
    { title: 'Requested By', name: order.requested_by, date: order.issued_at || order.po_date },
    { title: 'Verified By (Accountant)', name: order.verified_by, date: order.issued_at },
    { title: 'Approved By (Manager)', name: order.approved_by, date: order.issued_at },
    { title: 'Supplier Ack.', name: order.supplier_name, date: null },
  ], y, margin, W);

  drawFooter(doc, school, 'Purchase Order', order.po_number, W, H);
  outputPdf(doc, `purchase-order-${order.po_number}.pdf`, autoPrint);
}

export async function downloadSamplePdf(type = 'purchase-order') {
  const school = {
    name: 'Kigali Parents School',
    address: 'KG 5 Ave, Kigali, Rwanda',
    phone: '+250 788 000 000',
    email: 'info@school.rw',
  };
  if (type === 'request') {
    return exportPurchaseRequestPdf({
      school,
      request: {
        request_number: 'REQ-2026-00001',
        request_date: '2026-06-07',
        department: 'Kitchen',
        purpose: 'Term 2 food supplies',
        priority: 'normal',
        requested_by: 'Jane Uwimana',
        reviewer: 'School Accountant',
        approver: 'School Manager',
        submitted_at: '2026-06-07',
        items: [
          { item_name: 'Rice', quantity: 50, unit: 'kg', notes: 'Long grain' },
          { item_name: 'Sugar', quantity: 20, unit: 'kg', notes: '' },
        ],
      },
    });
  }
  if (type === 'requisition') {
    return exportRequisitionPdf({
      school,
      requisition: {
        requisition_number: 'RQN-2026-00001',
        requisition_date: '2026-06-07',
        request_number: 'REQ-2026-00001',
        purpose: 'Term 2 food supplies',
        requested_by: 'Jane Uwimana',
        reviewed_by: 'Accountant Name',
        reviewed_at: '2026-06-07',
        subtotal: 1283600,
        grand_total: 1283600,
        amount_in_words: amountInWordsRWF(1283600),
        items: [
          { item_name: 'Rice', quantity: 50, unit_price: 1200, total: 60000 },
          { item_name: 'Sugar', quantity: 20, unit_price: 1500, total: 30000 },
        ],
      },
    });
  }
  return exportPurchaseOrderPdf({
    school,
    order: {
      po_number: 'PO-2026-00001',
      po_date: '2026-06-07',
      requisition_number: 'RQN-2026-00001',
      supplier_name: 'Rwanda Supplies Ltd',
      supplier_title: 'Wholesale Distributor',
      supplier_tin: '123456789',
      supplier_phone: '+250 788 111 222',
      supplier_email: 'sales@rwandasupplies.rw',
      supplier_address: 'Kigali, Gasabo District',
      purpose: 'Term 2 food supplies',
      requested_by: 'Jane Uwimana',
      verified_by: 'School Accountant',
      approved_by: 'School Manager',
      subtotal: 1283600,
      tax: 0,
      discount: 0,
      grand_total: 1283600,
      amount_in_words: amountInWordsRWF(1283600),
      items: [
        { item_name: 'Rice', quantity: 50, unit_price: 1200, amount: 60000 },
        { item_name: 'Sugar', quantity: 20, unit_price: 1500, amount: 30000 },
      ],
    },
  });
}
