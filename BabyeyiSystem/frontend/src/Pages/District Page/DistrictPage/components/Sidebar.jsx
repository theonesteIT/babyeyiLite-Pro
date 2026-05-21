import React from "react";
import { MapPin, User, Wifi, WifiOff, X } from "lucide-react";
import { C, font } from "../utils/theme";
import { resolveUrl } from "../utils/helpers";
import LogoutButton from "./LogoutButton";

export default function Sidebar({ tab, navConfig, switchTab, deo, online, mobileOpen, setMobileOpen, onOpenProfile }) {
  const Content = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: font }}>
      {/* Header */}
      <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.goldBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 96, height: 36, borderRadius: 12, flexShrink: 0,
            background: "#1F2937",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(26,18,0,0.25)",
            padding: "4px 10px",
          }}>
            <img src="/1BABYEYI LOGO FINAL.png" alt="Babyeyi logo" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 14, fontWeight: 900, color: C.dark, margin: 0, lineHeight: 1.2 }}>DEO Portal</h1>
            <p style={{ fontSize: 10, color: C.goldDark, margin: 0, fontWeight: 600 }}>District Education Officer</p>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
          borderRadius: 10, fontSize: 11, fontWeight: 700,
          background: online ? C.emeraldBg : C.amberBg,
          border: `1px solid ${online ? C.emeraldBord : C.amberBord}`,
          color: online ? C.emeraldDark : "#92400e",
        }}>
          {online ? <Wifi style={{ width: 12, height: 12 }}/> : <WifiOff style={{ width: 12, height: 12 }}/>}
          {online ? "Connected" : "Offline Mode"}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, minHeight: 0, padding: 10, overflowY: "auto" }}>
        {navConfig.map(item => {
          const isActive = tab === item.id;
          return (
            <button key={item.id} onClick={() => { switchTab(item.id); setMobileOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12, marginBottom: 2,
              border: "none", cursor: "pointer", fontFamily: font,
              fontWeight: 700, fontSize: 13, textAlign: "left",
              background: isActive ? `linear-gradient(135deg, ${C.dark}, ${C.darkMid})` : "transparent",
              color:      isActive ? C.gold : C.goldDeep,
              boxShadow:  isActive ? "0 4px 12px rgba(26,18,0,0.18)" : "none",
              transition: "all 150ms",
            }}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }}/>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: 10, borderTop: `1px solid ${C.goldBorder}` }}>
        {deo && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            borderRadius: 14, padding: 10, marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: resolveUrl(deo.photo) ? "transparent" : `linear-gradient(135deg, ${C.dark}, ${C.darkMid})`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              {resolveUrl(deo.photo) ? (
                <img src={resolveUrl(deo.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User style={{ width: 18, height: 18, color: C.gold }}/>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.dark, margin: "0 0 2px",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {deo.fullName}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin style={{ width: 11, height: 11, color: C.goldDark, flexShrink: 0 }}/>
                <p style={{ fontSize: 10, color: C.goldDark, fontWeight: 600, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {deo.district} District
                </p>
              </div>
              {deo.province && <p style={{ fontSize: 9, color: C.goldDeep, margin: "2px 0 0" }}>{deo.province}</p>}
            </div>
          </div>
        )}
        {onOpenProfile && (
          <button type="button" onClick={onOpenProfile} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12,
            fontSize: 13, fontWeight: 700, color: C.goldDeep, background: C.goldBg, border: `1px solid ${C.goldBorder}`,
            cursor: "pointer", fontFamily: font, marginBottom: 8,
          }}>
            <User style={{ width: 16, height: 16, flexShrink: 0 }}/> My profile
          </button>
        )}
        <div style={{
          background: C.goldBgMid, border: `1px solid ${C.goldBorder}`,
          borderRadius: 12, padding: "8px 10px", textAlign: "center", marginBottom: 8,
        }}>
          <p style={{ fontSize: 10, color: C.goldDark, fontWeight: 700, margin: 0 }}>NESA Rwanda · v2.0</p>
        </div>
        <LogoutButton/>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex" style={{
        flexDirection: "column", width: 240,
        borderRight: `1px solid ${C.goldBorder}`,
        position: "fixed", left: 0, top: 0, height: "100%", zIndex: 30,
        background: "white", backdropFilter: "blur(8px)",
        fontFamily: font,
      }}>
        <Content/>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden" style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex",
          background: "rgba(26,18,0,0.4)", backdropFilter: "blur(4px)",
        }} onClick={() => setMobileOpen(false)}>
          <div style={{
            width: 280, height: "100%", background: C.goldBg,
            boxShadow: "4px 0 24px rgba(26,18,0,0.2)",
            display: "flex", flexDirection: "column", fontFamily: font,
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: `1px solid ${C.goldBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 90, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "#1F2937",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "4px 9px",
                }}>
                  <img src="/1BABYEYI LOGO FINAL.png" alt="Babyeyi logo" style={{ width: "100%", height: "100%", objectFit: "contain" }}/>
                </div>
                <span style={{ fontWeight: 900, color: C.dark, fontSize: 14, fontFamily: font }}>DEO Portal</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{
                padding: 6, borderRadius: 10, background: C.goldBgMid, border: "none", cursor: "pointer",
              }}>
                <X style={{ width: 18, height: 18, color: C.goldDark }}/>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}><Content/></div>
          </div>
        </div>
      )}
    </>
  );
}
