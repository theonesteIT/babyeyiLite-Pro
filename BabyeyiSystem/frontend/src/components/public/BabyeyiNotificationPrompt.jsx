import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { subscribePublicGuestPush, isPublicGuestPushSupported } from "../../utils/webPushPublicGuest";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

const PROMPT_KEY = "babyeyi_notif_prompt_answered";
const SESSION_HIDE_KEY = "babyeyi_notif_prompt_session_hide";
const MIN_WAIT_MS = 2800;
const MAX_WAIT_MS = 12000;

export function hasAnsweredNotificationPrompt() {
  try {
    return !!localStorage.getItem(PROMPT_KEY);
  } catch {
    return false;
  }
}

export function resetNotificationPromptState() {
  try {
    localStorage.removeItem(PROMPT_KEY);
    localStorage.removeItem("babyeyi_public_push_banner_dismissed");
    sessionStorage.removeItem(SESSION_HIDE_KEY);
  } catch { /* ignore */ }
}

function markPrompt(answer) {
  try {
    localStorage.setItem(PROMPT_KEY, answer);
    localStorage.setItem("babyeyi_public_push_banner_dismissed", "1");
  } catch { /* ignore */ }
}

function hideForSession() {
  try {
    sessionStorage.setItem(SESSION_HIDE_KEY, "1");
  } catch { /* ignore */ }
}

