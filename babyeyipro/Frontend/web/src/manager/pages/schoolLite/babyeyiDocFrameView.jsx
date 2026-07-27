import { buildBabyeyiDocFrameDecorHtml, BABYEYI_DOC_CONTENT_STYLE, BABYEYI_DOC_FONT, BABYEYI_DOC_TYPO } from "./babyeyiDocFrame.js";
import {
  formatSchoolDescriptionHtml,
  parseSchoolDescriptionLines,
  sumPaidAtSchoolTotal,
} from "./babyeyiWizardHelpers";
import { buildBabyeyiDocumentClassHeaderHtml } from "../../../utils/classStreamGroups";

const ROOT_STYLE = {
  width: 794,
  maxWidth: "100%",
  background: "#fff",
  fontFamily: BABYEYI_DOC_FONT,
  color: "#1e293b",
  position: "relative",
  boxSizing: "border-box",
  padding: BABYEYI_DOC_TYPO.rootPad,
  fontSize: `${BABYEYI_DOC_TYPO.bodyPx}px`,
  lineHeight: BABYEYI_DOC_TYPO.lineHeight,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

export function BabyeyiDocumentHeader({
  rec,
  T,
  schoolLogoB64,
  otherLogoB64,
  levelLabel,
  classesArr = [],
}) {
  const showDesc =
    rec.includeSchoolDescription !== false &&
    parseSchoolDescriptionLines(rec.schoolDescription).length > 0;
  const classLabel = T.classLabel || "Class";
  const logoPx = BABYEYI_DOC_TYPO.logoPx;
  const otherPx = BABYEYI_DOC_TYPO.otherLogoPx;

  return (
    <div
      id="babyeyi-pdf-header"
      style={{
        padding: BABYEYI_DOC_TYPO.headerPad,
        borderBottom: "2px solid #1e3a5f",
        fontFamily: BABYEYI_DOC_FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <div
          style={{
            flexShrink: 0,
            width: `${logoPx}px`,
            height: `${logoPx}px`,
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {schoolLogoB64 ? (
            <img
              src={schoolLogoB64}
              style={{ width: `${logoPx}px`, height: `${logoPx}px`, objectFit: "contain" }}
              alt="School logo"
            />
          ) : (
            <span
              style={{
                fontSize: "7px",
                color: "#64748b",
                textAlign: "center",
                fontWeight: 700,
                padding: "4px",
                fontFamily: BABYEYI_DOC_FONT,
              }}
            >
              {T.schoolLogoPlaceholder || "SCHOOL LOGO"}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            textAlign: "center",
            minWidth: 0,
          }}
        >
          <h1
            style={{
              fontFamily: BABYEYI_DOC_FONT,
              fontSize: `${BABYEYI_DOC_TYPO.schoolNamePx}px`,
              fontWeight: 700,
              color: "#1e3a5f",
              margin: "0 0 4px",
              textTransform: "uppercase",
              letterSpacing: ".03em",
              lineHeight: BABYEYI_DOC_TYPO.lineHeight,
              textAlign: "center",
            }}
          >
            {rec.schoolName}
          </h1>
          {showDesc && (
            <div
              style={{
                margin: "0 0 4px",
                fontSize: `${BABYEYI_DOC_TYPO.descPx}px`,
                lineHeight: BABYEYI_DOC_TYPO.lineHeight,
                color: "#64748b",
                textAlign: "center",
              }}
              dangerouslySetInnerHTML={{
                __html: formatSchoolDescriptionHtml(rec.schoolDescription),
              }}
            />
          )}
          <p
            style={{
              fontFamily: BABYEYI_DOC_FONT,
              fontSize: `${BABYEYI_DOC_TYPO.metaPx}px`,
              color: "#64748b",
              margin: "0 0 6px",
              lineHeight: BABYEYI_DOC_TYPO.lineHeight,
              textAlign: "center",
            }}
          >
            <strong style={{ color: "#1e3a5f" }}>{T.district}:</strong> {rec.district || "—"}
            <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
            <strong style={{ color: "#1e3a5f" }}>{T.sector}:</strong> {rec.sector || "—"}
          </p>
          {classesArr.length > 0 && (
            <div
              dangerouslySetInnerHTML={{
                __html: buildBabyeyiDocumentClassHeaderHtml(classesArr, classLabel),
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "4px",
              fontFamily: BABYEYI_DOC_FONT,
            }}
          >
            {[[T.academicYear, rec.academicYear], [T.termLabel, rec.term], [T.levelLabel, levelLabel]].map(
              ([l, v], i) => (
                <span key={i} style={{ fontSize: `${BABYEYI_DOC_TYPO.metaPx}px`, color: "#1e293b", lineHeight: BABYEYI_DOC_TYPO.lineHeight }}>
                  <strong style={{ color: "#1e3a5f" }}>{l}:</strong> {v || "—"}
                </span>
              ),
            )}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            width: `${logoPx}px`,
            height: `${logoPx}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {otherLogoB64 && (
            <img
              src={otherLogoB64}
              style={{ width: `${otherPx}px`, height: `${otherPx}px`, objectFit: "contain" }}
              alt="Other logo"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function BabyeyiTotalPaymentsSection({ payments = [], requirements = [], T }) {
  const total = sumPaidAtSchoolTotal(payments, requirements);
  if (!total) return null;

  return (
    <div data-babyeyi-pdf-section="total-payments" style={{ marginBottom: `${BABYEYI_DOC_TYPO.sectionGapPx}px` }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 14px",
          border: "2px solid #1e3a5f",
          borderRadius: "8px",
          background: "#f8fafc",
          fontFamily: BABYEYI_DOC_FONT,
        }}
      >
        <span
          style={{
            fontSize: `${BABYEYI_DOC_TYPO.totalPayTitlePx}px`,
            fontWeight: 700,
            color: "#1e3a5f",
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          {T.secTotalPayments || "Total Paid at School Account"}
        </span>
        <span
          style={{
            fontSize: `${BABYEYI_DOC_TYPO.totalPayAmountPx}px`,
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#1e3a5f",
            flexShrink: 0,
          }}
        >
          RWF {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

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
