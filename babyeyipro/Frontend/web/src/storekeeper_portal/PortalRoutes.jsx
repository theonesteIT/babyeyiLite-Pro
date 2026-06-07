import './frontend/src/index.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './frontend/src/context/AuthContext'
import Layout from './frontend/src/components/Layout'
import StockDashboard from './frontend/src/pages/StockDashboard'
import UniformInventory from './frontend/src/pages/UniformInventory'
import FoodInventory from './frontend/src/pages/FoodInventory'
import FoodReportPage from './frontend/src/pages/FoodReport'
import OtherInventory from './frontend/src/pages/OtherInventory'
import Suppliers from './frontend/src/pages/Suppliers'
import { StorekeeperRequestOrder } from '../shared/procurement/portalWrappers'
import StockAdjustments from './frontend/src/pages/StockAdjustments'
import Reports from './frontend/src/pages/Reports'
import Settings from './frontend/src/pages/Settings'
import Analytics from './frontend/src/pages/Analytics'
import StudentRequirements from './frontend/src/pages/StudentRequirements'
import Alerts from './frontend/src/pages/Alerts'
import { PORTAL } from './frontend/src/config/portal'

function LoadingScreen() {
  return (
    <div
      className="min-h-screen bg-re-bg flex flex-col items-center justify-center gap-4"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="w-12 h-12 rounded-2xl animate-pulse bg-[#FEBF10]" />
      <p className="text-gray-500 text-sm font-bold uppercase tracking-widest animate-pulse">
        {PORTAL.loadingMessage}
      </p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { staff, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!staff) return <LoadingScreen />
  return <Layout basePath={PORTAL.basePath}>{children}</Layout>
}

function StorekeeperRoutesInner() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute><StockDashboard /></ProtectedRoute>} />
      <Route path="analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
      <Route path="purchase-requests" element={<ProtectedRoute><StorekeeperRequestOrder /></ProtectedRoute>} />
      <Route path="purchase-orders" element={<Navigate to="purchase-requests" replace />} />
      <Route path="uniform-inventory" element={<ProtectedRoute><UniformInventory /></ProtectedRoute>} />
      <Route path="student-requirements" element={<ProtectedRoute><StudentRequirements /></ProtectedRoute>} />
      <Route path="food-inventory" element={<ProtectedRoute><FoodInventory /></ProtectedRoute>} />
      <Route path="food-reports" element={<ProtectedRoute><FoodReportPage /></ProtectedRoute>} />
      <Route path="other-inventory" element={<ProtectedRoute><OtherInventory /></ProtectedRoute>} />
      <Route path="stock-adjustments" element={<ProtectedRoute><StockAdjustments /></ProtectedRoute>} />
      <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={PORTAL.basePath} replace />} />
    </Routes>
  )
}

export default function StorekeeperPortalRoutes() {
  return (
    <AuthProvider>
      <StorekeeperRoutesInner />
    </AuthProvider>
  )
}
