/**
 * Official Babyeyi page frame — navy + amber border for View, Print, and PDF.
 */

import { sumPaidAtSchoolTotal } from "./babyeyiWizardHelpers";

export const BABYEYI_DOC_FONT = '"Montserrat", sans-serif';

export const BABYEYI_DOC_ROOT_STYLE =
  `width:794px;max-width:100%;background:#fff;font-family:${BABYEYI_DOC_FONT};color:#1e293b;position:relative;box-sizing:border-box;padding:22px 26px;-webkit-print-color-adjust:exact;print-color-adjust:exact`;

export const BABYEYI_DOC_FRAME_PRINT_CSS = `
  #babyeyi-pdf-doc { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  [data-babyeyi-doc-frame] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

function dotGroup(color, vertical = false) {
  const margin = vertical ? "3px 0" : "0 3px";
  return [0, 1, 2]
    .map(
      () =>
        `<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:${color};margin:${margin}"></span>`,
    )
    .join("");
}

export function buildBabyeyiDocFrameDecorHtml() {
  return `
<div data-babyeyi-doc-frame aria-hidden="true" style="position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden">
  <div style="position:absolute;inset:12px;border:2px solid #1e3a5f;border-radius:20px"></div>
  <div style="position:absolute;inset:17px;border:1px solid rgba(254,191,16,0.82);border-radius:15px"></div>
  <div style="position:absolute;top:12px;left:84px;right:22px;height:2px;background:linear-gradient(90deg,#FEBF10 0%,#FEBF10 42%,transparent 42%)"></div>
  <div style="position:absolute;left:12px;top:84px;bottom:84px;width:2px;background:linear-gradient(180deg,#FEBF10 0%,#FEBF10 32%,transparent 32%)"></div>
  <div style="position:absolute;top:20px;right:26px;display:flex;flex-direction:row;align-items:center">${dotGroup("#FEBF10")}</div>
  <div style="position:absolute;bottom:20px;left:26px;display:flex;flex-direction:row;align-items:center">${dotGroup("#FEBF10")}</div>
  <div style="position:absolute;top:38%;left:18px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center">${dotGroup("#FEBF10", true)}</div>
  <div style="position:absolute;top:62%;right:18px;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center">${dotGroup("#1e3a5f", true)}</div>
</div>`;
}

export function wrapBabyeyiDocHtml(innerHtml) {
  return `<div id="babyeyi-pdf-doc" style="${BABYEYI_DOC_ROOT_STYLE}">${buildBabyeyiDocFrameDecorHtml()}<div data-babyeyi-doc-content style="position:relative;z-index:1;font-family:${BABYEYI_DOC_FONT}">${innerHtml}</div></div>`;
}

/** District + sector on one horizontal line (no Republic / NESA line). */
export function buildBabyeyiDistrictSectorHtml(rec, T = {}) {
  const district = rec?.district || "—";
  const sector = rec?.sector || "—";
  const districtLabel = T.district || "District";
  const sectorLabel = T.sector || "Sector";
  return `<p style="font-family:${BABYEYI_DOC_FONT};font-size:11px;color:#64748b;margin:0 0 8px;line-height:1.35"><strong style="color:#1e3a5f">${districtLabel}:</strong> ${district}<span style="margin:0 10px;color:#cbd5e1">|</span><strong style="color:#1e3a5f">${sectorLabel}:</strong> ${sector}</p>`;
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
  const schoolNameHtml = `<h1 style="font-family:${BABYEYI_DOC_FONT};font-size:16px;font-weight:700;color:#1e3a5f;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em;line-height:1.35">${rec.schoolName || ""}</h1>`;
  return `<div id="babyeyi-pdf-header" style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f;font-family:${BABYEYI_DOC_FONT}"><div style="display:flex;align-items:flex-start;gap:20px"><div style="flex-shrink:0;width:110px;height:110px;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden">${schoolLogoHtml}</div><div style="flex:1;text-align:left;min-width:0">${schoolNameHtml}${schoolDescBlock}${districtSector}${classHeaderHtml}<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:6px">${metaHtml}</div></div><div style="flex-shrink:0;width:110px;height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml || ""}</div></div></div>`;
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
  const title = T.secTotalPayments || "Paid at School Account";
  return `<div data-babyeyi-pdf-section="total-payments" style="margin-bottom:22px"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;border:2px solid #1e3a5f;border-radius:10px;background:#f8fafc;font-family:${BABYEYI_DOC_FONT}"><span style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.04em">${title}</span><span style="font-size:18px;font-weight:700;font-family:monospace;color:#1e3a5f">RWF ${total.toLocaleString()}</span></div></div>`;
}
