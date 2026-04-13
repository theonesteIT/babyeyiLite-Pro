/**
 * Header.jsx — School Manager Header
 * #000435 navy + amber-400 · MTN font · Tailwind only · Mobile-first
 */

import { Bell, Menu, Wifi, WifiOff, Globe, BookOpen, ChevronDown, Search } from "lucide-react";
import { useState } from "react";

const SERVER_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/api\/?$/, "") || "http://localhost:5100";

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;

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
  const displaySub = schoolProfile?.district || session?.schoolDistrict || "District";
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[0];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap');`}</style>
      <header
        className="sticky top-0 z-30 border-b-[3px] border-amber-400 bg-[#000435]/97 backdrop-blur-md"
        style={{ fontFamily: FONT }}
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-[58px] sm:h-[64px]">

          {/* Left — hamburger + page title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white/8 border border-white/15 text-white/70 hover:bg-white/14 hover:text-white transition-all"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="text-[15px] xl:text-[16px] font-black text-white leading-tight truncate">
                {current?.label || "Dashboard"}
              </h2>
              <p className="text-[10px] text-white/40 hidden sm:block font-semibold truncate">
                {schoolProfile?.name || "School Babyeyi Management System"}
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Online status badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              online
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-amber-400/15 text-amber-400 border-amber-400/30"
            }`}>
              {online ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span>{online ? "Online" : "Offline"}</span>
            </div>

            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/8 border border-white/15 text-white/80 text-[12px] font-bold hover:bg-white/14 transition-all min-h-[38px]"
              >
                <span className="text-[14px]">{currentLang.flag}</span>
                <span className="hidden sm:inline text-[11px]">{currentLang.label}</span>
                <ChevronDown size={11} className="opacity-50" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 bg-[#000435] border-2 border-amber-400/30 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[150px]">
                  {LANG_OPTIONS.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-bold hover:bg-amber-400/10 transition-all ${
                        lang === l.code ? "text-amber-400 bg-amber-400/8" : "text-white/70"
                      }`}
                    >
                      <span className="text-[15px]">{l.flag}</span> {l.label}
                      {lang === l.code && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              onClick={() => switchTab("notifications")}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/8 border border-white/15 text-white/70 hover:bg-white/14 hover:text-amber-400 transition-all"
            >
              <Bell size={17} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-[#000435]">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* Profile chip */}
            <button
              onClick={() => switchTab("settings")}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-amber-400/12 border border-amber-400/30 hover:bg-amber-400/20 transition-all min-h-[38px]"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 border border-amber-400/30" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#000435] border-2 border-amber-400 flex items-center justify-center shrink-0">
                  <BookOpen size={13} className="text-amber-400" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-black text-white leading-tight truncate max-w-[100px]">{displayName}</p>
                <p className="text-[10px] text-amber-400/70 leading-none">{displaySub}</p>
              </div>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}