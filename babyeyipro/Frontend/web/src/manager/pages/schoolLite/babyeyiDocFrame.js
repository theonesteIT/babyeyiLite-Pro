/**
 * Official Babyeyi page frame — navy + amber border for View, Print, and PDF.
 * Typography tuned for ~2 A4 pages (3 when schools have long content).
 */

import { sumPaidAtSchoolTotal } from "./babyeyiWizardHelpers";

export const BABYEYI_DOC_FONT = '"Montserrat", sans-serif';

/** Shared compact sizes — view, print, and PDF HTML builders. */
export const BABYEYI_DOC_TYPO = {
  schoolNamePx: 13,
  headingPx: 11,
  bodyPx: 10,
  metaPx: 9,
  descPx: 9,
  tableHeadPx: 10,
  tableCellPx: 10,
  tableTotalPx: 11,
  lineHeight: 1.4,
  sectionGapPx: 12,
  headingGapPx: 8,
  logoPx: 84,
  otherLogoPx: 76,
  headerPad: "12px 28px 10px",
  bodyPad: "12px 28px 14px",
  rootPad: "14px 18px",
  cellPad: "3px 8px",
  thPad: "4px 8px",
  authTitlePx: 11,
  authLabelPx: 8,
  totalPayTitlePx: 10,
  totalPayAmountPx: 13,
  qrPx: 52,
};

export const BABYEYI_DOC_ROOT_STYLE =
  `width:794px;max-width:100%;background:#fff;font-family:${BABYEYI_DOC_FONT};color:#1e293b;position:relative;box-sizing:border-box;padding:${BABYEYI_DOC_TYPO.rootPad};font-size:${BABYEYI_DOC_TYPO.bodyPx}px;line-height:${BABYEYI_DOC_TYPO.lineHeight};-webkit-print-color-adjust:exact;print-color-adjust:exact`;

export const BABYEYI_DOC_FRAME_PRINT_CSS = `
  @page { size: A4 portrait; margin: 8mm; }
  #babyeyi-pdf-doc { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: ${BABYEYI_DOC_TYPO.bodyPx}px !important; line-height: ${BABYEYI_DOC_TYPO.lineHeight} !important; padding: ${BABYEYI_DOC_TYPO.rootPad} !important; }
  [data-babyeyi-doc-frame] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #babyeyi-pdf-header { padding: ${BABYEYI_DOC_TYPO.headerPad} !important; }
  #babyeyi-pdf-body { padding: ${BABYEYI_DOC_TYPO.bodyPad} !important; }
  [data-babyeyi-pdf-section] { margin-bottom: ${BABYEYI_DOC_TYPO.sectionGapPx}px !important; }
  #babyeyi-pdf-doc table { font-size: ${BABYEYI_DOC_TYPO.tableCellPx}px !important; }
  #babyeyi-pdf-doc th { padding: ${BABYEYI_DOC_TYPO.thPad} !important; font-size: ${BABYEYI_DOC_TYPO.tableHeadPx}px !important; }
  #babyeyi-pdf-doc td { padding: ${BABYEYI_DOC_TYPO.cellPad} !important; font-size: ${BABYEYI_DOC_TYPO.tableCellPx}px !important; }
  #babyeyi-pdf-auth-block { margin-top: 10px !important; page-break-inside: avoid; break-inside: avoid; }
`;

/** React inline styles for OfficialDoc (view modal). */
export const BABYEYI_DOC_REACT_STYLES = {
  heading: {
    fontSize: `${BABYEYI_DOC_TYPO.headingPx}px`,
    fontWeight: 700,
    color: "#1e3a5f",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontFamily: BABYEYI_DOC_FONT,
  },
  body: {
    fontSize: `${BABYEYI_DOC_TYPO.bodyPx}px`,
    color: "#1e293b",
    lineHeight: BABYEYI_DOC_TYPO.lineHeight,
    fontFamily: BABYEYI_DOC_FONT,
  },
  label: {
    fontSize: `${BABYEYI_DOC_TYPO.metaPx}px`,
    color: "#64748b",
    fontWeight: 600,
    fontFamily: BABYEYI_DOC_FONT,
  },
  th: {
    padding: BABYEYI_DOC_TYPO.thPad,
    fontSize: `${BABYEYI_DOC_TYPO.tableHeadPx}px`,
    fontWeight: 700,
    color: "#1e3a5f",
    borderBottom: "2px solid #1e3a5f",
    textAlign: "left",
    background: "transparent",
    fontFamily: BABYEYI_DOC_FONT,
  },
  td: {
    padding: BABYEYI_DOC_TYPO.cellPad,
    fontSize: `${BABYEYI_DOC_TYPO.tableCellPx}px`,
    color: "#1e293b",
    borderBottom: "1px solid #e2e8f0",
    background: "transparent",
    fontFamily: BABYEYI_DOC_FONT,
  },
  section: { marginBottom: `${BABYEYI_DOC_TYPO.sectionGapPx}px` },
};

