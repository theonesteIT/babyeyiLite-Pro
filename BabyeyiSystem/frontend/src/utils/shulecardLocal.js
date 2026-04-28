// ================================================================
// Shulecard local demo state (replace with API when available)
// ================================================================

const KEY_BALANCE = "babyeyi_shulecard_balance_rwf";
const KEY_DAILY_LIMIT = "babyeyi_shulecard_daily_limit_rwf";
const KEY_TOPUPS = "babyeyi_shulecard_topups_log";

const DEFAULT_DAILY_LIMIT = 5000;

export function getShulecardBalance() {
  try {
    const v = localStorage.getItem(KEY_BALANCE);
    if (v == null || v === "") return 0;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function setShulecardBalance(rwf) {
  const n = Math.max(0, Math.floor(Number(rwf) || 0));
  try {
    localStorage.setItem(KEY_BALANCE, String(n));
  } catch { /* ignore */ }
  return n;
}

export function getDailyLimit() {
  try {
    const v = localStorage.getItem(KEY_DAILY_LIMIT);
    if (v == null || v === "") return DEFAULT_DAILY_LIMIT;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return DEFAULT_DAILY_LIMIT;
    return Math.floor(n);
  } catch {
    return DEFAULT_DAILY_LIMIT;
  }
}

export function setDailyLimit(rwf) {
  const n = Math.max(0, Math.floor(Number(rwf) || 0));
  try {
    localStorage.setItem(KEY_DAILY_LIMIT, String(n));
  } catch { /* ignore */ }
  return n;
}

export function addTopUp(amountRwf) {
  const amt = Math.max(0, Math.floor(Number(amountRwf) || 0));
  if (amt <= 0) return { balance: getShulecardBalance(), entry: null };
  const balance = getShulecardBalance() + amt;
  setShulecardBalance(balance);
  const entry = {
    id: `tu-${Date.now()}`,
    amount: amt,
    at: new Date().toISOString(),
  };
  try {
    const raw = localStorage.getItem(KEY_TOPUPS);
    const list = raw ? JSON.parse(raw) : [];
    const next = [entry, ...(Array.isArray(list) ? list : [])].slice(0, 20);
    localStorage.setItem(KEY_TOPUPS, JSON.stringify(next));
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("babyeyi-shulecard-updated"));
  }
  return { balance, entry };
}

export function getTopUpLog() {
  try {
    const raw = localStorage.getItem(KEY_TOPUPS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
