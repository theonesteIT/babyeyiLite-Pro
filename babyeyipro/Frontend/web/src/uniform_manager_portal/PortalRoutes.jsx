import './uniform-portal.css'
import '../storekeeper_portal/frontend/src/index.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import UniformInventoryPage, { SettingsPage } from './pages/UniformInventoryPage'
import GeneralStockReport from './pages/GeneralStockReport'
import ReportsHub from './pages/reports/ReportsHub'
import UniformReportPage from './pages/reports/UniformReportPage'
import { PORTAL } from './config/portal'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 uniform-portal-root">
      <div className="w-12 h-12 rounded-2xl animate-pulse bg-[#FEBF10]" />
      <p className="text-gray-500 text-sm font-bold uppercase tracking-widest animate-pulse">
        {PORTAL.loadingMessage}
      </p>
    </div>
  )
}

function ProtectedShell({ children }) {
  const { staff, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!staff) return <LoadingScreen />
  return <div className="uniform-portal-root h-full min-h-screen">{children}</div>
}

function UniformManagerRoutesInner() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedShell>
            <Layout />
          </ProtectedShell>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<UniformInventoryPage />} />
        <Route path="reports" element={<ReportsHub />} />
        <Route path="reports/general-stock" element={<GeneralStockReport />} />
        <Route path="reports/:reportSlug" element={<UniformReportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  )
}

export default function UniformManagerPortalRoutes() {
  return (
    <AuthProvider>
      <UniformManagerRoutesInner />
    </AuthProvider>
  )
}
