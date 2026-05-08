// ================================================================
// parentOrderHistory — local demo orders (Classkit, etc.)
// ================================================================

const KEY = "babyeyi_parent_orders_v1";

export function getParentOrders() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveParentOrders(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function bumpOrdersListeners() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("babyeyi-orders-updated"));
  }
}

export function addParentOrder(order) {
  const row = {
    id: order.id || `ord-${Date.now()}`,
    type: order.type || "classkit",
    status: order.status || "pending",
    childName: order.childName || "",
    kitTitle: order.kitTitle || "",
    totalRwf: order.totalRwf ?? 0,
    delivery: order.delivery || "school",
    payment: order.payment || "momo",
    createdAt: order.createdAt || new Date().toISOString(),
  };
  const next = [row, ...getParentOrders()];
  saveParentOrders(next);
  bumpOrdersListeners();
  return row;
}

/**
 * Create or update an order keyed by resumeToken / id — used for ClassKit / ShuleKit drafts.
 * @param {object} order — resumeToken?, resumePayload?, status: incomplete | pending_payment | pending | confirmed, …
 */
export function upsertParentKitOrder(order) {
  const list = [...getParentOrders()];
  const id = order.id;
  const token = order.resumeToken;
  const idx = list.findIndex(
    (o) =>
      (id != null && String(o.id) === String(id)) ||
      (token != null && o.resumeToken != null && String(o.resumeToken) === String(token)),
  );
  const now = new Date().toISOString();
  const prev = idx >= 0 ? list[idx] : null;
  const row = {
    id: order.id || prev?.id || `ord-${order.resumeToken || Date.now()}`,
    resumeToken: order.resumeToken || prev?.resumeToken || null,
    type: order.type || prev?.type || "classkit",
    status: order.status || prev?.status || "incomplete",
    childName: order.childName ?? prev?.childName ?? "",
    kitTitle: order.kitTitle ?? prev?.kitTitle ?? "",
    totalRwf: order.totalRwf ?? prev?.totalRwf ?? 0,
    delivery: order.delivery ?? prev?.delivery ?? "school",
    payment: order.payment ?? prev?.payment ?? "momo",
    resumePayload: order.resumePayload ?? prev?.resumePayload ?? null,
    createdAt: prev?.createdAt || order.createdAt || now,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = row;
  else list.unshift(row);
  saveParentOrders(list);
  bumpOrdersListeners();
  return row;
}

export function deleteParentOrder(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return false;
  const list = getParentOrders();
  const next = list.filter((o) => String(o?.id || "") !== id);
  if (next.length === list.length) return false;
  saveParentOrders(next);
  bumpOrdersListeners();
  return true;
}
