// ================================================================
// src/components/ProtectedRoute.jsx
//
// Wraps any page that requires authentication.
// Reads user from AuthContext (server session) — zero localStorage.
//
// Usage in App.jsx / router:
//   <Route path="/superadmin/dashboard"
//     element={<ProtectedRoute role="SUPER_ADMIN"><SuperAdminDashboard/></ProtectedRoute>}/>
// ================================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPostLogoutLoginPath } from '../utils/postLogoutLoginPath';
import BabyeyiPortalLoader from './BabyeyiPortalLoader';

export default function ProtectedRoute({
  children,
  role = null,
  redirectTo = '/login',
  /** Optional extra check (e.g. DOD stored as HOD role_code but role_name is Head of Discipline). */
  allowIf = null,
}) {
  const { loading, isLoggedIn, role: userRoleRaw, user } = useAuth();
  const location = useLocation();

  const signInPath = redirectTo === '/login' ? getPostLogoutLoginPath() : redirectTo;

  // Normalise role values so comparisons are case-insensitive and
  // can accept either a single role string or an array of roles.
  const normalizedUserRole = userRoleRaw ? String(userRoleRaw).toUpperCase() : null;
  const allowedRoles = Array.isArray(role)
    ? role.map(r => String(r).toUpperCase())
    : role
      ? [String(role).toUpperCase()]
      : null;

  const sessionUser = user && user !== false ? user : null;
  const roleAllowed =
    !allowedRoles ||
    (normalizedUserRole && allowedRoles.includes(normalizedUserRole));
  const extraAllowed = typeof allowIf === 'function' && allowIf(sessionUser);

  // Still fetching session from server
  if (loading) return <BabyeyiPortalLoader message="Loading" />;

  // Not logged in → sign-in page (default /login), preserving intended destination
  if (!isLoggedIn) {
    return <Navigate to={signInPath} state={{ from: location }} replace />;
  }

  // Wrong role → to unauthorized page
  if (allowedRoles && !roleAllowed && !extraAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
