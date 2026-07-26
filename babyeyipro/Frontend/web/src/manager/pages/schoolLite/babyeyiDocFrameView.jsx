import { buildBabyeyiDocFrameDecorHtml, BABYEYI_DOC_CONTENT_STYLE } from "./babyeyiDocFrame.js";

const ROOT_STYLE = {
  width: 794,
  maxWidth: "100%",
  background: "#fff",
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: "#1e293b",
  position: "relative",
  boxSizing: "border-box",
  padding: "22px 26px",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

export default function BabyeyiDocFrame({ children, className = "", style = {} }) {
  return (
    <div id="babyeyi-pdf-doc" className={className} style={{ ...ROOT_STYLE, ...style }}>
      <div dangerouslySetInnerHTML={{ __html: buildBabyeyiDocFrameDecorHtml() }} />
      <div data-babyeyi-doc-content style={BABYEYI_DOC_CONTENT_STYLE}>
        {children}
      </div>
    </div>
  );
}
