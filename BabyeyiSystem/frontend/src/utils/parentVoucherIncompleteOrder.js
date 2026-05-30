// ================================================================
// Shoes / Uniform voucher — incomplete order sync (parent portal + mobile)
// ================================================================

import { upsertParentKitOrder } from "./parentOrderHistory";
import { syncIncompleteOrderToServer } from "./parentIncompleteOrderApi";

const TOKEN_KEYS = {
  shoes_voucher: "babyeyi_parent_shoes_resume_token_v1",
  uniform_voucher: "babyeyi_parent_uniform_resume_token_v1",
};

export function isParentAuthenticated(auth) {
  if (!auth?.user) return false;
  const role = String(auth.user?.role?.code || auth.user?.roleCode || "").toUpperCase();
  return role === "PARENT" && !!String(auth.user?.parent_phone || "").trim();
}

export function getOrCreateVoucherResumeToken(serviceType) {
  const key = TOKEN_KEYS[serviceType] || `babyeyi_parent_${serviceType}_token_v1`;
  try {
    let t = sessionStorage.getItem(key);
    if (!t) {
      const rnd =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
          : String(Date.now());
      t = `${serviceType === "uniform_voucher" ? "uv" : "sv"}-${rnd}`;
      sessionStorage.setItem(key, t);
    }
    return t;
  } catch {
    return `${serviceType}-${Date.now()}`;
  }
}

export function setVoucherResumeToken(serviceType, token) {
  const key = TOKEN_KEYS[serviceType];
  if (!key || !token) return;
  try {
    sessionStorage.setItem(key, String(token));
  } catch {
    /* ignore */
  }
}

export function buildShoesVoucherUrls(resumeStep = 6) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qs = new URLSearchParams();
  if (resumeStep != null) qs.set("resumeStep", String(resumeStep));
  const path = `/services/shoes-voucher${qs.toString() ? `?${qs.toString()}` : ""}`;
  const full = `${origin}${path}`;
  return { resumeUrl: full, shareUrl: full, resumePath: path };
}

export function buildUniformVoucherUrls(resumeStep = 6) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qs = new URLSearchParams();
  qs.set("resumeStep", String(resumeStep ?? 6));
  const path = `/services/uniform-voucher/request?${qs.toString()}`;
  const full = `${origin}${path}`;
  return { resumeUrl: full, shareUrl: full, resumePath: path };
}

function serviceDisplayTitle(serviceType, kitTitle) {
  if (kitTitle) return kitTitle;
  if (serviceType === "shoes_voucher") return "Shoes voucher";
  if (serviceType === "uniform_voucher") return "Uniform voucher";
  return "Order";
}

/**
 * Persist incomplete shoes/uniform order for logged-in parents (server + local history).
 */
export async function persistParentVoucherIncompleteOrder({
  auth,
  serviceType,
  status,
  resumeToken,
  resumeUrl,
  shareUrl,
  kitTitle,
  childName,
  studentId,
  totalRwf,
  delivery,
  paymentMethod,
  snapshot,
  upsertNotification,
}) {
  if (!isParentAuthenticated(auth)) return;
  const token = String(resumeToken || "").trim();
  if (!token) return;

  const title = serviceDisplayTitle(serviceType, kitTitle);
  const amount =
    Number(totalRwf) > 0 ? ` (${Number(totalRwf).toLocaleString()} RWF)` : "";
  const isPay = status === "pending_payment";

  upsertParentKitOrder({
    id: `ord-${token}`,
    resumeToken: token,
    type: serviceType,
    status: status || "incomplete",
    childName: childName || "",
    kitTitle: title,
    totalRwf: totalRwf ?? 0,
    delivery: delivery || "school",
    payment: paymentMethod || "momo",
    resumePayload: snapshot,
  });

  await syncIncompleteOrderToServer({
    student_id: studentId,
    service_type: serviceType,
    status,
    resume_token: token,
    resume_url: resumeUrl,
    share_url: shareUrl,
    kit_title: title,
    child_name: childName,
    total_rwf: totalRwf,
    delivery,
    payment_method: paymentMethod,
    snapshot,
  });

  if (typeof upsertNotification === "function") {
    upsertNotification({
      id: `incomplete-${serviceType}-${token}`,
      kind: "incomplete_kit_order",
      title: isPay ? `${title} — payment not completed` : `Incomplete ${title} order`,
      body: isPay
        ? `Continue to pay${amount}. Anyone with your link can open checkout — keep it private if you prefer.`
        : "You have not finished yet. Continue here, copy the link for later, or share on WhatsApp.",
      resumeUrl,
      shareUrl: shareUrl || resumeUrl,
      createdAt: new Date().toISOString(),
      read: false,
    });
  }
}

/** Resume link targets for Orders.jsx */
export function orderResumePaths(order, origin = "") {
  const type = String(order.type || order.service_type || "").toLowerCase();
  const resumeUrl = String(order.resumeUrl || "").trim();
  const shareUrl = String(order.shareUrl || resumeUrl).trim();

  if (type === "shoes_voucher") {
    const path = order.resumePath || "/services/shoes-voucher?resumeStep=6";
    const portable = shareUrl || (origin ? `${origin}${path}` : path);
    return { continuePath: path, portable };
  }
  if (type === "uniform_voucher") {
    const path = order.resumePath || "/services/uniform-voucher/request?resumeStep=6";
    const portable = shareUrl || (origin ? `${origin}${path}` : path);
    return { continuePath: path, portable };
  }

  const isShule = type === "shulekit" || order.resumePayload?.kitLabel === "shulekit";
  const qs = new URLSearchParams();
  if (order.resumeToken) qs.set("resume", order.resumeToken);
  if (isShule) qs.set("kit", "shule");
  const continuePath = `/parents/classkit${qs.toString() ? `?${qs.toString()}` : ""}`;
  const pathForShare = `/parents/classkit${isShule ? "?kit=shule" : ""}`;
  return {
    continuePath,
    portable: shareUrl || (origin ? `${origin}${continuePath}` : continuePath),
    pathForShare,
    isClasskit: true,
  };
}
