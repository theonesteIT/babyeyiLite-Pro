import React, { useRef } from "react";
import { Upload, X } from "lucide-react";
import { C, font } from "../utils/theme";
import { resolveUrl } from "../utils/helpers";

export default function AssetUploadField({ label, icon: Icon, fieldName, file, onFileChange, existingUrl }) {
  const inputRef   = useRef();
  const previewUrl = file ? URL.createObjectURL(file) : resolveUrl(existingUrl);
  const hasSomething = file || existingUrl;

  return (
    <div style={{
      border: `2px dashed ${hasSomething ? C.emeraldBord : C.goldBorder}`,
      borderRadius: 16, padding: 14, transition: "all 150ms",
      background: hasSomething ? C.emeraldBg : C.goldBg,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 14, height: 14, color: hasSomething ? C.emerald : C.goldDark }}/>
          <span style={{ fontSize: 10, fontWeight: 900, color: C.dark, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: font }}>
            {label}
          </span>
          {existingUrl && !file && (
            <span style={{
              fontSize: 9, padding: "1px 6px", background: C.emeraldBg,
              color: C.emeraldDark, border: `1px solid ${C.emeraldBord}`,
              borderRadius: 20, fontWeight: 700, fontFamily: font,
            }}>Saved</span>
          )}
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 10,
          background: `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
          color: C.gold, border: "none", cursor: "pointer", fontFamily: font,
        }}>
          <Upload style={{ width: 11, height: 11 }}/>
          {hasSomething ? "Change" : "Upload"}
        </button>
      </div>

      {previewUrl ? (
        <div style={{ position: "relative" }}>
          <img src={previewUrl} alt={label} style={{
            width: "100%", maxHeight: 80, objectFit: "contain",
            borderRadius: 10, border: `1px solid ${C.emeraldBord}`,
            background: "white", padding: 6,
          }}/>
          {file && (
            <button type="button" onClick={() => onFileChange(null)} style={{
              position: "absolute", top: 4, right: 4,
              width: 20, height: 20, background: C.red,
              color: "white", borderRadius: "50%", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <X style={{ width: 10, height: 10 }}/>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          height: 56, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 10, border: `1px solid ${C.goldBorder}`, background: "rgba(255,255,255,0.5)",
        }}>
          <p style={{ fontSize: 10, color: C.goldDeep, fontWeight: 600, fontFamily: font }}>
            No {label.toLowerCase()} uploaded
          </p>
        </div>
      )}

      <input ref={inputRef} type="file" name={fieldName} accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: "none" }} onChange={e => onFileChange(e.target.files?.[0] || null)}/>
    </div>
  );
}
