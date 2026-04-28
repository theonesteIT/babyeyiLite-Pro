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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("babyeyi-orders-updated"));
  }
  return row;
}
