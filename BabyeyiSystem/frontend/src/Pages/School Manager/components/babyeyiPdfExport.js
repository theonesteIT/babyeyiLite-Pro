/**
 * Babyeyi PDF export — exactly 2 A4 pages; Authorization stays on page 2 (not page 3).
 */

export const BABYEYI_DOC_WIDTH_PX = 794;
export const BABYEYI_A4_PAGE_HEIGHT_PX = Math.round((BABYEYI_DOC_WIDTH_PX * 297) / 210);
export const BABYEYI_PDF_AUTH_SELECTOR = "#babyeyi-pdf-auth-block";
export const BABYEYI_PDF_SECTION_SELECTOR = "[data-babyeyi-pdf-section]";
export const BABYEYI_PDF_HEADER_SELECTOR = "#babyeyi-pdf-header";
/** In-viewport but invisible — avoids html2canvas clipping tall off-screen nodes. */
export const BABYEYI_PDF_CAPTURE_HOST_STYLE =
  "position:fixed;top:0;left:0;width:794px;background:#fff;z-index:-9999;opacity:0;pointer-events:none;overflow:visible;";

export function measureBabyeyiDocHeight(root) {
  const docEl = root?.querySelector?.("#babyeyi-pdf-doc") || root;
  if (!docEl) return BABYEYI_A4_PAGE_HEIGHT_PX * 2;
  return Math.max(
    docEl.scrollHeight || 0,
    docEl.offsetHeight || 0,
    root?.scrollHeight || 0,
    root?.offsetHeight || 0,
    BABYEYI_A4_PAGE_HEIGHT_PX,
  );
}

export function babyeyiHtml2CanvasOptionsForRoot(root, baseOptions = {}) {
  const height = measureBabyeyiDocHeight(root);
  return {
    ...baseOptions,
    width: BABYEYI_DOC_WIDTH_PX,
    height,
    windowWidth: BABYEYI_DOC_WIDTH_PX,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
  };
}

function offsetTopWithinRoot(el, root) {
  if (!el || !root) return 0;
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return Math.max(0, Math.round(elRect.top - rootRect.top));
}

function elHeight(el) {
  if (!el) return 0;
  return Math.round(el.offsetHeight || el.getBoundingClientRect().height || 0);
}

function removePdfSpacers(root) {
  root?.querySelectorAll?.("[data-babyeyi-pdf-spacer]").forEach((n) => n.remove());
}

function createSpacer(heightPx) {
  const spacer = document.createElement("div");
  spacer.setAttribute("data-babyeyi-pdf-spacer", "1");
  spacer.style.cssText = `height:${Math.max(0, Math.round(heightPx))}px;width:100%;background:#fff;flex-shrink:0;`;
  return spacer;
}

function compactPdfSpacing(root) {
  root?.querySelectorAll?.(BABYEYI_PDF_SECTION_SELECTOR).forEach((el) => {
    el.style.marginBottom = "14px";
  });
  const auth = root?.querySelector?.(BABYEYI_PDF_AUTH_SELECTOR);
  if (auth) auth.style.marginTop = "12px";
  const body = root?.querySelector?.("#babyeyi-pdf-body");
  if (body) body.style.paddingBottom = "16px";
}

/** Clear legacy spacers — auth flows on the same page when content is short. */
export function layoutBabyeyiTwoPages(root) {
  if (!root) return false;
  removePdfSpacers(root);
  return !!root.querySelector(BABYEYI_PDF_AUTH_SELECTOR);
}

