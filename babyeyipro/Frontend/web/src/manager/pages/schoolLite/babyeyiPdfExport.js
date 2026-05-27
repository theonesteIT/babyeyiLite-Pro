/**
 * Babyeyi PDF export — keep AUTHORIZATION & SIGNATURES on one page (no mid-section cut).
 */

export const BABYEYI_DOC_WIDTH_PX = 794;
export const BABYEYI_A4_PAGE_HEIGHT_PX = Math.round((BABYEYI_DOC_WIDTH_PX * 297) / 210);
export const BABYEYI_PDF_AUTH_SELECTOR = "#babyeyi-pdf-auth-block";

function offsetTopWithinRoot(el, root) {
  if (!el || !root) return 0;
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return Math.max(0, Math.round(elRect.top - rootRect.top));
}

/** Insert white spacer so the auth block starts at the top of a new PDF page when needed. */
export function insertPdfPageBreakSpacerBefore(
  root,
  selector = BABYEYI_PDF_AUTH_SELECTOR,
  extraGap = 48,
) {
  const el = root?.querySelector?.(selector);
  if (!el?.parentNode) return false;

  root.querySelectorAll("[data-babyeyi-pdf-page-spacer]").forEach((n) => n.remove());

  const pageH = BABYEYI_A4_PAGE_HEIGHT_PX;
  const top = offsetTopWithinRoot(el, root);
  const blockH = el.offsetHeight || el.getBoundingClientRect().height;
  const usedOnPage = top % pageH;
  const spaceLeft = pageH - usedOnPage;

  if (usedOnPage > 0 && spaceLeft < blockH + extraGap) {
    const spacer = document.createElement("div");
    spacer.setAttribute("data-babyeyi-pdf-page-spacer", "1");
    spacer.style.cssText = `height:${spaceLeft}px;width:100%;background:#fff;flex-shrink:0;`;
    el.parentNode.insertBefore(spacer, el);
    return true;
  }
  return false;
}

export async function waitForPdfImages(root, timeoutMs = 4000) {
  if (!root) return;
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.onload = done;
          img.onerror = done;
          setTimeout(done, timeoutMs);
        }),
    ),
  );
  await new Promise((r) => setTimeout(r, 120));
}

export async function prepareBabyeyiPdfRoot(root, selector = BABYEYI_PDF_AUTH_SELECTOR) {
  await waitForPdfImages(root);
  insertPdfPageBreakSpacerBefore(root, selector);
  await new Promise((r) => setTimeout(r, 100));
  insertPdfPageBreakSpacerBefore(root, selector);
}

export function measurePdfProtectedRanges(
  root,
  selector = BABYEYI_PDF_AUTH_SELECTOR,
  scale = 2,
) {
  const el = root?.querySelector?.(selector);
  if (!el) return [];
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const top = Math.max(0, Math.floor((elRect.top - rootRect.top) * scale));
  const bottom = Math.ceil((elRect.bottom - rootRect.top) * scale);
  if (bottom <= top) return [];
  return [{ top, bottom }];
}

export function computePdfSliceEnds(canvasHeight, canvasWidth, protectedRanges = []) {
  const pW = 210;
  const pH = 297;
  const imgH = (canvasHeight / canvasWidth) * pW;
  const pageHPx = Math.max(1, Math.ceil((pH / imgH) * canvasHeight));
  const ends = [];
  let y = 0;

  while (y < canvasHeight) {
    let sliceEnd = Math.min(y + pageHPx, canvasHeight);

    for (const range of protectedRanges) {
      const { top, bottom } = range;
      if (top == null || bottom == null || bottom <= top) continue;
      const blockH = bottom - top;
      const crosses = y < bottom && sliceEnd > top && !(y >= top && sliceEnd <= bottom);
      if (!crosses) continue;

      if (blockH <= pageHPx) {
        if (y < top && sliceEnd > top) {
          sliceEnd = top;
        } else if (y >= top && y < bottom) {
          sliceEnd = Math.min(bottom, canvasHeight);
        }
      }
    }

    if (sliceEnd <= y) {
      sliceEnd = Math.min(y + pageHPx, canvasHeight);
    }
    if (sliceEnd <= y) break;
    ends.push(sliceEnd);
    y = sliceEnd;
  }

  return ends;
}

