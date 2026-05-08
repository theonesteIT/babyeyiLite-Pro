// ================================================================
// Build resume + share URLs for parent kit orders (used by Orders UI)
// ================================================================

import { encodeKitResumePayload, buildClasskitResumeShareUrl, minimalResumePayload } from "./kitOrderResume";

export function kitOrderResumeShareUrl(origin, pathname, resumePayload) {
  const enc = encodeKitResumePayload(minimalResumePayload(resumePayload));
  return buildClasskitResumeShareUrl(origin, pathname, enc);
}

export function whatsappShareHref(text, url) {
  const combined = `${text}\n${url}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(combined)}`;
}
