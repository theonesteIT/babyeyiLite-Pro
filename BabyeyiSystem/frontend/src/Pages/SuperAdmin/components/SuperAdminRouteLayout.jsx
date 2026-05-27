/**
 * Wraps standalone /superadmin/* routes with shared sidebar + header
 */
import { Outlet } from 'react-router-dom';
import SuperAdminShell from './SuperAdminShell';

export default function SuperAdminRouteLayout() {
  return (
    <SuperAdminShell>
      <Outlet />
    </SuperAdminShell>
  );
}
