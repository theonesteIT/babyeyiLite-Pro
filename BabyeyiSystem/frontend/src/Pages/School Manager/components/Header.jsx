/**
 * Header.jsx — School Manager Header
 * Single-row: title · search · utilities (#000435 + amber · Montserrat)
 */

import { Menu, Globe, BookOpen, ChevronDown, Search } from "lucide-react";
import { useState } from "react";

const SERVER_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/api\/?$/, "") || "http://localhost:5100";

const FONT = `"Montserrat", system-ui, sans-serif`;

const LANG_OPTIONS = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "rw", flag: "🇷🇼", label: "Kinyarwanda" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
];

function buildPhotoUrl(photo) {
  if (!photo || typeof photo !== "string") return null;
  const path = photo.replace(/\\/g, "/").trim();
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = SERVER_BASE.replace(/\/$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

export default function Header({ current, online, notifCount, switchTab, setMobileOpen, lang, setLang, schoolProfile, session }) {
  const avatarSrc = buildPhotoUrl(session?.userPhoto) ?? schoolProfile?.logo ?? null;
  const displayName = session?.userName || schoolProfile?.headTeacher || "Head Teacher";
  const displayRole = (session?.userRole || schoolProfile?.role || "School Manager").replace(/_/g, " ");
  const schoolName = session?.schoolName || schoolProfile?.name || "";
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) || LANG_OPTIONS[0];

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm"
      style={{ fontFamily: FONT }}
    >
      <div className="flex flex-col gap-3 px-4 sm:px-6 py-3 lg:flex-row lg:items-center lg:gap-4 lg:py-3.5">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0 shrink-0 lg:max-w-[200px] xl:max-w-[240px]">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-[#000435] text-amber-400 hover:bg-[#000a50] transition-all shrink-0"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="text-[17px] sm:text-lg font-bold text-[#000435] leading-tight truncate">
              {current?.label || "Dashboard"}
            </h2>
            {current?.id === "hr_center" ? (
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Manage your staff and HR operations.
              </p>
            ) : current?.id === "gate_attendance" ? (
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Monitor morning and evening gate attendance.
              </p>
            ) : current?.id === "settings" ? (
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
                Profile, school identity, and academic calendar.
              </p>
            ) : schoolName ? (
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium uppercase tracking-wide truncate">
                {schoolName}
              </p>
            ) : null}
          </div>
        </div>

        {/* Search — center, same row on desktop */}
        <div className="relative flex-1 min-w-0 w-full lg:max-w-2xl lg:mx-auto">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search anything…"
            className="w-full h-10 sm:h-11 pl-10 pr-14 rounded-full border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15 transition-all"
          />
          <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-400">
            ⌘K
          </kbd>
        </div>

        {/* Utilities */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-full text-[11px] font-semibold border transition-all ${
              online
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
            {online ? "Online" : "Offline"}
            <ChevronDown size={12} className="opacity-45" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-all min-h-[38px]"
            >
              <Globe size={14} className="text-slate-500 shrink-0" />
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown size={12} className="opacity-45" />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[150px]">
                {LANG_OPTIONS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLang(l.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold hover:bg-amber-50 transition-all ${
                      lang === l.code ? "text-[#000435] bg-amber-50" : "text-slate-600"
                    }`}
                  >
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => switchTab("settings")}
            className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-xl bg-[#000435] border border-amber-400/35 hover:bg-[#000a50] transition-all min-h-[40px] max-w-[180px] sm:max-w-[220px]"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-amber-400/40" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 border border-amber-300/50">
                <BookOpen size={14} className="text-[#000435]" />
              </div>
            )}
            <div className="hidden sm:block text-left min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white leading-tight truncate">{displayName}</p>
              <p className="text-[9px] text-amber-400 leading-none truncate uppercase">{displayRole}</p>
            </div>
            <ChevronDown size={14} className="text-white/70 shrink-0 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
