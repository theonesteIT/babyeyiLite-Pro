import React, { useState, useRef } from "react";
import { User, X, Upload, Loader2, Lock } from "lucide-react";
import { C, font, inp } from "../utils/theme";
import { API } from "../utils/api";
import { profilePhotoUrl } from "../utils/helpers";

export default function DeoProfileModal({ open, deo, onClose, onUpdated, toast }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const photoInputRef = useRef(null);

  if (!open) return null;

  const photoSrc = photoPreview || (deo?.photo ? profilePhotoUrl(deo.photo) : null);

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    try {
      const fd = new FormData();
      fd.append("photo", photoFile);
      const res = await fetch(`${API}/auth/profile/photo`, { method: "POST", credentials: "include", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = "";
        onUpdated?.();
        if (toast) toast("Profile photo updated.", "success");
      } else if (toast) toast(json.message || "Upload failed", "error");
    } catch (e) {
      if (toast) toast("Failed to upload photo", "error");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      if (toast) toast("New password and confirm do not match", "error");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      if (toast) toast("New password must be at least 8 characters", "error");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        if (toast) toast("Password changed successfully.", "success");
      } else if (toast) toast(json.message || "Failed to change password", "error");
    } catch (e) {
      if (toast) toast("Failed to change password", "error");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,18,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 24, boxShadow: "0 20px 60px rgba(26,18,0,0.2)", border: `1px solid ${C.goldBorder}`, width: "100%", maxWidth: 440, maxHeight: "90vh", overflowY: "auto", fontFamily: font }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.goldBorder}`, background: C.goldBg }}>
          <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 18, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <User style={{ width: 20, height: 20, color: C.goldDark }}/> My Profile
          </h3>
          <button onClick={onClose} style={{ padding: 8, borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", color: C.goldDark, display: "flex" }}>
            <X style={{ width: 20, height: 20 }}/>
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Profile photo */}
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <User style={{ width: 16, height: 16, color: C.gold }}/> Profile Photo
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: `3px solid ${C.goldBorder}`, background: C.goldBgMid, flexShrink: 0 }}>
                {photoSrc ? (
                  <img src={photoSrc} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 36, height: 36, color: C.goldDark }}/>
                  </div>
                )}
              </div>
              <div>
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }}
                  onChange={e => { const f = e.target?.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }}/>
                <button type="button" onClick={() => photoInputRef.current?.click()} style={{
                  padding: "10px 16px", fontFamily: font, fontWeight: 700, fontSize: 12, background: C.goldBg, border: `2px solid ${C.goldBorder}`, borderRadius: 12, color: C.dark, cursor: "pointer", marginRight: 8,
                }}><Upload style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 6 }}/> Choose</button>
                {photoFile && (
                  <button type="button" disabled={photoSaving} onClick={handlePhotoUpload} style={{
                    padding: "10px 16px", fontFamily: font, fontWeight: 700, fontSize: 12, background: C.dark, border: "none", borderRadius: 12, color: C.gold, cursor: photoSaving ? "not-allowed" : "pointer", opacity: photoSaving ? 0.7 : 1,
                  }}>{photoSaving ? <Loader2 style={{ width: 14, height: 14, animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}/> : "Upload"}</button>
                )}
                <p style={{ fontSize: 11, color: C.goldDark, margin: "8px 0 0" }}>JPEG, PNG or WebP, max 2MB</p>
              </div>
            </div>
          </div>
          {/* Change password */}
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: 16, padding: 20 }}>
            <h4 style={{ fontWeight: 700, color: C.dark, fontSize: 13, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock style={{ width: 16, height: 16, color: C.gold }}/> Change Password
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current password</label>
                <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Current password"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>New password</label>
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="At least 8 characters"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.goldDark, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Confirm new password</label>
                <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password"
                  style={{ ...inp, width: "100%", boxSizing: "border-box" }}/>
              </div>
            </div>
            <button type="button" disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword} onClick={handleChangePassword} style={{
              marginTop: 16, padding: "12px 24px", fontFamily: font, fontWeight: 700, fontSize: 13,
              background: (pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) ? C.slate200 : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
              color: C.gold, border: "none", borderRadius: 14, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.8 : 1,
            }}>{pwSaving ? <><Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8 }}/> Updating…</> : "Change Password"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
