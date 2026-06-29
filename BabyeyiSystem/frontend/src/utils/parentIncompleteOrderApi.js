// ================================================================
// parentIncompleteOrderApi — sync incomplete orders to server (mobile)
// ================================================================

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

let inboxSyncPromise = null;
let inboxSyncedAt = 0;
const INBOX_COOLDOWN_MS = 45_000;

function mapServerNotificationRow(n) {
  const payload = n.payload && typeof n.payload === "object" ? n.payload : {};
  const type = String(n.type || "").toUpperCase();
  const incompleteTypes = ["INCOMPLETE_ORDER", "INCOMPLETE_ORDER_REMINDER"];
  const isIncomplete =
    incompleteTypes.includes(type) ||
    payload.kind === "incomplete_kit_order";
  const isDiscipline =
    type === "DISCIPLINE_MARKS" ||
    type === "STUDENT_DISCIPLINE" ||
    payload.tab === "discipline";
  const studentRef =
    payload.student_ref ||
    payload.studentRef ||
    (payload.student_id != null ? String(payload.student_id) : "");
  const disciplineUrl = studentRef
    ? `/parents/student-details/${encodeURIComponent(studentRef)}?tab=discipline`
    : "/parents/home";
  return {
    id: `srv-${n.id}`,
    title: n.title || "Notification",
    body: n.body || "",
    createdAt: n.created_at || new Date().toISOString(),
    read: !!n.read,
    kind: isIncomplete ? "incomplete_kit_order" : isDiscipline ? "discipline" : payload.kind,
    resumeUrl: isDiscipline
      ? disciplineUrl
      : payload.resume_url || payload.resumeUrl || "",
    shareUrl: isDiscipline
      ? disciplineUrl
      : payload.share_url || payload.shareUrl || payload.resume_url || "",
    serverType: type,
  };
}

/**
 * Fetch notifications + incomplete orders once per cooldown (avoids 429 on remounts).
 */
export async function syncParentInboxFromServer({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - inboxSyncedAt < INBOX_COOLDOWN_MS) {
    return { notifications: [], incompleteOrders: [], skipped: true };
  }
  if (inboxSyncPromise) return inboxSyncPromise;

  inboxSyncPromise = (async () => {
    let notifications = [];
    let incompleteOrders = [];
    try {
      const [notifRes, orders] = await Promise.all([
        fetch(`${API}/api/parent-portal/notifications?limit=40`, { credentials: "include" }),
        fetch(`${API}/api/parent-portal/incomplete-orders`, { credentials: "include" }),
      ]);
      const notifJson = await notifRes.json().catch(() => ({}));
      if (notifRes.status === 429 || orders.status === 429) {
        return { notifications: [], incompleteOrders: [], rateLimited: true };
      }
      if (notifRes.ok && notifJson.success && Array.isArray(notifJson.data)) {
        notifications = notifJson.data.map(mapServerNotificationRow);
      }
      const ordersJson = await orders.json().catch(() => ({}));
      if (orders.ok && ordersJson.success && Array.isArray(ordersJson.data)) {
        incompleteOrders = ordersJson.data;
      }
      if (notifRes.ok || orders.ok) inboxSyncedAt = Date.now();
    } catch {
      /* silent */
    }
    return { notifications, incompleteOrders, skipped: false };
  })().finally(() => {
    inboxSyncPromise = null;
  });

  return inboxSyncPromise;
}

export async function syncIncompleteOrderToServer(payload) {
  const token = String(payload?.resume_token || payload?.resumeToken || "").trim();
  if (!token) return { ok: false };

  try {
    const res = await fetch(`${API}/api/parent-portal/incomplete-orders`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: payload.student_id ?? payload.studentId ?? null,
        service_type: payload.service_type ?? payload.serviceType ?? "classkit",
        status: payload.status || "incomplete",
        resume_token: token,
        resume_url: payload.resume_url ?? payload.resumeUrl ?? null,
        share_url: payload.share_url ?? payload.shareUrl ?? null,
        kit_title: payload.kit_title ?? payload.kitTitle ?? null,
        child_name: payload.child_name ?? payload.childName ?? null,
        total_rwf: payload.total_rwf ?? payload.totalRwf ?? 0,
        delivery: payload.delivery ?? null,
        payment_method: payload.payment_method ?? payload.paymentMethod ?? null,
        snapshot: payload.snapshot ?? payload.resumePayload ?? null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && !!json.success };
  } catch {
    return { ok: false };
  }
}