/** @deprecated Use layoutBabyeyiTwoPages — kept for callers that still import it. */
export function insertPdfPageBreakSpacerBefore(root, selector = BABYEYI_PDF_AUTH_SELECTOR) {
  layoutBabyeyiTwoPages(root);
  return !!root?.querySelector?.(selector);
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

export async function prepareBabyeyiPdfRoot(root) {
  await waitForPdfImages(root);
  layoutBabyeyiTwoPages(root);
}

export function measurePdfProtectedRanges(root, selector = BABYEYI_PDF_AUTH_SELECTOR, scale = 2) {
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

  if (canvasHeight <= pageHPx) return [canvasHeight];

  const ends = [];
  let y = 0;
  const maxPages = 2;

  while (y < canvasHeight && ends.length < maxPages) {
    let sliceEnd = Math.min(y + pageHPx, canvasHeight);

    for (const range of protectedRanges) {
      const { top, bottom } = range;
      if (top == null || bottom == null || bottom <= top) continue;
      const blockH = bottom - top;
      const crosses = y < bottom && sliceEnd > top && !(y >= top && sliceEnd <= bottom);
      if (!crosses) continue;

      if (blockH <= pageHPx) {
        if (y < top && sliceEnd > top) sliceEnd = top;
        else if (y >= top && y < bottom) sliceEnd = Math.min(bottom, canvasHeight);
      }
    }

    if (sliceEnd <= y) sliceEnd = Math.min(y + pageHPx, canvasHeight);
    if (sliceEnd <= y) break;
    ends.push(sliceEnd);
    y = sliceEnd;
  }

  const deduped = ends.filter((v, i) => i === 0 || v > ends[i - 1]);
  if (deduped.length === 1 && canvasHeight > pageHPx) {
    deduped.push(canvasHeight);
  }
  return deduped.filter((v) => v > 0);
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
      const sliceHPx = endPx - srcYPx;
      if (sliceHPx <= 0) return;
      if (page > 0) pdf.addPage();
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

/** Full pipeline: 2-page layout + html2canvas + smart page breaks. */
export async function renderBabyeyiPdfFromRoot(root, rootId, filename, html2canvasOptions) {
  const scale = html2canvasOptions?.scale || 2;
  await prepareBabyeyiPdfRoot(root);
  const captureOptions = babyeyiHtml2CanvasOptionsForRoot(root, html2canvasOptions);
  const protectedRanges = measurePdfProtectedRanges(root, BABYEYI_PDF_AUTH_SELECTOR, scale);
  const canvas = await window.html2canvas(root, captureOptions);
  addCanvasToPdfAndSave(canvas, filename, { protectedRanges });
}

export function buildBabyeyiAuthBlockHtml({ T, rec, today, sigB64, stampB64, qrB64 }) {
  const qrBlock = qrB64
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="background:white;border:1px solid #e2e8f0;padding:4px;border-radius:4px"><img src="${qrB64}" style="width:64px;height:64px;object-fit:contain;display:block"/></div><p style="font-size:9px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0">${T.sigScanVerify}</p>${rec.docId ? `<p style="font-size:9px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.docId}</p>` : ""}</div>`
    : `<div style="width:64px;height:64px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center"><span style="font-size:16px;opacity:.1">&#9635;</span></div>`;

  const footerLeft = T.docFooterLeft != null ? T.docFooterLeft : "Doc";

  return `<div id="babyeyi-pdf-auth-block" style="margin-top:14px;padding-top:4px;page-break-inside:avoid;break-inside:avoid;page-break-before:avoid;break-before:avoid;-webkit-column-break-inside:avoid">
    <div style="margin-bottom:10px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:4px;margin-bottom:8px">
        <span style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em">${T.secAuth}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
        <div style="border:1px solid #e2e8f0;padding:10px 8px;text-align:center;min-height:96px;box-sizing:border-box">
          <p style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 6px">${T.sigHeadTeacher}</p>
          <div style="height:44px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px">${sigB64 ? `<img src="${sigB64}" style="max-height:40px;max-width:120px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}</div>
          <p style="font-size:10px;color:#94a3b8;margin:2px 0 0">${sigB64 ? T.sigSigned : T.sigRequired}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:10px 8px;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:96px;box-sizing:border-box">${qrBlock}</div>
        <div style="border:1px solid #e2e8f0;padding:10px 8px;text-align:center;min-height:96px;box-sizing:border-box">
          <p style="font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 6px">${T.sigStamp}</p>
          <div style="width:64px;height:64px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 4px">${stampB64 ? `<img src="${stampB64}" style="width:60px;height:60px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:18px;opacity:.08">&#128271;</span>`}</div>
          <p style="font-size:10px;color:#94a3b8;margin:0">${T.sigCachet}</p>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid #1e3a5f;padding:6px 40px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:10px;color:#64748b">${rec.schoolName || ""} · ${rec.district || ""}</span>
      <span style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${T.docOfficial}</span>
      <span style="font-size:10px;color:#64748b">${footerLeft} ${rec.docId || ""} · ${today}</span>
    </div>
    <div style="height:3px;background:#1e3a5f"></div>
  </div>`;
}
