// ================================================================
// ParentPortalGate — PARENT auth for /parents/* except ClassKit share
//
// Share links use /parents/classkit?cks=… (opaque token). Recipients are
// often not logged in as PARENT (or not logged in at all). We allow that
// route without PARENT session when cks is present or after OTP unlock
// (sessionStorage by_ck_guest_share), so ProtectedRoute does not send them
// to /parents/login or /unauthorized.
// ================================================================

import { useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { ParentShellProvider } from "../context/ParentShellContext";
import ParentDashboardLayout from "../Pages/Parents/ParentDashboardLayout";

const GUEST_SESSION_KEY = "by_ck_guest_share";

/** Used by the gate; same rules as client-side guest ClassKit access. */
export function allowsClasskitShareGuestAccess(location) {
  if (location.pathname !== "/parents/classkit") return false;
  const qs = new URLSearchParams(location.search || "");
  if (String(qs.get("cks") || "").trim()) return true;
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(GUEST_SESSION_KEY) === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export default function ParentPortalGate() {
  const location = useLocation();
  const classkitGuest = allowsClasskitShareGuestAccess(location);

  const tree = (
    <ParentShellProvider>
      <ParentDashboardLayout />
    </ParentShellProvider>
  );

  if (classkitGuest) return tree;

  return (
    <ProtectedRoute role="PARENT" redirectTo="/parents/login">
      {tree}
    </ProtectedRoute>
  );
}
