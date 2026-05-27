import React, { useState } from "react";
import { X, Check, ThumbsUp, ThumbsDown, Send, Loader2, AlertTriangle, PenLine, Stamp } from "lucide-react";
import { C, font, inp } from "../utils/theme";
import AssetUploadField from "./AssetUploadField";
import { apiFetchMultipart } from "../utils/api";

const fmt = (n) => Number(n || 0).toLocaleString();

export default function ActionModal({ action, item, onClose, onConfirm, loading, deoAssets, onRefreshDeoAssets, toast }) {
  const [notes,        setNotes]        = useState("");
  const [sigFile,      setSigFile]      = useState(null);
  const [stampFile,    setStampFile]    = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  if (!action || !item) return null;

  const cfg = {
    approve:   { title: "Approve Babyeyi",      label: "Approve & Sign", btnBg: C.emerald,      icon: ThumbsUp  },
    reject:    { title: "Reject Babyeyi",        label: "Reject & Sign",  btnBg: C.red,          icon: ThumbsDown},
    recommend: { title: "Recommend to NESA",     label: "Send to NESA",   btnBg: C.blue,         icon: Send      },
  }[action] || {};

  const Icon = cfg.icon || Check;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 120,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      background: "rgba(26,18,0,0.4)", backdropFilter: "blur(6px)",
    }}>
      <div style={{
        background: "white", borderRadius: "24px 24px 0 0",
        boxShadow: "0 -8px 40px rgba(26,18,0,0.2)",
        width: "100%", maxWidth: 520, maxHeight: "96vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        border: `1px solid ${C.goldBorder}`,
        fontFamily: font,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`,
          background: C.goldBg, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: cfg.btnBg, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 16, height: 16, color: "white" }}/>
          </div>
          <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 15, margin: 0 }}>{cfg.title}</h3>
          <button onClick={onClose} style={{
            marginLeft: "auto", padding: 6, borderRadius: 10,
            background: "transparent", border: "none", cursor: "pointer", color: C.goldDark,
            display: "flex",
          }}>
            <X style={{ width: 16, height: 16 }}/>
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary */}
          <div style={{
            background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            borderRadius: 16, padding: 14, fontSize: 13,
          }}>
            <p style={{ fontWeight: 900, color: C.dark, margin: "0 0 4px" }}>{item.school_name || "—"}</p>
            <p style={{ color: C.goldDark, fontSize: 11, margin: 0 }}>
              {[item.class, item.term, item.academic_year].filter(Boolean).join(" · ")} · RWF {fmt(item.total_fee || item.requested_amount)}
            </p>
          </div>

          {/* Rejection reason */}
          {action === "reject" && (
            <div style={{ background: C.red50, border: `2px solid ${C.redBorder}`, borderRadius: 16, padding: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: C.red800, marginBottom: 8 }}>
                Rejection reason <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="State the reason for rejecting this request (required)…"
                style={{ ...inp, resize: "none", lineHeight: 1.6, border: `2px solid ${C.redBorder}`, background: "white", width: "100%", boxSizing: "border-box" }}
              />
              {!notes.trim() && (
                <p style={{ fontSize: 11, color: C.red, fontWeight: 700, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  You must provide a rejection reason before submitting.
                </p>
              )}
            </div>
          )}

          {/* DEO Uploads */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              DEO Authorization
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <AssetUploadField label="Signature"     icon={PenLine} fieldName="deo_signature" file={sigFile}   onFileChange={setSigFile}   existingUrl={deoAssets?.signature_url}/>
              <AssetUploadField label="Official Stamp" icon={Stamp}  fieldName="deo_stamp"     file={stampFile} onFileChange={setStampFile} existingUrl={deoAssets?.stamp_url}/>
            </div>
            {!sigFile && !stampFile && !deoAssets?.signature_url && !deoAssets?.stamp_url && (
              <p style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontFamily: font }}>
                <AlertTriangle style={{ width: 12, height: 12 }}/> Upload your signature/stamp or save them in your profile first.
              </p>
            )}
            {(deoAssets?.signature_url || deoAssets?.stamp_url) && !sigFile && !stampFile && (
              <p style={{ fontSize: 10, color: C.emeraldDark, fontWeight: 700, marginTop: 8, fontFamily: font }}>
                Using saved profile assets. Upload new files above to change for this action only, or to save for next time.
              </p>
            )}
            {(sigFile || stampFile) && (
              <button
                type="button"
                disabled={savingProfile}
                onClick={async () => {
                  setSavingProfile(true);
                  try {
                    const fd = new FormData();
                    if (sigFile) fd.append("deo_signature", sigFile);
                    if (stampFile) fd.append("deo_stamp", stampFile);
                    await apiFetchMultipart("/district/babyeyi/deo-assets", fd, "POST");
                    onRefreshDeoAssets?.();
                    if (toast) toast("Signature & stamp saved to your profile. They will be used for future actions.", "success");
                  } catch (e) {
                    if (toast) toast(e.message || "Failed to save to profile", "error");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
                style={{
                  marginTop: 10, padding: "8px 14px", fontSize: 11, fontWeight: 700,
                  background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
                  color: C.darkMid, cursor: savingProfile ? "not-allowed" : "pointer", fontFamily: font,
                }}
              >
                {savingProfile ? "Saving…" : "Save to my profile for next time"}
              </button>
            )}
          </div>

          {/* Notes */}
          {action !== "reject" && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Notes
              </label>
              <textarea
                rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                placeholder={action === "approve" ? "Optional approval comments…" : "Notes for NESA review…"}
                style={{ ...inp, resize: "none", lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px 20px", borderTop: `1px solid ${C.goldBorder}`,
          display: "flex", gap: 10, flexShrink: 0,
        }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: "12px 0", border: `2px solid ${C.goldBorder}`, borderRadius: 14,
            fontSize: 13, fontWeight: 700, color: C.darkMid, background: "white",
            cursor: "pointer", fontFamily: font, opacity: loading ? 0.5 : 1,
          }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ notes, sigFile, stampFile })}
            disabled={loading || (action === "reject" && !notes.trim())}
            style={{
              flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
              fontSize: 13, fontWeight: 700, color: "white", background: cfg.btnBg,
              cursor: loading || (action === "reject" && !notes.trim()) ? "not-allowed" : "pointer",
              opacity: (loading || (action === "reject" && !notes.trim())) ? 0.5 : 1,
              fontFamily: font, boxShadow: `0 4px 16px ${cfg.btnBg}44`,
            }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> Processing…
                </span>
              : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}