export function babyeyiDocHeadingInline(extra = "") {
  return `font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.headingPx}px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.04em;${extra}`;
}

export function babyeyiDocBodyInline(extra = "") {
  return `font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.bodyPx}px;color:#1e293b;line-height:${BABYEYI_DOC_TYPO.lineHeight};${extra}`;
}

export function babyeyiDocThInline(extra = "") {
  return `padding:${BABYEYI_DOC_TYPO.thPad};font-size:${BABYEYI_DOC_TYPO.tableHeadPx}px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent;font-family:${BABYEYI_DOC_FONT};${extra}`;
}

export function babyeyiDocTdInline(extra = "") {
  return `padding:${BABYEYI_DOC_TYPO.cellPad};font-size:${BABYEYI_DOC_TYPO.tableCellPx}px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent;font-family:${BABYEYI_DOC_FONT};${extra}`;
}

export function babyeyiDocSectionInline() {
  return `margin-bottom:${BABYEYI_DOC_TYPO.sectionGapPx}px`;
}

export function babyeyiDocHeadingBlock(title) {
  return `<div style="padding-bottom:3px;margin-bottom:${BABYEYI_DOC_TYPO.headingGapPx}px;margin-top:12px;font-family:${BABYEYI_DOC_FONT}"><span style="${babyeyiDocHeadingInline()}">${title}</span></div>`;
}

export function babyeyiDocDescriptionLineStyle() {
  return `font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.descPx}px;color:#64748b;margin:0 0 1px;line-height:${BABYEYI_DOC_TYPO.lineHeight};letter-spacing:0.01em;font-weight:500`;
}

function dotGroup(color, vertical = false) {
  const margin = vertical ? "2px 0" : "0 2px";
  return [0, 1, 2]
    .map(
      () =>
        `<span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${color};margin:${margin}"></span>`,
    )
    .join("");
}

export function buildBabyeyiDocFrameDecorHtml() {
  return `
<div data-babyeyi-doc-frame aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden">
  <div style="position:absolute;inset:10px;border:2px solid #1e3a5f;border-radius:16px"></div>
  <div style="position:absolute;inset:14px;border:1px solid rgba(254,191,16,0.82);border-radius:12px"></div>
  <div style="position:absolute;top:10px;left:72px;right:18px;height:2px;background:linear-gradient(90deg,#FEBF10 0%,#FEBF10 42%,transparent 42%)"></div>
  <div style="position:absolute;left:10px;top:72px;bottom:72px;width:2px;background:linear-gradient(180deg,#FEBF10 0%,#FEBF10 32%,transparent 32%)"></div>
  <div style="position:absolute;top:16px;right:22px;display:flex;flex-direction:row;align-items:center">${dotGroup("#FEBF10")}</div>
  <div style="position:absolute;bottom:16px;left:22px;display:flex;flex-direction:row;align-items:center">${dotGroup("#FEBF10")}</div>
  <div style="position:absolute;top:38%;left:14px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center">${dotGroup("#FEBF10", true)}</div>
  <div style="position:absolute;top:62%;right:14px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center">${dotGroup("#1e3a5f", true)}</div>
</div>`;
}

export function wrapBabyeyiDocHtml(innerHtml) {
  return `<div id="babyeyi-pdf-doc" style="${BABYEYI_DOC_ROOT_STYLE}">${buildBabyeyiDocFrameDecorHtml()}<div data-babyeyi-doc-content style="position:relative;z-index:1;font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.bodyPx}px;line-height:${BABYEYI_DOC_TYPO.lineHeight}">${innerHtml}</div></div>`;
}