function isSessionHidden() {
  try {
    return sessionStorage.getItem(SESSION_HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

function shouldOfferSoftAsk() {
  if (!("Notification" in window)) return false;
  if (hasAnsweredNotificationPrompt()) return false;
  if (isSessionHidden()) return false;
  const perm = Notification.permission;
  if (perm === "granted") {
    markPrompt("allowed");
    return false;
  }
  return true;
}

async function registerPushIfPossible() {
  if (!isPublicGuestPushSupported()) return;
  try {
    await subscribePublicGuestPush();
  } catch { /* server not configured or permission denied */ }
}

/**
 * Babyeyi notification opt-in (landing first visit):
 * 1. Branded intro — Enable / Maybe Later
 * 2. Native browser Allow/Block only after Enable (never recreated in UI)
 * 3. Success or Disabled follow-up card
 */
export default function BabyeyiNotificationPrompt({ mode = "landing" }) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState(null);
  const [busy, setBusy] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    setScreen(null);
    shownRef.current = false;

    if (!shouldOfferSoftAsk()) return undefined;

    const perm = Notification.permission;
    if (perm === "denied") {
      const tmr = setTimeout(() => {
        shownRef.current = true;
        setScreen("disabled");
      }, mode === "landing" ? MIN_WAIT_MS : 800);
      return () => clearTimeout(tmr);
    }

    const showIntro = () => {
      if (shownRef.current || !shouldOfferSoftAsk()) return;
      shownRef.current = true;
      setScreen("intro");
    };

    if (mode === "banner") {
      const tmr = setTimeout(showIntro, 1200);
      return () => clearTimeout(tmr);
    }

    const started = Date.now();
    let minTimer;
    let maxTimer;
    let cleaned = false;

    const tryShow = () => {
      if (cleaned || shownRef.current) return;
      if (Date.now() - started < MIN_WAIT_MS) return;
      showIntro();
    };

    const onEngage = () => tryShow();

    minTimer = setTimeout(() => {
      window.addEventListener("scroll", onEngage, { passive: true, once: true });
      window.addEventListener("pointerdown", onEngage, { once: true });
      window.addEventListener("keydown", onEngage, { once: true });
      tryShow();
    }, MIN_WAIT_MS);

    maxTimer = setTimeout(showIntro, MAX_WAIT_MS);

    return () => {
      cleaned = true;
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      window.removeEventListener("scroll", onEngage);
      window.removeEventListener("pointerdown", onEngage);
      window.removeEventListener("keydown", onEngage);
    };
  }, [mode]);

  const closeAll = () => setScreen(null);

  const maybeLater = () => {
    hideForSession();
    closeAll();
  };

  const requestNativePermission = async () => {
    if (!("Notification" in window)) {
      markPrompt("blocked");
      setScreen("disabled");
      return;
    }
    setBusy(true);
    setScreen(null);
    await new Promise((r) => setTimeout(r, 380));
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        markPrompt("allowed");
        void registerPushIfPossible();
        setScreen("success");
      } else {
        markPrompt("native_denied");
        setScreen("disabled");
      }
    } catch {
      hideForSession();
      closeAll();
    } finally {
      setBusy(false);
    }
  };

  const enableLater = async () => {
    if (Notification.permission === "default") {
      await requestNativePermission();
      return;
    }
    hideForSession();
    closeAll();
  };

  const finishSuccess = () => {
    closeAll();
  };

  if (!screen) return null;

  if (mode === "banner" && screen === "intro") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-lg mx-auto sm:left-auto sm:right-6">
        <div className="rounded-2xl border border-amber-200 bg-white shadow-xl p-4 flex gap-3 items-start">
          <span className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-amber-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-[#000435]">{t("public.notifIntroTitle")}</p>
            <p className="text-[11px] text-gray-500 font-medium mt-1 leading-relaxed">{t("public.notifIntroSub")}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={requestNativePermission} disabled={busy}
                className="px-4 py-2 rounded-xl bg-[#000435] text-white text-[12px] font-black hover:bg-[#000630] disabled:opacity-60">
                {busy ? "…" : t("public.notifEnable")}
              </button>
              <button type="button" onClick={maybeLater} disabled={busy}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-[12px] font-bold hover:bg-gray-50">
                {t("public.notifMaybeLater")}
              </button>
            </div>
          </div>
          <button type="button" onClick={maybeLater} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ fontFamily: '"Montserrat", sans-serif' }}>
      <div className="absolute inset-0 bg-[#000435]/92 backdrop-blur-md" />

      {/* Decorative sparkles on intro */}
      {screen === "intro" && (
        <>
          <Sparkles size={14} className="absolute top-[12%] left-[10%] text-amber-400/40 pointer-events-none" />
          <Sparkles size={18} className="absolute top-[18%] right-[14%] text-amber-300/30 pointer-events-none" />
          <span className="absolute bottom-[20%] left-[8%] w-2 h-2 rounded-full bg-amber-400/30 pointer-events-none" />
          <span className="absolute top-[40%] right-[6%] w-1.5 h-1.5 rounded-full bg-white/20 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 w-full max-w-[400px] my-auto">
        {/* ── INTRO: Stay Updated Instantly ── */}
        {screen === "intro" && (
          <div className="text-center px-2 sm:px-4">
            <img src={babyeyiLogo} alt="Babyeyi" className="h-10 sm:h-11 mx-auto mb-8 object-contain" />

            <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 mb-8">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
              <div className="absolute inset-2 rounded-full border-2 border-amber-400/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Bell size={32} className="text-[#000435]" strokeWidth={2.2} />
                </div>
              </div>
              <span className="absolute top-3 right-5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[#000435]">1</span>
            </div>

            <h2 className="text-[22px] sm:text-[26px] font-black text-white mb-3 leading-tight">
              {t("public.notifIntroTitle")}
            </h2>
            <p className="text-[13px] sm:text-[14px] text-white/65 leading-relaxed max-w-[320px] mx-auto mb-8">
              {t("public.notifIntroSub")}
            </p>

            <button type="button" onClick={requestNativePermission} disabled={busy}
              className="w-full max-w-[320px] mx-auto block py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435] text-[15px] font-black shadow-lg shadow-amber-500/25 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-60">
              {busy ? "…" : t("public.notifEnable")}
            </button>
            <button type="button" onClick={maybeLater} disabled={busy}
              className="mt-4 text-[13px] font-semibold text-white/50 hover:text-white/80 transition-colors">
              {t("public.notifMaybeLater")}
            </button>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {screen === "success" && (
          <div className="rounded-3xl bg-white shadow-2xl overflow-hidden px-6 py-8 sm:py-10 text-center border border-white/10">
            <img src={babyeyiLogo} alt="Babyeyi" className="h-9 mx-auto mb-6 object-contain" />
            <div className="w-[72px] h-[72px] rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
              <Check size={36} className="text-white" strokeWidth={3} />
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-black text-[#000435] mb-2">
              {t("public.notifSuccessTitle")}
            </h2>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-8 max-w-[280px] mx-auto">
              {t("public.notifSuccessSub")}
            </p>
            <button type="button" onClick={finishSuccess}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435] text-[15px] font-black hover:from-amber-300 hover:to-amber-400 transition-all">
              {t("public.notifDone")}
            </button>
          </div>
        )}

        {/* ── DISABLED ── */}
        {screen === "disabled" && (
          <div className="rounded-3xl bg-white shadow-2xl overflow-hidden px-6 py-8 sm:py-10 text-center border border-white/10">
            <img src={babyeyiLogo} alt="Babyeyi" className="h-9 mx-auto mb-6 object-contain" />
            <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <BellOff size={32} className="text-gray-400" strokeWidth={2} />
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-black text-[#000435] mb-4">
              {t("public.notifDisabledTitle")}
            </h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-8 text-left flex gap-2.5 items-start">
              <span className="text-amber-500 text-[13px] shrink-0 mt-0.5">⚠</span>
              <p className="text-[12px] sm:text-[13px] text-amber-900 leading-relaxed">
                <span className="font-black">{t("public.notifDisabledImportant")}</span>
                {" "}{t("public.notifDisabledWarning")}
              </p>
            </div>
            <button type="button" onClick={enableLater} disabled={busy}
              className="w-full py-3.5 rounded-2xl border-2 border-amber-400 text-amber-600 text-[15px] font-black hover:bg-amber-50 transition-all disabled:opacity-60">
              {busy ? "…" : t("public.notifEnableLater")}
            </button>
            <button type="button" onClick={maybeLater}
              className="mt-3 text-[12px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              {t("public.notifMaybeLater")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
