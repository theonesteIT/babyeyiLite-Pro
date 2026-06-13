import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { inlineImagesForPdf } from './reportCardPdfAssets';
import { html2canvasOncloneForExport } from './reportHtml2canvasFix';
import { REPORT_PDF_CAPTURE_CSS } from './reportPdfCaptureStyles';

const CAPTURE_WIDTH_PX = 794;
const REPORT_ROOT_SELECTOR = '[data-report-card]';

async function waitForImages(root) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 5000);
    });
  }));
}

/** Wait until QR code image is generated (data URL). */
async function waitForReportQr(root, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const img = root.querySelector('[data-report-qr] img');
    if (img?.src?.startsWith('data:image')) return true;
    await new Promise((r) => setTimeout(r, 80));
  }
  return false;
}

function syncCloneImages(source, clone) {
  const srcImgs = [...source.querySelectorAll('img')];
  const cloneImgs = [...clone.querySelectorAll('img')];
  srcImgs.forEach((srcImg, i) => {
    const cloneImg = cloneImgs[i];
    if (!cloneImg || !srcImg.src) return;
    cloneImg.src = srcImg.src;
    if (srcImg.width) cloneImg.width = srcImg.width;
    if (srcImg.height) cloneImg.height = srcImg.height;
    cloneImg.removeAttribute('crossorigin');
  });
}

function injectPdfCaptureStyles(clone) {
  const style = document.createElement('style');
  style.setAttribute('data-report-pdf-styles', '1');
  style.textContent = REPORT_PDF_CAPTURE_CSS;
  clone.insertBefore(style, clone.firstChild);
}

/** Force table header colours — html2canvas often drops Tailwind bg/text on th. */
function enforceTableHeaderStyles(root) {
  const table = root.querySelector('[data-report-subjects-table]');
  if (!table) return;

  table.querySelectorAll('[data-report-th-fixed], [data-report-th-assessment]').forEach((th) => {
    th.style.setProperty('background-color', '#1e293b', 'important');
    th.style.setProperty('color', '#ffffff', 'important');
    th.style.fontWeight = '700';
    th.style.fontSize = '9px';
    th.style.padding = '5px 4px';
    th.style.verticalAlign = 'middle';
    th.style.webkitPrintColorAdjust = 'exact';
    th.style.printColorAdjust = 'exact';
  });

  table.querySelectorAll('[data-report-th-sub]').forEach((span) => {
    span.style.setProperty('color', '#cbd5e1', 'important');
    span.style.fontSize = '8px';
    span.style.fontWeight = '500';
    span.style.display = 'block';
    span.style.marginTop = '2px';
  });
}

function rasterizeTrendChart(source) {
  const chartEl = source.querySelector('[data-report-trend-chart]');
  if (!chartEl) return null;
  const svg = chartEl.querySelector('svg.recharts-surface') || chartEl.querySelector('svg');
  if (!svg) return null;
  try {
    const rect = svg.getBoundingClientRect();
    const w = Math.round(Math.max(rect.width, 280));
    const h = Math.round(Math.max(rect.height, 130));
    const xml = new XMLSerializer().serializeToString(svg);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    return { url, w, h };
  } catch {
    return null;
  }
}

function replaceCloneTrendChart(clone, chartRaster) {
  if (!chartRaster) return;
  const cloneChart = clone.querySelector('[data-report-trend-chart]');
  if (!cloneChart) return;
  cloneChart.style.display = 'block';
  cloneChart.innerHTML = '';
  const title = document.createElement('p');
  title.textContent = 'Performance Trends';
  title.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#334155;margin:0 0 4px';
  const img = document.createElement('img');
  img.src = chartRaster.url;
  img.alt = 'Performance trend chart';
  img.style.cssText = `display:block;width:${chartRaster.w}px;height:${chartRaster.h}px;max-width:100%`;
  cloneChart.appendChild(title);
  cloneChart.appendChild(img);
}

/** html2canvas often renders rounded-full as square — enforce circle on clone. */
function enforcePdfVisualFixes(clone) {
  const photoWrap = clone.querySelector('[data-report-student-photo]');
  if (photoWrap) {
    photoWrap.style.borderRadius = '50%';
    photoWrap.style.overflow = 'hidden';
    photoWrap.style.width = '88px';
    photoWrap.style.height = '88px';
    photoWrap.style.flexShrink = '0';
    const img = photoWrap.querySelector('img');
    if (img) {
      img.style.borderRadius = '50%';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = img.src?.includes('student-avatar') ? 'contain' : 'cover';
    }
  }

  clone.querySelectorAll('[data-report-stat-card]').forEach((card) => {
    card.style.minHeight = '58px';
    card.querySelectorAll('p').forEach((p) => {
      p.style.overflow = 'visible';
      p.style.textOverflow = 'unset';
      p.style.whiteSpace = 'normal';
    });
  });

  enforceTableHeaderStyles(clone);
}

/**
 * Export the modern report card DOM to a single-page A4 PDF (matches on-screen design).
 */
export async function exportReportCardToPdf(element, filename = 'student-report.pdf') {
  if (!element) throw new Error('Report element not found');

  const source = element.querySelector(REPORT_ROOT_SELECTOR) || element;
  await waitForReportQr(source);
  await waitForImages(source);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const chartRaster = rasterizeTrendChart(source);

  const clone = source.cloneNode(true);
  clone.setAttribute('data-report-pdf-clone', '1');
  clone.style.cssText = [
    'position:fixed',
    'left:-14000px',
    'top:0',
    'z-index:-1',
    `width:${CAPTURE_WIDTH_PX}px`,
    'max-width:none',
    'margin:0',
    'background:#ffffff',
    'box-sizing:border-box',
    'box-shadow:none',
    'border-radius:0',
    'overflow:visible',
  ].join(';');

  injectPdfCaptureStyles(clone);
  document.body.appendChild(clone);
  syncCloneImages(source, clone);
  replaceCloneTrendChart(clone, chartRaster);
  enforcePdfVisualFixes(clone);

  try {
    await inlineImagesForPdf(clone);
    await waitForImages(clone);
    enforceTableHeaderStyles(clone);
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        html2canvasOncloneForExport('[data-report-pdf-clone]')(clonedDoc);
        const root = clonedDoc.querySelector('[data-report-pdf-clone]');
        if (root) enforceTableHeaderStyles(root);
      },
    });

    if (!canvas?.width || !canvas.height) {
      throw new Error('Could not render report. Try Print instead.');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 4;
    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2;

    const naturalW = contentW;
    const naturalH = (canvas.height * naturalW) / canvas.width;
    const fitScale = naturalH > contentH ? contentH / naturalH : 1;
    const finalW = naturalW * fitScale;
    const finalH = naturalH * fitScale;
    const x = margin + (contentW - finalW) / 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, margin, finalW, finalH, undefined, 'FAST');
    pdf.save(filename);
  } finally {
    clone.remove();
  }
}

/** Trigger browser print for report modal — only the card is visible (see studentMarksReports.css). */
export function printReportCard() {
  document.body.classList.add('report-print-active');
  const cleanup = () => {
    document.body.classList.remove('report-print-active');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
