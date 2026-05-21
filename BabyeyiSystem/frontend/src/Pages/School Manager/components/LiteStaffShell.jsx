import { LogOut } from "lucide-react";
import LogoutButton from "../../Auth/LogoutButton";
import { useAuth } from "../../../context/AuthContext";
import { BABYEYI_FONT_STACK } from "../../../theme/babyeyiDashboardTheme";

export default function LiteStaffShell({ title, subtitle, children, compact = false }) {
  const auth = useAuth();
  const user = auth.user && auth.user !== false ? auth.user : null;
  const name = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "";
  const school = user?.school?.name || user?.school_name || "";

  return (
    <div
      className={compact ? "min-h-screen bg-re-bg text-slate-800" : "min-h-screen bg-[#FFFBF0] text-slate-800"}
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      {!compact ? (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Babyeyi Lite</p>
              <h1 className="text-base font-black text-[#000435] truncate sm:text-lg">{title || "Shule Avance"}</h1>
              {subtitle ? <p className="text-[11px] text-slate-500 truncate">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block text-right max-w-[160px]">
                <p className="text-xs font-bold text-slate-800 truncate">{name || "Staff"}</p>
                <p className="text-[10px] text-slate-500 truncate">{school}</p>
              </div>
              <LogoutButton
                variant="sidebar"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#000435] px-3 py-2 text-[11px] font-bold text-amber-400 hover:bg-[#000a50]"
              >
                <LogOut size={14} /> Sign out
              </LogoutButton>
            </div>
          </div>
        </header>
      ) : null}
      <main>{children}</main>
    </div>
  );
}
