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

const Spinner = () => (
  <div style={{
    minHeight:'100vh', display:'flex', alignItems:'center',
    justifyContent:'center', background:'#0B1D3A',
  }}>
    <div style={{textAlign:'center'}}>
      <div style={{
        width:48, height:48, border:'3px solid rgba(59,130,246,.2)',
        borderTopColor:'#3b82f6', borderRadius:'50%',
        animation:'spin .8s linear infinite', margin:'0 auto 16px',
      }}/>
      <p style={{color:'rgba(148,163,184,.6)', fontFamily:'sans-serif', fontSize:14}}>
        Checking session…
      </p>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export default function ProtectedRoute({ children, role = null, redirectTo = '/login' }) {
  const { loading, isLoggedIn, role: userRoleRaw } = useAuth();
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

  // Still fetching session from server
  if (loading) return <Spinner />;

  // Not logged in → sign-in page (default /login), preserving intended destination
  if (!isLoggedIn) {
    return <Navigate to={signInPath} state={{ from: location }} replace />;
  }

  // Wrong role → to unauthorized page
  if (allowedRoles && (!normalizedUserRole || !allowedRoles.includes(normalizedUserRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}