import { jsPDF } from 'jspdf';
import { html2canvasOncloneForExport } from './html2canvasExportFix';
import { inlineImagesForPdf } from './payslipAssets';

const CAPTURE_WIDTH_PX = 820;
const PAYSLIP_ROOT_SELECTOR = '#modern-payslip-document, #payslip-pdf-capture-root';

/**
 * Export payslip DOM as A4 portrait PDF.
 * Clones off-screen and inlines images so html2canvas is not blocked by CORS or modal overflow.
 */
export async function exportPayslipPdf(element, filename = 'payslip.pdf') {
  if (!element) {
    throw new Error('Payslip document is not ready. Open preview and try again.');
  }

  let html2canvas;
  try {
    const mod = await import('html2canvas');
    html2canvas = mod.default || mod;
  } catch (e) {
    throw new Error('PDF library failed to load. Run npm install in Frontend/web and restart the dev server.');
  }

  const clone = element.cloneNode(true);
  clone.id = 'payslip-pdf-capture-root';
  clone.style.cssText = [
    'position:fixed',
    'left:-12000px',
    'top:0',
    'z-index:-1',
    `width:${CAPTURE_WIDTH_PX}px`,
    'max-width:none',
    'margin:0',
    'background:#ffffff',
    'box-sizing:border-box',
  ].join(';');

  document.body.appendChild(clone);

  try {
    await inlineImagesForPdf(clone);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    let canvas;
    try {
      canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        onclone: html2canvasOncloneForExport(PAYSLIP_ROOT_SELECTOR),
      });
    } catch (renderErr) {
      const msg = String(renderErr?.message || renderErr || '');
      if (/oklch|unsupported color/i.test(msg)) {
        throw new Error('PDF export does not support Tailwind oklch colors. Refresh and try Download PDF again, or use Print.');
      }
      throw renderErr;
    }

    if (!canvas?.width || !canvas.height) {
      throw new Error('Could not render payslip. Try again or use Print.');
    }

    let imgData;
    try {
      imgData = canvas.toDataURL('image/png');
    } catch (encodeErr) {
      const msg = String(encodeErr?.message || encodeErr || '');
      if (/oklch|unsupported color/i.test(msg)) {
        throw new Error('PDF color export failed (oklch). Refresh the page and try again, or use Print.');
      }
      throw new Error('Could not encode payslip image. If the school logo is external, upload it again or use Print.');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const contentH = pageH - margin * 2;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < imgH) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin - offsetY, imgW, imgH);
      offsetY += contentH;
      pageIndex += 1;
    }

    pdf.save(filename);
  } finally {
    clone.remove();
  }
}

export function printPayslip(element) {
  if (!element) {
    window.print();
    return;
  }
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) {
    window.print();
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html><head>
      <title>Payslip</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 16px; font-family: Inter, sans-serif; background: #fff; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${element.outerHTML}</body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
