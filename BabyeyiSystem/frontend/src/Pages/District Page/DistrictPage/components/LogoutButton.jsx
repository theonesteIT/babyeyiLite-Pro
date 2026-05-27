import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader } from "lucide-react";
import { useAuth } from "../../../../context/AuthContext";
import { C, font } from "../utils/theme";
import { getPostLogoutLoginPath } from "../../../../utils/postLogoutLoginPath";

export default function LogoutButton({ compact = false, style: extStyle = {} }) {
  const { logout }  = useAuth();
  const navigate    = useNavigate();
  const [loading,      setLoading]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const handleLogout = async () => {
    setLoading(true); setShowConfirm(false);
    try { await logout(); } finally {
      setLoading(false);
      navigate(getPostLogoutLoginPath(), { replace: true });
    }
  };

  return (
    <>
      {showConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(26,18,0,0.3)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "white", borderRadius: 24, border: `1px solid ${C.goldBorder}`,
            boxShadow: "0 20px 60px rgba(26,18,0,0.2)",
            width: "100%", maxWidth: 360, padding: 24, textAlign: "center",
            fontFamily: font,
          }}>
            <div style={{
              width: 52, height: 52, background: C.red50, borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <LogOut style={{ width: 26, height: 26, color: C.red }}/>
            </div>
            <h3 style={{ fontWeight: 900, color: C.dark, fontSize: 17, margin: "0 0 6px" }}>Sign Out?</h3>
            <p style={{ color: C.goldDark, fontSize: 13, margin: "0 0 20px" }}>You'll be redirected to the login page.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{
                flex: 1, padding: 12, border: `2px solid ${C.goldBorder}`, borderRadius: 14,
                fontSize: 13, fontWeight: 700, color: C.darkMid, background: "white",
                cursor: "pointer", fontFamily: font,
              }}>Cancel</button>
              <button onClick={handleLogout} disabled={loading} style={{
                flex: 1, padding: 12, background: C.red, color: "white", borderRadius: 14,
                fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: loading ? 0.6 : 1, fontFamily: font,
              }}>
                {loading ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/> : <><LogOut style={{ width: 16, height: 16 }}/> Sign Out</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {compact ? (
        <button onClick={() => setShowConfirm(true)} disabled={loading} title="Sign Out" style={{
          padding: 8, borderRadius: 10, background: "transparent", border: "none",
          cursor: "pointer", color: C.goldDark, display: "flex", opacity: loading ? 0.5 : 1,
          ...extStyle,
        }}>
          {loading
            ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }}/>
            : <LogOut style={{ width: 16, height: 16 }}/>}
        </button>
      ) : (
        <button onClick={() => setShowConfirm(true)} disabled={loading} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 700,
          color: C.red, background: "transparent", border: `1px solid transparent`,
          cursor: "pointer", fontFamily: font, transition: "all 150ms",
          opacity: loading ? 0.5 : 1, ...extStyle,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = C.red50; e.currentTarget.style.borderColor = C.redBorder; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
        >
          {loading
            ? <Loader style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite", flexShrink: 0 }}/>
            : <LogOut style={{ width: 16, height: 16, flexShrink: 0 }}/>}
          <span>{loading ? "Signing out…" : "Sign Out"}</span>
        </button>
      )}
    </>
  );
}
