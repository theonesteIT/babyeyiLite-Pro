/**
 * Pro-portal session bridge — maps BabyeyiSystem AuthContext to the shape expected by lite DOS portals.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getPostLogoutLoginPath } from '../utils/postLogoutLoginPath';

const MasterAuthContext = createContext(null);

export function MasterAuthProvider({ children }) {
  const auth = useAuth();
  const user = auth.user && auth.user !== false ? auth.user : null;
  const roleCode = user ? String(user.role?.code || user.role_code || '').toUpperCase() : '';

  const logout = async () => {
    await auth.logout();
    window.location.assign(getPostLogoutLoginPath());
  };

  const value = useMemo(
    () => ({
      user,
      loading: auth.loading,
      roleCode,
      proAccessEffective: auth.proAccessEffective === true,
      logout,
      patchUser: () => {},
      refresh: auth.refresh,
    }),
    [user, auth.loading, roleCode, auth.proAccessEffective, auth.logout, auth.refresh],
  );

  return <MasterAuthContext.Provider value={value}>{children}</MasterAuthContext.Provider>;
}

export function useMasterAuth() {
  const ctx = useContext(MasterAuthContext);
  if (!ctx) throw new Error('useMasterAuth must be used inside <MasterAuthProvider>');
  return ctx;
}