/** District + sector on one horizontal line (no Republic / NESA line). */
export function buildBabyeyiDistrictSectorHtml(rec, T = {}) {
  const district = rec?.district || "—";
  const sector = rec?.sector || "—";
  const districtLabel = T.district || "District";
  const sectorLabel = T.sector || "Sector";
  return `<p style="font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.metaPx}px;color:#64748b;margin:0 0 6px;line-height:${BABYEYI_DOC_TYPO.lineHeight}"><strong style="color:#1e3a5f">${districtLabel}:</strong> ${district}<span style="margin:0 8px;color:#cbd5e1">|</span><strong style="color:#1e3a5f">${sectorLabel}:</strong> ${sector}</p>`;
}

/** Shared PDF/print header: school logo · description · other logo. */
export function buildBabyeyiPdfHeaderHtml({
  rec,
  T = {},
  schoolLogoHtml,
  otherLogoHtml,
  schoolDescBlock = "",
  classHeaderHtml = "",
  metaHtml = "",
}) {
  const districtSector = buildBabyeyiDistrictSectorHtml(rec, T);
  const logo = BABYEYI_DOC_TYPO.logoPx;
  const schoolNameHtml = `<h1 style="font-family:${BABYEYI_DOC_FONT};font-size:${BABYEYI_DOC_TYPO.schoolNamePx}px;font-weight:700;color:#1e3a5f;margin:0 0 4px;text-transform:uppercase;letter-spacing:.03em;line-height:${BABYEYI_DOC_TYPO.lineHeight}">${rec.schoolName || ""}</h1>`;
  return `<div id="babyeyi-pdf-header" style="padding:${BABYEYI_DOC_TYPO.headerPad};border-bottom:2px solid #1e3a5f;font-family:${BABYEYI_DOC_FONT}"><div style="display:flex;align-items:flex-start;gap:14px"><div style="flex-shrink:0;width:${logo}px;height:${logo}px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden">${schoolLogoHtml}</div><div style="flex:1;text-align:left;min-width:0">${schoolNameHtml}${schoolDescBlock}${districtSector}${classHeaderHtml}<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:4px">${metaHtml}</div></div><div style="flex-shrink:0;width:${logo}px;height:${logo}px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml || ""}</div></div></div>`;
}

export const BABYEYI_DOC_CONTENT_STYLE = { position: "relative", zIndex: 1 };

/** Parent summary: total only for fees + requirements paid at school (view/PDF HTML). */
export function buildBabyeyiTotalPaymentsSectionHtml({
  payments = [],
  requirements = [],
  T = {},
}) {
  const total = sumPaidAtSchoolTotal(payments, requirements);
  if (!total) return "";
  const title = T.secTotalPayments || "Total Paid at School Account";
  return `<div data-babyeyi-pdf-section="total-payments" style="${babyeyiDocSectionInline()}"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border:2px solid #1e3a5f;border-radius:8px;background:#f8fafc;font-family:${BABYEYI_DOC_FONT}"><span style="font-size:${BABYEYI_DOC_TYPO.totalPayTitlePx}px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.04em">${title}</span><span style="font-size:${BABYEYI_DOC_TYPO.totalPayAmountPx}px;font-weight:700;font-family:monospace;color:#1e3a5f">RWF ${total.toLocaleString()}</span></div></div>`;
}

/** Apply compact spacing on a live DOM node before PDF capture. */
export function applyBabyeyiCompactDocLayout(root) {
  if (!root) return;
  const doc = root.querySelector?.("#babyeyi-pdf-doc") || root;
  doc.style.padding = BABYEYI_DOC_TYPO.rootPad;
  doc.style.fontSize = `${BABYEYI_DOC_TYPO.bodyPx}px`;
  doc.style.lineHeight = String(BABYEYI_DOC_TYPO.lineHeight);
  const header = doc.querySelector?.("#babyeyi-pdf-header");
  if (header) header.style.padding = BABYEYI_DOC_TYPO.headerPad;
  const body = doc.querySelector?.("#babyeyi-pdf-body");
  if (body) body.style.padding = BABYEYI_DOC_TYPO.bodyPad;
  doc.querySelectorAll?.("[data-babyeyi-pdf-section]").forEach((el) => {
    el.style.marginBottom = `${BABYEYI_DOC_TYPO.sectionGapPx}px`;
  });
  const auth = doc.querySelector?.("#babyeyi-pdf-auth-block");
  if (auth) auth.style.marginTop = "10px";
}
