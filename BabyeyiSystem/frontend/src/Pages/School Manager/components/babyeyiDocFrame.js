/**
 * Official Babyeyi page frame — navy + amber border for View, Print, and PDF.
 */

export const BABYEYI_DOC_ROOT_STYLE =
  "width:794px;max-width:100%;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1e293b;position:relative;box-sizing:border-box;padding:22px 26px;-webkit-print-color-adjust:exact;print-color-adjust:exact";

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
  return `<div id="babyeyi-pdf-doc" style="${BABYEYI_DOC_ROOT_STYLE}">${buildBabyeyiDocFrameDecorHtml()}<div data-babyeyi-doc-content style="position:relative;z-index:1">${innerHtml}</div></div>`;
}

export const BABYEYI_DOC_CONTENT_STYLE = { position: "relative", zIndex: 1 };
