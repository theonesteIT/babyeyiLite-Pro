import React from "react";
import { FileImage, FileCheck, ExternalLink, Download, X, FileText } from "lucide-react";
import { C, font } from "../utils/theme";

export default function DocViewerModal({ url, title, onClose }) {
  if (!url) return null;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  const isPdf   = /\.pdf(\?|$)/i.test(url);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 150,
      background: "rgba(26,18,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        width: "100%", maxWidth: 768, maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${C.goldBorder}`,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 20px", borderBottom: `1px solid ${C.goldBorder}`,
          background: C.goldBg, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isImage
              ? <FileImage style={{ width: 16, height: 16, color: C.goldDark }}/>
              : <FileCheck style={{ width: 16, height: 16, color: C.goldDark }}/>}
            <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 13, margin: 0, maxWidth: 260,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: font }}>
              {title || "Document"}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[
              { href: url, target: "_blank", icon: ExternalLink, label: "Open"     },
              { href: url, download: true,   icon: Download,     label: "Download" },
            ].map(({ href, target, download, icon: Icon, label }) => (
              <a key={label} href={href} target={target} download={download}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11, fontWeight: 700, color: C.goldDark,
                  padding: "6px 12px", borderRadius: 12,
                  border: `1px solid ${C.goldBorder}`, background: "white",
                  textDecoration: "none", fontFamily: font,
                }}>
                <Icon style={{ width: 12, height: 12 }}/> {label}
              </a>
            ))}
            <button onClick={onClose} style={{
              padding: 6, borderRadius: 10, background: "transparent", border: "none",
              cursor: "pointer", color: C.goldDark, display: "flex",
            }}>
              <X style={{ width: 16, height: 16 }}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: "auto", background: C.goldBgMid,
          padding: 16, display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 400,
        }}>
          {isImage ? (
            <img src={url} alt={title} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 16, boxShadow: "0 8px 32px rgba(26,18,0,0.12)", objectFit: "contain" }}/>
          ) : isPdf ? (
            <iframe src={url} title={title} style={{ width: "100%", height: "65vh", borderRadius: 16, border: `1px solid ${C.goldBorder}` }}/>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <FileText style={{ width: 48, height: 48, color: C.goldBorder, margin: "0 auto 12px" }}/>
              <p style={{ color: C.goldDark, fontWeight: 600, fontSize: 13, fontFamily: font }}>Preview not available</p>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.goldDark, fontSize: 13, fontFamily: font }}>
                Open file directly
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
