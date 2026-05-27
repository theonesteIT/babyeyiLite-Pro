import React from "react";
import { Menu, Wifi, WifiOff, RefreshCw, Shield } from "lucide-react";
import { C, font } from "../utils/theme";
import { resolveUrl } from "../utils/helpers";
import LogoutButton from "./LogoutButton";

export default function Header({ tab, currentTabConfig, deo, online, statsLoad, listLoad, onRefresh, setMobileOpen }) {
  const spinning = statsLoad || listLoad;

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 20,
      borderBottom: `1px solid ${C.goldBorder}`,
      padding: "12px 16px",
      background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)",
      fontFamily: font,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} style={{
            color: C.goldDark, background: "transparent", border: "none", cursor: "pointer",
            padding: 6, borderRadius: 10, display: "flex",
          }}>
            <Menu style={{ width: 20, height: 20 }}/>
          </button>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1.2 }}>
              {currentTabConfig?.label || "Dashboard"}
            </h2>
            {deo?.district && (
              <p className="hidden sm:block" style={{ fontSize: 11, color: C.goldDark, fontWeight: 600, margin: 0 }}>
                {deo.district} District{deo.province ? ` · ${deo.province}` : ""}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="hidden sm:flex" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: online ? C.emeraldBg : C.amberBg,
            border: `1px solid ${online ? C.emeraldBord : C.amberBord}`,
            color: online ? C.emeraldDark : "#92400e",
          }}>
            {online ? <Wifi style={{ width: 12, height: 12 }}/> : <WifiOff style={{ width: 12, height: 12 }}/>}
            {online ? "Online" : "Offline"}
          </div>

          <button onClick={onRefresh} title="Refresh" style={{
            padding: 8, borderRadius: 10, background: "transparent", border: "none",
            cursor: "pointer", color: C.goldDark, display: "flex",
          }}>
            <RefreshCw style={{ width: 16, height: 16, animation: spinning ? "spin 0.8s linear infinite" : "none" }}/>
          </button>

          {deo && (
            <div className="hidden sm:flex" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 14,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 9,
                background: resolveUrl(deo.photo) ? "transparent" : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                overflow: "hidden",
              }}>
                {resolveUrl(deo.photo) ? (
                  <img src={resolveUrl(deo.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Shield style={{ width: 14, height: 14, color: C.gold }}/>
                )}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: 0, lineHeight: 1.2 }}>{deo.fullName}</p>
                <p style={{ fontSize: 9, color: C.goldDark, margin: 0 }}>District Officer</p>
              </div>
            </div>
          )}

          <LogoutButton compact/>
        </div>
      </div>
    </header>
  );
}