export async function completeIncompleteOrderOnServer(resumeToken) {
  const token = String(resumeToken || "").trim();
  if (!token) return { ok: false };
  try {
    const res = await fetch(
      `${API}/api/parent-portal/incomplete-orders/${encodeURIComponent(token)}/complete`,
      { method: "POST", credentials: "include" },
    );
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && !!json.success };
  } catch {
    return { ok: false };
  }
}

export async function deleteIncompleteOrderOnServer(resumeToken) {
  const token = String(resumeToken || "").trim();
  if (!token) return { ok: false };
  try {
    const res = await fetch(
      `${API}/api/parent-portal/incomplete-orders/${encodeURIComponent(token)}`,
      { method: "DELETE", credentials: "include" },
    );
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok && !!json.success };
  } catch {
    return { ok: false };
  }
}

export async function fetchIncompleteOrdersFromServer() {
  try {
    const res = await fetch(`${API}/api/parent-portal/incomplete-orders`, {
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !Array.isArray(json.data)) return [];
    return json.data;
  } catch {
    return [];
  }
}

function serviceLabel(serviceType, kitTitle) {
  if (kitTitle) return kitTitle;
  const t = String(serviceType || "").toLowerCase();
  if (t === "shulekit") return "ShuleKit";
  if (t === "shoes_voucher") return "Shoes voucher";
  if (t === "uniform_voucher") return "Uniform voucher";
  return "ClassKit";
}

/** Map server row → parent shell notification shape */
export function incompleteOrderToNotification(row) {
  const token = row.resume_token || "";
  const label = serviceLabel(row.service_type, row.kit_title);
  const amount =
    Number(row.total_rwf) > 0 ? ` (${Number(row.total_rwf).toLocaleString()} RWF)` : "";
  const isPay = row.status === "pending_payment";
  return {
    id: `srv-incomplete-${token}`,
    kind: "incomplete_kit_order",
    title: isPay ? `${label} — payment not completed` : `Incomplete ${label} order`,
    body: isPay
      ? `Continue to pay${amount}. Anyone with your link can open checkout — keep it private if you prefer.`
      : "You have not finished yet. Continue here, copy the link for later, or share on WhatsApp.",
    resumeUrl: row.resume_url || "",
    shareUrl: row.share_url || row.resume_url || "",
    createdAt: row.last_activity_at || row.created_at || new Date().toISOString(),
    read: false,
  };
}

/** Map server row → Orders.jsx list item */
export function incompleteOrderToLocalOrder(row) {
  const svc = String(row.service_type || "classkit").toLowerCase();
  let type = "classkit";
  if (svc === "shulekit") type = "shulekit";
  else if (svc === "shoes_voucher") type = "shoes_voucher";
  else if (svc === "uniform_voucher") type = "uniform_voucher";

  let resumePath = null;
  if (row.resume_url) {
    try {
      const u = new URL(row.resume_url, "http://local");
      resumePath = `${u.pathname}${u.search}`;
    } catch {
      resumePath = String(row.resume_url).startsWith("/") ? row.resume_url : null;
    }
  }

  return {
    id: `ord-${row.resume_token}`,
    resumeToken: row.resume_token,
    type,
    service_type: svc,
    status: row.status || "incomplete",
    childName: row.child_name || "",
    kitTitle: row.kit_title || serviceLabel(svc, null),
    totalRwf: row.total_rwf ?? 0,
    delivery: row.delivery || "school",
    payment: row.payment_method || "momo",
    resumePayload: row.snapshot || null,
    resumeUrl: row.resume_url || "",
    shareUrl: row.share_url || row.resume_url || "",
    resumePath,
    createdAt: row.created_at,
    updatedAt: row.last_activity_at || row.created_at,
    fromServer: true,
  };
}
