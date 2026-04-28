// ================================================================
// Legacy URL — Full System Controller home is /superadmin/control
// ================================================================

import { Navigate } from 'react-router-dom';

export default function FullSystemControllerDashboard() {
  return <Navigate to="/superadmin/control" replace />;
}
