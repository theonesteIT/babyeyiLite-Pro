import { jsPDF } from 'jspdf';
import { html2canvasOncloneForExport } from '../../accountant_portal/frontend/src/utils/html2canvasExportFix';
import { inlineImagesForPdf } from './certificateAssets';

const CAPTURE_WIDTH_PX = 794;
const CERT_ROOT_SELECTOR = '[data-salary-certificate], #salary-certificate-pdf-capture';

const PDF_COMPACT_CSS = `
  #salary-certificate-pdf-capture {
    font-size: 10px !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  #salary-certificate-pdf-capture .cert-header {
    padding: 14px 18px 12px !important;
  }
  #salary-certificate-pdf-capture .cert-logo {
    width: 56px !important;
    height: 56px !important;
  }
  #salary-certificate-pdf-capture .cert-body {
    padding: 12px 16px !important;
  }
  #salary-certificate-pdf-capture .cert-section {
    margin-bottom: 0 !important;
  }
  #salary-certificate-pdf-capture .cert-footer {
    padding: 6px 12px !important;
  }
  #salary-certificate-pdf-capture table td,
  #salary-certificate-pdf-capture table th {
    padding-top: 4px !important;
    padding-bottom: 4px !important;
  }
`;

function prepareCertificateClone(clone) {
  clone.querySelectorAll('[data-cert-hide-pdf]').forEach((el) => el.remove());

  const style = document.createElement('style');
  style.textContent = PDF_COMPACT_CSS;
  clone.insertBefore(style, clone.firstChild);
}

/**
 * Export salary certificate as a single-page A4 PDF (scaled to fit).
 */
export async function downloadSalaryCertificatePdf(element, filename = 'salary-certificate.pdf') {
  if (!element) {
    throw new Error('Salary certificate is not ready. Wait for it to load and try again.');
  }

  let html2canvas;
  try {
    const mod = await import('html2canvas');
    html2canvas = mod.default || mod;
  } catch {
    throw new Error('PDF library failed to load. Refresh the page and try again.');
  }

  const clone = element.cloneNode(true);
  clone.id = 'salary-certificate-pdf-capture';
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
  ].join(';');

  clone.querySelectorAll('.print\\:hidden, [class*="print:hidden"]').forEach((el) => {
    el.remove();
  });

  prepareCertificateClone(clone);
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
        onclone: (clonedDoc) => {
          html2canvasOncloneForExport(CERT_ROOT_SELECTOR)(clonedDoc);
          const root = clonedDoc.getElementById('salary-certificate-pdf-capture');
          if (root) prepareCertificateClone(root);
        },
      });
    } catch (renderErr) {
      const msg = String(renderErr?.message || renderErr || '');
      if (/oklch|unsupported color/i.test(msg)) {
        throw new Error('PDF export does not support some colors. Refresh and try again, or use Print.');
      }
      throw renderErr;
    }

    if (!canvas?.width || !canvas.height) {
      throw new Error('Could not render certificate. Try again or use Print.');
    }

    let imgData;
    try {
      imgData = canvas.toDataURL('image/png');
    } catch {
      throw new Error('Could not encode certificate image. Try Print instead.');
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 4;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    let drawW = maxW;
    let drawH = (canvas.height * drawW) / canvas.width;

    if (drawH > maxH) {
      drawH = maxH;
      drawW = (canvas.width * drawH) / canvas.height;
    }

    const x = (pageW - drawW) / 2;
    const y = margin;

    pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
    pdf.save(filename);
  } finally {
    clone.remove();
  }
}
