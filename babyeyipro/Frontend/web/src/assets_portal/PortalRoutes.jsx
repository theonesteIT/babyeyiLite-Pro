import './assets-portal.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from '../Assets System/src/components/Layout'
import Dashboard from '../Assets System/src/pages/Dashboard'
import AssetInventory from '../Assets System/src/pages/AssetInventory'
import AddAsset from '../Assets System/src/pages/AddAsset'
import AssetDetails from '../Assets System/src/pages/AssetDetails'
import Categories from '../Assets System/src/pages/Categories'
import Assignments from '../Assets System/src/pages/Assignments'
import Returns from '../Assets System/src/pages/Returns'
import Transfers from '../Assets System/src/pages/Transfers'
import Maintenance from '../Assets System/src/pages/Maintenance'
import PreventiveMaintenance from '../Assets System/src/pages/PreventiveMaintenance'
import Warranty from '../Assets System/src/pages/Warranty'
import Depreciation from '../Assets System/src/pages/Depreciation'
import Audit from '../Assets System/src/pages/Audit'
import LostDamaged from '../Assets System/src/pages/LostDamaged'
import Disposal from '../Assets System/src/pages/Disposal'
import QRBarcode from '../Assets System/src/pages/QRBarcode'
import Reports from '../Assets System/src/pages/Reports'
import AssetAnalytics from '../Assets System/src/pages/AssetAnalytics'
import NotificationsPage from '../Assets System/src/pages/Notifications'
import UsersPage from '../Assets System/src/pages/Users'
import SettingsPage from '../Assets System/src/pages/Settings'
import { PORTAL } from './config/portal'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 assets-portal-root">
      <div className="w-12 h-12 rounded-2xl animate-pulse bg-amber-500" />
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
  return <div className="assets-portal-root h-full min-h-screen">{children}</div>
}

function AssetsRoutesInner() {
  return (
    <Routes>
      <Route
        path=""
        element={
          <ProtectedShell>
            <Layout />
          </ProtectedShell>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<AssetInventory />} />
        <Route path="add-asset" element={<AddAsset />} />
        <Route path="asset-details/:id" element={<AssetDetails />} />
        <Route path="categories" element={<Categories />} />
        <Route path="analytics" element={<AssetAnalytics />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="returns" element={<Returns />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="preventive" element={<PreventiveMaintenance />} />
        <Route path="warranty" element={<Warranty />} />
        <Route path="depreciation" element={<Depreciation />} />
        <Route path="audit" element={<Audit />} />
        <Route path="lost-damaged" element={<LostDamaged />} />
        <Route path="disposal" element={<Disposal />} />
        <Route path="qr-barcode" element={<QRBarcode />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={`${PORTAL.basePath}/`} replace />} />
    </Routes>
  )
}

export default function AssetsPortalRoutes() {
  return (
    <AuthProvider>
      <AssetsRoutesInner />
    </AuthProvider>
  )
}