export function addCanvasToPdfAndSave(canvas, filename, options = {}) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pW = 210;
  const pH = 297;
  const imgH = (canvas.height / canvas.width) * pW;
  const pngFull = canvas.toDataURL("image/png");
  const protectedRanges = options.protectedRanges || [];

  if (imgH <= pH) {
    pdf.addImage(pngFull, "PNG", 0, 0, pW, imgH);
  } else {
    const sliceEnds = computePdfSliceEnds(canvas.height, canvas.width, protectedRanges);
    let srcYPx = 0;
    sliceEnds.forEach((endPx, page) => {
      if (page > 0) pdf.addPage();
      const sliceHPx = endPx - srcYPx;
      if (sliceHPx <= 0) return;
      const sl = document.createElement("canvas");
      sl.width = canvas.width;
      sl.height = sliceHPx;
      sl.getContext("2d").drawImage(
        canvas,
        0,
        srcYPx,
        canvas.width,
        sliceHPx,
        0,
        0,
        canvas.width,
        sliceHPx,
      );
      pdf.addImage(
        sl.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pW,
        (sliceHPx / canvas.height) * imgH,
      );
      srcYPx = endPx;
    });
  }
  pdf.save(filename);
}

/** Full pipeline: spacer + html2canvas + smart page breaks. */
export async function renderBabyeyiPdfFromRoot(root, rootId, filename, html2canvasOptions) {
  const scale = html2canvasOptions?.scale || 2;
  await prepareBabyeyiPdfRoot(root);
  const protectedRanges = measurePdfProtectedRanges(root, BABYEYI_PDF_AUTH_SELECTOR, scale);
  const canvas = await window.html2canvas(root, html2canvasOptions);
  addCanvasToPdfAndSave(canvas, filename, { protectedRanges });
}

export function buildBabyeyiAuthBlockHtml({ T, rec, today, sigB64, stampB64, qrB64 }) {
  const qrBlock = qrB64
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><div style="background:white;border:1px solid #e2e8f0;padding:6px;border-radius:6px"><img src="${qrB64}" style="width:80px;height:80px;object-fit:contain;display:block"/></div><p style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0">${T.sigScanVerify}</p>${rec.docId ? `<p style="font-size:10px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.docId}</p>` : ""}</div>`
    : `<div style="width:80px;height:80px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:20px;opacity:.1">&#9635;</span></div>`;

  const footerLeft = T.docFooterLeft != null ? T.docFooterLeft : "Doc";

  return `<div id="babyeyi-pdf-auth-block" style="margin-top:20px;padding-top:8px;page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid">
    <div style="margin-bottom:18px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px">
        <span style="font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${T.secAuth}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px">
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center;min-height:120px;box-sizing:border-box">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigHeadTeacher}</p>
          <div style="height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">${sigB64 ? `<img src="${sigB64}" style="max-height:48px;max-width:140px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}</div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sigB64 ? T.sigSigned : T.sigRequired}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:120px;box-sizing:border-box">${qrBlock}</div>
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center;min-height:120px;box-sizing:border-box">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${T.sigStamp}</p>
          <div style="width:80px;height:80px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 6px">${stampB64 ? `<img src="${stampB64}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:22px;opacity:.08">&#128271;</span>`}</div>
          <p style="font-size:11px;color:#94a3b8;margin:0">${T.sigCachet}</p>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid #1e3a5f;padding:8px 40px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;color:#64748b">${rec.schoolName || ""} · ${rec.district || ""}</span>
      <span style="font-size:11px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${T.docOfficial}</span>
      <span style="font-size:11px;color:#64748b">${footerLeft} ${rec.docId || ""} · ${today}</span>
    </div>
    <div style="height:3px;background:#1e3a5f"></div>
  </div>`;
}
